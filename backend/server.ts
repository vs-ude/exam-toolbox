// @ts-ignore
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
// @ts-ignore
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
import { Exam, Task, Translation } from "./exam.ts";
import { FileTracker } from "./fileTracker.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.33.0/deps.ts";
import { ZipWriter } from "https://deno.land/x/zipjs/index.js";
import { walk } from "https://deno.land/std/fs/walk.ts";
// @ts-ignore
import { read, utils } from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";
import * as fs from "https://deno.land/std/fs/mod.ts";
import { Resend } from "npm:resend@2.0.0";
import { copy } from "https://deno.land/std@0.224.0/fs/copy.ts";
import { updateMetaStudent, generateExam } from "./helpers.ts";
import { generateTasksLatex } from "./generateTasksLatex.ts";
import { Tag } from "./tag.ts";



// output from a successful student PDF generation
interface StudentResult {
  seatNumber: number
  pdfPathDE: string
  pdfPathEN: string
}

// how a mass-exam-generation-job is defined
interface ExamGenerationJob {
  jobId: string
  examId: string
  userEmail: string
  status: 'queued' | 'processing' | 'finalizing' | 'completed' | 'failed'
  progress: {
    total: number
    completed: number
    failed: number
  }
  jobDir: string
  zipPath?: string
  createdAt: Date
  studentData: any[]
  randomNumbers: { de: string; en: string }[]
  studentResults: StudentResult[]
}

const basePath = "/app/ExamTemplate"
const JOBS_DIR = "/app/jobs"

// for scheduled removing of old jobs from joblist
const now = new Date()
const nextRun = new Date()
const JOB_EXPIRATION_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
// const JOB_EXPIRATION_AGE_MS = 30 * 1000 // 30 seconds for testing

// a union type for all possible tasks that a worker can handle
type GenerationTask = { type: 'student', [key: string]: any } | { type: 'solution', [key: string]: any } | { type: 'log', [key: string]: any }

let jobs = new Map<string, ExamGenerationJob>() // in-memory database for tracking active and recent jobs
let taskQueue: GenerationTask[] = [] // FIFO queue for all pending tasks

const logicalCores = navigator.hardwareConcurrency // fetches number of cpu cores on host system
const POOL_SIZE = Math.max(1, logicalCores - 1) // worker pool size is cpu cores -1 or at least 1
const workers: { worker: Worker; isBusy: boolean }[] = []


// creates the worker pool at startup and defines how to handle messages from them
for (let i = 0; i < POOL_SIZE; i++) {
  const worker = new Worker(new URL("./worker.ts", import.meta.url).href, { type: "module" })

  // handles messages coming back from a worker
  worker.onmessage = async (e) => {
    const result = e.data
    const workerWrapper = workers.find(w => w.worker === worker)
    if (workerWrapper) workerWrapper.isBusy = false

    if (!result.jobId) {
      console.error("Worker message received without a jobId.")
      processQueue()
      return
    }
    const associatedJob = jobs.get(result.jobId)

    // ignores messages for jobs that are already finished or failed
    if (!associatedJob || associatedJob.status !== 'processing') {
      console.log(`Ignoring stale result from worker for job ${result.jobId} (status: ${associatedJob?.status})`)
      processQueue()
      return
    }

    // on success, updates progress and stores the results
    if (result.status === 'success') {
      associatedJob.progress.completed++
      if (result.type === 'student') {
        associatedJob.studentResults.push({
          seatNumber: result.seatNumber,
          pdfPathDE: result.pdfPathDE,
          pdfPathEN: result.pdfPathEN,
        })
      }
      // on failure, logs detailed error info and marks the entire job as failed
    } else {
      associatedJob.progress.failed++
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
      console.error(`A worker task for job ${associatedJob.jobId} has FAILED.`)
      console.error(`Task Type: ${result.type}`)
      console.error(`Error Details: ${result.error}`)
      console.error("The entire job will now be marked as failed.")
      console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

      associatedJob.status = 'failed'
    }

    console.log(`Job ${associatedJob.jobId} progress: ${associatedJob.progress.completed}/${associatedJob.progress.total}`)

    // checks if all tasks for a job are complete and, if so, starts the finalization process
    if ((associatedJob.progress.completed + associatedJob.progress.failed >= associatedJob.progress.total) && associatedJob.status === 'processing') {
      await finalizeJob(associatedJob.jobId)
    }

    processQueue()
  }

  // handles critical worker errors, like if a worker crashes completely
  worker.onerror = (err) => {
    console.error("A critical error occurred in a worker, it may have crashed:", err.message)
    const workerWrapper = workers.find(w => w.worker === worker)
    if (workerWrapper) workerWrapper.isBusy = false
    processQueue()
  }
  workers.push({ worker, isBusy: false })
}
console.log(`Worker pool initialized with ${POOL_SIZE} workers.`)
await Deno.mkdir(JOBS_DIR, { recursive: true })

let isGenerating = false

// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");
const pool = db.collection("taskPool");
const fileTracker = db.collection("fileTracker");
const tags = db.collection("tags");

// Create Oak Application and Router
const app = new Application();
const router = new Router();


app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*")
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Auth-Uid, X-Auth-Email, X-Auth-Member-Of")
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204
    return
  }
  const userId = ctx.request.headers.get("X-Token-Subject")
  const userEmail = ctx.request.headers.get("X-Token-User-Email")
  const userRolesHeader = ctx.request.headers.get("X-Token-User-Roles")
  const userRoles = userRolesHeader ? userRolesHeader.split(' ').map(role => role.trim()).filter(role => role !== '') : []
  ctx.state.user = { id: userId, email: userEmail, roles: userRoles }
  console.log("Authenticated User: ")
  console.log(userId)
  if (userId) {
    console.log(`Authenticated User: ID=${userId}, Email=${userEmail}, Roles=[${userRoles.join(', ')}]`)
  }
  await next()
})

router
  .get("/", (ctx) => {
    ctx.response.body = "API is running..."
  })
  .get("/api/user", (ctx) => {
    const user = ctx.state.user
    if (!user || !user.id) {
      ctx.response.status = 401
      ctx.response.body = { message: "Not authenticated" }
      return
    }
    ctx.response.status = 200
    ctx.response.body = { id: user.id, email: user.email, roles: user.roles }
  })
  .get("/api/exams", async (ctx) => {
    try {
      const examList = await exams.find().toArray()
      ctx.response.status = 200
      ctx.response.body = examList
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching exams', error }
    }
  })
  .get("/api/exam/:id", async (ctx) => {
    try {
      const examId = ctx.params.id
      const mongoId = new ObjectId(examId)
      const exam = await exams.findOne({ _id: mongoId })
      if (!exam) {
        ctx.response.status = 404
        ctx.response.body = { message: "Exam not found" }
        return
      }
      ctx.response.status = 200
      ctx.response.body = exam
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: "Error fetching exam", error }
    }
  })
  .post("/api/exams", async (ctx) => {
    const exam: Exam = await ctx.request.body().value
    try {
      const result = await exams.insertOne(exam)
      ctx.response.status = 200
      ctx.response.body = {
        message: 'Exam saved successfully! ',
        insertedId: result
      }
    } catch (err) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error saving exam', error: err }
    }
  })
  .put("/api/exams/update", async (ctx) => {
    try {
      const { examId, updatedExam } = await ctx.request.body().value
      if (!examId || !updatedExam) {
        ctx.response.status = 400
        ctx.response.body = { message: "Exam ID and updated data are required" }
        return
      }
      const mongoId = new ObjectId(examId)
      const updateData = { ...updatedExam }
      delete updateData._id
      const result = await exams.updateOne({ _id: mongoId }, { $set: updateData })
      if (result.matchedCount === 0) {
        ctx.response.status = 404
        ctx.response.body = { message: "Exam not found" }
        return
      }
      ctx.response.status = 200
      ctx.response.body = { message: "Exam updated successfully" }
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: "Error updating exam", error }
    }
  })
  .post("/api/generate-exam", async (ctx) => {
    if (isGenerating) {
      ctx.response.status = 429
      ctx.response.body = { message: "Another exam generation is already in progress. Please wait." }
      return
    }
    isGenerating = true
    try {
      const exam: Exam = await ctx.request.body().value
      const tempDir = await Deno.makeTempDir({ prefix: "exam_gen_single_" })
      await copy(basePath, tempDir, { overwrite: true })
      const tasksPath = `${tempDir}/aufgaben.tex`
      await updateMetaTemplate(exam, tempDir)
      await updateMetaStudent({ vollername: 'Max Musterloesung', matrikelnummer: 0, zeigeloesung: 'yes', sprache: 'de' }, tempDir)
      const tasksContentLatex = await generateTasksLatex(exam, tempDir)
      await Deno.writeTextFile(tasksPath, tasksContentLatex)
      const { pdfBytes: examPDF, logContent } = await generateExam(tempDir)
      ctx.response.headers.set("Content-Type", "application/pdf")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${exam.courseName}.pdf"`)
      ctx.response.body = examPDF
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error generating Exam PDF', error }
    } finally {
      isGenerating = false
    }
  })
  .post("/api/upload", async (ctx) => {
    const body = ctx.request.body({ type: "form-data" })
    const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 })

    if (!formData.files || formData.files.length === 0) {
      ctx.response.status = 400
      ctx.response.body = { message: "No file uploaded" }
      return
    }
    const file = formData.files[0]
    if (!file.content) {
      ctx.response.status = 400
      ctx.response.body = { message: "No file content" }
      return
    }
    const fileHashBuffer = await crypto.subtle.digest("SHA-256", file.content)
    const fileHash = encodeHex(fileHashBuffer)
    const ext = file.originalName?.split(".").pop()
    const hashedFileName = ext ? `${fileHash}.${ext}` : fileHash
    file.originalName = hashedFileName
    const uploadDir = "./uploads"
    const filePath = `${uploadDir}/${file.originalName}`
    if (file.content) {
      await Deno.mkdir(uploadDir, { recursive: true })
      await Deno.writeFile(filePath, file.content)
      console.log("File saved to:", filePath)
    }
    const fileTrackerEntry: FileTracker = { name: file.originalName, refs: [], timeToLive: 7 }
    try {
      await fileTracker.insertOne(fileTrackerEntry)
      console.log("File tracker entry created:", fileTrackerEntry)
    } catch (error) {
      console.error("Error inserting file tracker entry:", error)
      ctx.response.status = 500
      ctx.response.body = { message: "Error inserting file tracker entry", error }
      return
    }
    ctx.response.body = { message: "File uploaded successfully", url: `./uploads/${file.originalName}` }
    ctx.response.status = 200
  })
  .get("/api/download", async (ctx) => {
    const fileUrl = ctx.request.url.searchParams.get("fileUrl")
    if (!fileUrl) {
      ctx.response.status = 400
      ctx.response.body = { message: "File URL is required" }
      return
    }
    try {
      const fileContent = await Deno.readFile(fileUrl)
      const fileName = fileUrl.split("/").pop() || "downloaded_file"
      const fileExtension = fileName.split('.').pop()?.toLowerCase()
      let contentType = "application/octet-stream"
      switch (fileExtension) {
        case "pdf": contentType = "application/pdf"; break
        case "jpg": case "jpeg": contentType = "image/jpeg"; break
        case "png": contentType = "image/png"; break
        default: contentType = "application/octet-stream"
      }
      ctx.response.headers.set("Content-Type", contentType)
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`)
      ctx.response.body = fileContent
      console.log("sending file: ", fileUrl)
    } catch (error) {
      console.error("Error reading file:", error)
      ctx.response.status = 500
      ctx.response.body = { message: "Error reading file", error: error.message }
    }
  })
  // generate mass-exam by putting jobs in a queue that can be processed by workers paralelized
  .post("/api/generate-exams", async (ctx) => {
    try {
      const body = ctx.request.body({ type: "form-data" })
      const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 })
      const examJson: Exam = JSON.parse(formData.fields.exam)
      const file = formData.files?.find(f => f.name === "list")
      if (!file || !examJson || !file.content) {
        ctx.response.status = 400
        ctx.response.body = { message: "Missing file, file content, or exam data" }
        return
      }

      const examId = examJson._id
      const jobId = crypto.randomUUID()
      const jobDir = `${JOBS_DIR}/${jobId}`
      const jobTemplatePath = `${jobDir}/template`
      const tempOutputDir = `${jobDir}/temp_output`
      const studentPdfDir = `${tempOutputDir}/student_pdfs`
      await Deno.mkdir(studentPdfDir, { recursive: true })

      await copy(basePath, jobTemplatePath, { overwrite: true })
      await updateMetaTemplate(examJson, jobTemplatePath)
      const tasksContentLatex = await generateTasksLatex(examJson, jobTemplatePath)
      await Deno.writeTextFile(`${jobTemplatePath}/aufgaben.tex`, tasksContentLatex)

      const workbook = read(file.content, { type: "buffer" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const studentData = utils.sheet_to_json(worksheet, {
        header: ["examPlanId", "examNumber", "examTitle", "lastName", "firstName", "studentId"],
        range: 5,
      }).filter((student: any) => student.firstName && student.lastName)

      const totalTasks = studentData.length + 3

      const newJob: ExamGenerationJob = {
        jobId,
        examId,
        userEmail: ctx.state.user.email,
        status: 'processing',
        progress: { total: totalTasks, completed: 0, failed: 0 },
        jobDir,
        createdAt: new Date(),
        studentData,
        randomNumbers: [],
        studentResults: [],
      }

      studentData.forEach((student: any, index: number) => {
        const seatNumber = index + 1
        const deRandomNumber = genRandomNumber('de', index + 1)
        const enRandomNumber = genRandomNumber('en', index + 1)
        newJob.randomNumbers.push({ de: deRandomNumber, en: enRandomNumber })
        taskQueue.push({
          type: 'student',
          jobId,
          student,
          jobTemplatePath,
          outputDir: tempOutputDir,
          deRandomNumber,
          enRandomNumber,
          seatNumber
        })
      })

      taskQueue.push({ type: 'solution', jobId, jobTemplatePath, outputDir: tempOutputDir })
      taskQueue.push({ type: 'log', jobId, jobTemplatePath, outputDir: tempOutputDir, lang: 'de' })
      taskQueue.push({ type: 'log', jobId, jobTemplatePath, outputDir: tempOutputDir, lang: 'en' })

      jobs.set(jobId, newJob)

      workers.forEach(() => processQueue())

      ctx.response.status = 202
      ctx.response.body = { jobId, message: "Exam generation job has been started." }

    } catch (error) {
      console.error('Error starting mass-exam generation job:', error)
      ctx.response.status = 500
      ctx.response.body = {
        message: 'Error starting exam generation job',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
  .delete("/api/exams", async (ctx) => {
    try {
      const result = await exams.deleteMany({})
      ctx.response.status = 200
      ctx.response.body = {
        message: `${result} exams deleted successfully!`,
        deletedCount: result,
      }
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: "Error deleting exams", error }
    }
  })
  // frontend get status about the progress of the mass-exam generation
  .get("/api/jobs/:jobId/status", (ctx) => {
    const jobId = ctx.params.jobId
    const job = jobs.get(jobId)
    if (!job) {
      ctx.response.status = 404
      ctx.response.body = { message: "Job not found" }
      return
    }
    ctx.response.status = 200
    ctx.response.body = {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.status === 'completed' ? `/api/jobs/${jobId}/download` : null,
    }
  })
  // given the jobId of the mass-exam-generation the produced zip can be downloaded
  .get("/api/jobs/:jobId/download", async (ctx) => {
    const jobId = ctx.params.jobId
    const job = jobs.get(jobId)
    if (!job) {
      ctx.response.status = 404
      ctx.response.body = { message: "Job not found" }
      return
    }
    if (job.userEmail !== ctx.state.user.email) {
      ctx.response.status = 403
      ctx.response.body = { message: "Forbidden" }
      return
    }
    if (job.status !== 'completed' || !job.zipPath) {
      ctx.response.status = 400
      ctx.response.body = { message: "Job is not yet complete or the file is missing." }
      return
    }
    try {
      const zipFileBytes = await Deno.readFile(job.zipPath)
      ctx.response.headers.set("Content-Type", "application/zip")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="exams_${jobId}.zip"`)
      ctx.response.body = zipFileBytes
    } catch (error) {
      console.error(`Error sending zip file for job ${jobId}:`, error)
      ctx.response.status = 500
      ctx.response.body = { message: "Error reading the generated file." }
    }
  })
  .delete("/api/jobs/:jobId", async (ctx) => {
    const jobId = ctx.params.jobId
    const job = jobs.get(jobId)

    if (!job) {
      ctx.response.status = 404
      ctx.response.body = { message: "Job not found" }
      return
    }

    if (job.status === 'processing' || job.status === 'queued') {
      console.log(`Cancellation requested for job: ${jobId}`)

      job.status = 'failed'

      taskQueue = taskQueue.filter(task => task.jobId !== jobId)

      await Deno.remove(job.jobDir, { recursive: true }).catch(err => {
        console.error(`Error during immediate cleanup for cancelled job ${jobId}:`, err)
      })

      ctx.response.status = 200
      ctx.response.body = { message: `Job ${jobId} has been cancelled.` }
    } else {
      ctx.response.status = 400
      ctx.response.body = { message: `Job ${jobId} cannot be cancelled as it is already ${job.status}.` }
    }
  })
  .get("/api/taskPool", async (ctx) => {
    try {
      const taskList = await pool.find().toArray()
      ctx.response.status = 200
      ctx.response.body = taskList
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching tasks', error }
    }
  })
  .get("/api/taskPool/type/:type", async (ctx) => {
    const taskType = ctx.params.type
    try {
      const taskList = await pool.find({ type: taskType }).toArray()
      ctx.response.status = 200
      ctx.response.body = taskList
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching tasks by type', error }
    }
  })
  .get("/api/taskPool/tags/:tag", async (ctx) => {
    const tag = ctx.params.tag
    try {
      const taskList = await pool.find({ tags: { $elemMatch: { name: tag } } }).toArray()
      ctx.response.status = 200
      ctx.response.body = taskList
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching tasks by tag', error }
    }
  })
  .get("/api/taskPool/user/:userId", async (ctx) => {
    const userId = ctx.params.userId
    try {
      const taskList = await pool.find({ createdBy: userId }).toArray()
      ctx.response.status = 200
      ctx.response.body = taskList
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching tasks by user', error }
    }
  })
  .post("/api/taskPool", async (ctx) => {
    const task: Task = await ctx.request.body().value
    try {
      await pool.insertOne(task)
      ctx.response.status = 200
      ctx.response.body = { message: 'Task added to pool' }
    } catch (err) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error adding to pool', error: err }
    }
    if (task.type === "pictureTask") {
      const fileURLs = [task.questionPicture.urlDE, task.questionPicture.urlEN, task.solutionPicture.urlDE, task.solutionPicture.urlEN]
      console.log("File URLs: ", fileURLs)
      for (const fileURL of fileURLs) {
        const fileName = fileURL.split("/").pop()
        try {
          await fileTracker.updateOne({ name: fileName }, { $addToSet: { refs: task.taskId } })
        } catch (error) {
          console.error("Error fetching file tracker enttry:", error)
        }
      }
    }
  })
  .delete("/api/taskPool/:taskId", async (ctx) => {
    try {
      const result = await pool.deleteOne({ taskId: ctx.params.taskId })
      if (result.deletedCount === 0) {
        ctx.response.status = 404
        ctx.response.body = { message: "Task not found" }
        return
      }
      ctx.response.status = 200
      ctx.response.body = { message: "Task deleted successfully" }
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: "Error deleting task", error }
    }
  })
  .delete("/api/taskPool", async (ctx) => {
    try {
      const result = await pool.deleteMany({})
      await fileTracker.deleteMany({})
      await fs.emptyDir("./uploads")
      ctx.response.status = 200
      ctx.response.body = {
        message: `${result} task-pool deleted successfully!`,
        deletedCount: result,
      }
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: "Error deleting task-pool", error }
    }
  })
  .put("/api/taskPool/:taskId", async (ctx) => {
    try {
      const result = await pool.updateOne(
        { taskId: ctx.params.taskId }, { $set: await ctx.request.body().value }
      )

      if (result.matchedCount === 0) {
        ctx.response.status = 404
        ctx.response.body = { message: "Task not found" }
        return
      }
      ctx.response.status = 200
      ctx.response.body = { message: `Task ${ctx.params.taskId} updated successfully` }
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: `Error updating task ${ctx.params.taskId}`, error };
    }
  })
  .get("/api/jobs/downloadable", async (ctx) => {
    try {
      const downloadableJobs = await getDownloadableJobs();
      ctx.response.status = 200;
      ctx.response.body = downloadableJobs;
    } catch (error) {
      console.error("Error fetching downloadable jobs:", error);
      ctx.response.status = 500;
      ctx.response.body = { message: "Error fetching downloadable jobs list" };
    }
  })
  .post("/api/tags", async (ctx) => {
    const tag: Tag = await ctx.request.body().value;
    try {
      const result = await tags.insertOne({tag});
      ctx.response.status = 200,
        ctx.response.body = {
          message: "Tag saved successfully!",
          insertedId: result,
        }
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error saving tag', error: error }
    }
  })
  .get("/api/tags/:id", async (ctx) => {
    const tagName = ctx.params.id
    try {
      const tag = await tags.findOne({ name: tagName })
      if (!tag) {
        ctx.response.status = 404
        ctx.response.body = { message: "Tag not found" }
        return
      }
      ctx.response.status = 200
      ctx.response.body = tag
    } catch (error) {
      ctx.response.status = 500
      ctx.response.body = { message: 'Error fetching tag', error }
    }
  })





app.use(router.routes())
app.use(router.allowedMethods())

scheduleDailyCleanup()

const port = 3000
await app.listen({ port })



// checks job queue and assigns a worker if possible
function processQueue() {
  if (taskQueue.length === 0)
    return

  const availableWorker = workers.find(w => !w.isBusy)
  if (availableWorker) {
    const task = taskQueue.shift()
    if (task) {
      availableWorker.isBusy = true
      availableWorker.worker.postMessage(task)
    }
  }
}

// after mass-exam generation merges the exams and creates CSV
async function finalizeJob(jobId: string) {
  const job = jobs.get(jobId)
  if (!job)
    return

  job.status = 'finalizing'
  console.log(`Finalizing job ${jobId}...`)

  try {
    const finalOutputDir = `${job.jobDir}/final_output`
    await Deno.mkdir(finalOutputDir, { recursive: true })

    // sort the student results by seat number (exam number) before merging
    job.studentResults.sort((a, b) => a.seatNumber - b.seatNumber)
    const sortedGermanPaths = job.studentResults.map(r => r.pdfPathDE)
    const sortedEnglishPaths = job.studentResults.map(r => r.pdfPathEN)

    // merges all individual german exam PDFs into a single file
    console.log(`Merging ${sortedGermanPaths.length} German PDFs...`)
    const mergedPdfDE = await PDFDocument.create()
    for (const pdfPath of sortedGermanPaths) {
      const pdfBytes = await Deno.readFile(pdfPath)
      const pdf = await PDFDocument.load(pdfBytes)
      const copiedPages = await mergedPdfDE.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach(page => mergedPdfDE.addPage(page))
    }
    const mergedDEBytes = await mergedPdfDE.save()
    await Deno.writeFile(`${finalOutputDir}/exam_merged_de.pdf`, mergedDEBytes)

    // merges all individual english exam PDFs into a single file
    console.log(`Merging ${sortedEnglishPaths.length} English PDFs...`)
    const mergedPdfEN = await PDFDocument.create()
    for (const pdfPath of sortedEnglishPaths) {
      const pdfBytes = await Deno.readFile(pdfPath)
      const pdf = await PDFDocument.load(pdfBytes)
      const copiedPages = await mergedPdfEN.copyPages(pdf, pdf.getPageIndices())
      copiedPages.forEach(page => mergedPdfEN.addPage(page))
    }
    const mergedENBytes = await mergedPdfEN.save()
    await Deno.writeFile(`${finalOutputDir}/exam_merged_en.pdf`, mergedENBytes)

    // creates the attendance list CSV file
    let csvContent = "Sitzplatz,Random,Matrikelnr,Name,Anwesend? (X)\n"
    job.studentData.forEach((student, index) => {
      const seatNumber = index + 1
      const randoms = job.randomNumbers[index]
      const randomCode = `${randoms.de}/${randoms.en}`
      csvContent += `${seatNumber},${randomCode},${student.studentId},"${student.firstName} ${student.lastName}",\n`
    })
    await Deno.writeTextFile(`${finalOutputDir}/anwesenheitsliste.csv`, csvContent)

    // moves the solution and log files into the final output directory
    const tempOutputDir = `${job.jobDir}/temp_output`
    await Deno.rename(`${tempOutputDir}/exam_solution_de.pdf`, `${finalOutputDir}/exam_solution_de.pdf`)
    await Deno.rename(`${tempOutputDir}/exam_de.log`, `${finalOutputDir}/exam_de.log`)
    await Deno.rename(`${tempOutputDir}/exam_en.log`, `${finalOutputDir}/exam_en.log`)

    // creates the final ZIP archive containing all generated artifacts
    const zipFilePath = `${job.jobDir}/exams_output.zip`
    await createZipArchiveFromDirectory(finalOutputDir, zipFilePath)

    job.status = 'completed'
    job.zipPath = zipFilePath
    console.log(`Job ${jobId} completed successfully. ZIP available at ${zipFilePath}`)

  } catch (error) {
    console.error(`Failed to finalize job ${jobId}:`, error)
    job.status = 'failed'
  }
}


async function createZipArchiveFromDirectory(outDir: string, zipFilePath: string): Promise<void> {
  const zipFile = await Deno.open(zipFilePath, { write: true, create: true })
  const zipWriter = new ZipWriter(zipFile)

  try {
    for await (const entry of walk(outDir)) {
      if (entry.isFile) {
        const relativePath = entry.path.substring(outDir.length + 1)
        const content = await Deno.readFile(entry.path)
        const contentStream = new ReadableStream({
          start(controller) {
            controller.enqueue(content)
            controller.close()
          }
        });
        await zipWriter.add(relativePath, contentStream)
      }
    }
    await zipWriter.close()

  } catch (zipError) {
    zipFile.close()
    throw zipError
  }
}

async function updateMetaTemplate(exam: Exam, workingDir: string) {
  const metaPath = `${workingDir}/meta-exam.tex`
  const { courseName, examinerName, semester, date, examLengthMinutes, tasks } = exam
  const metaTemplate = await Deno.readTextFile(metaPath)
  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\veranstaltung\}\{.*?\}/, `\\newcommand{\\veranstaltung}{ ${courseName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')} }`)
    .replace(/\\newcommand\{\\semester\}\{.*?\}/, `\\newcommand{\\semester}{${semester.replace(/ /g, '\\ ')}}`)
    .replace(/\\newcommand\{\\pruefer\}\{.*?\}/, `\\newcommand{\\pruefer}{${examinerName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')}}`)
    .replace(/\\newcommand\{\\datum\}\{.*?\}/, `\\newcommand{\\datum}{${date}}`)

  // these can also be updated, see meta-exam.tex
  // \newcommand{\klausurtyp}{A}
  // \newcommand{\schmierblaetteranzahl}{2} // (CB) set to 0 for no empty pages at the end. Will be filled to a even number of pages
  // \newcommand{\interactive}{N} // Y=Yes, N=No; use PDF forms and generate info for digital exams
  // \newcommand{\englishandgerman}{yes}

  // Update meta-exam.tex
  await Deno.writeTextFile(metaPath, updatedMeta)
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return;
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "ExamToolbox <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    console.log("Email sent via Resend");
  } catch (error) {
    console.error("Resend error:", error);
  }
}

// Calculate the checksum. A valid number should have a checksum of 1.
function checksum(number: string): number {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const modulus = alphabet.length
  let check = Math.floor(modulus / 2)

  for (const char of number) {
    const charIndex = alphabet.indexOf(char)
    if (charIndex === -1) continue // ignores chars not in the alphabet
    const val = check || modulus
    check = (((val * 2) % (modulus + 1)) + charIndex) % modulus
  }

  return check
}

// With the provided number, calculate the extra digit that should be appended to make it a valid number.
function calc_check_digit(number: string): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const modulus = alphabet.length
  const cs = checksum(number) || modulus
  let index = (1 - (cs * 2) % (modulus + 1))
  index = ((index % modulus) + modulus) % modulus // makes sure the index is not negative, because Typescript modulo is not really modulo (with negative numbers).

  return alphabet[index]
}

// generates a random exam number
function genRandomNumber(lang: 'de' | 'en', counter: number): string {
  const paddedCount = counter.toString().padStart(4, "0")
  const langPrefix = lang === 'de' ? '1' : '2'
  const num = parseInt(langPrefix + paddedCount, 10).toString(36).toUpperCase()
  const parity = calc_check_digit(num)
  return num + parity
}

async function getDownloadableJobs(): Promise<{ examId: string, jobId: string }[]> {
  const downloadableJobs: { examId: string, jobId: string }[] = [];
  const latestJobs = new Map<string, ExamGenerationJob>();

  // find latest completed job for for every examId
  for (const job of jobs.values()) {
    if (job.status === 'completed') {
      const existingJob = latestJobs.get(job.examId)
      if (!existingJob || job.createdAt > existingJob.createdAt) {
        latestJobs.set(job.examId, job)
      }
    }
  }

  // check if the downloadable file for each of these latest jobs actually exists
  for (const job of latestJobs.values()) {
    if (job.zipPath) {
      try {
        await Deno.stat(job.zipPath)
        // if the file exists, add it to final list
        downloadableJobs.push({ examId: job.examId, jobId: job.jobId })
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          console.log(`The latest job ${job.jobId} is completed, but its file was not found.`)
        } else {
          console.error(`Error checking file status for ${job.zipPath}:`, error)
        }
      }
    }
  }
  
  return downloadableJobs
}

function cleanupOldJobs() {
  const now = Date.now()
  let cleanedCount = 0

  console.log("--- Before Cleanup: Current Jobs in Memory ---")
  // print every joblist entry for testing
  console.log(jobs)

  for (const [jobId, job] of jobs.entries()) {
    // only check jobs that are finished
    if (job.status === 'completed' || job.status === 'failed') {
      const jobAge = now - job.createdAt.getTime()
      
      // if the job is older than our 7-day expiration age, delete it from memory
      if (jobAge > JOB_EXPIRATION_AGE_MS) {
        jobs.delete(jobId)
        cleanedCount++
      }
    }
  }
  if (cleanedCount > 0) {
    console.log(`Memory cleanup: Removed ${cleanedCount} old job(s) from the in-memory list.`)
    
    console.log("--- After Cleanup: Remaining Jobs in Memory ---")
    // this will print the list again after deletion
    console.log(jobs)
  } else {
    console.log("Memory cleanup: No old jobs to remove.")
  }
}

function scheduleDailyCleanup() {
  // set the time for the next run to 4:00 AM for low server load
  nextRun.setHours(2, 0, 0, 0) // the docker-container uses UTC time, offset accordingly

  // if it's already past 4 AM today, schedule it for 4 AM tomorrow
  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1)
  }

  const delay = nextRun.getTime() - now.getTime()
  
  console.log(`Next in-memory cleanup scheduled for ${nextRun.toLocaleString()} UTC-Time`)

  setTimeout(() => {
    console.log("Running daily in-memory job cleanup...")
    cleanupOldJobs()
    // after it runs, schedule the next one for the following day
    scheduleDailyCleanup()
  }, delay)
}