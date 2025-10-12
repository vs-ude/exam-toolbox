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
import { updateMetaStudent, generateExam, generateTasksLatex } from "./generation.ts";
import { Tag } from "./tag.ts";
import { configureRouter } from "./router.ts";



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
const router = configureRouter({ db, jobs, taskQueue, workers, basePath, JOBS_DIR, processQueue, genRandomNumber, getDownloadableJobs });


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