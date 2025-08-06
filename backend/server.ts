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


const basePath = "/app/ExamTemplate"

let isGenerating = false;

// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");
const pool = db.collection("taskPool");
const fileTracker = db.collection("fileTracker");

// Create Oak Application and Router
const app = new Application();
const router = new Router();

// For cross-origin requests (for CORS)
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Auth-Uid, X-Auth-Email, X-Auth-Member-Of");

  // for preflight request
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204; // success
    return; // stop
  }

  // get user information of logged-in user with AuthCrunch default headers
  const userId = ctx.request.headers.get("X-Token-Subject")
  const userEmail = ctx.request.headers.get("X-Token-User-Email")
  const userRolesHeader = ctx.request.headers.get("X-Token-User-Roles")

  // puts the roles in an array
  const userRoles = userRolesHeader ? userRolesHeader.split(' ').map(role => role.trim()).filter(role => role !== '') : []

  ctx.state.user = {
    id: userId,
    email: userEmail,
    roles: userRoles,
  }

  console.log("Authenticated User: ")
  console.log(userId)
  // for debugging (can be removed in production)
  if (userId) {
    console.log(`Authenticated User: ID=${userId}, Email=${userEmail}, Roles=[${userRoles.join(', ')}]`);
  }

  await next();
});


// Routes
router
  .get("/", (ctx) => {
    ctx.response.body = "API is running...";
  })
  .get("/api/user", (ctx) => {
    const user = ctx.state.user

    if (!user || !user.id) {
      ctx.response.status = 401
      ctx.response.body = { message: "Not authenticated" }
      return;
    }

    ctx.response.status = 200
    ctx.response.body = {
      id: user.id,
      email: user.email,
      roles: user.roles
    }
  })
  .get("/api/exams", async (ctx) => {
    try {
      const examList = await exams.find().toArray();
      ctx.response.status = 200;
      ctx.response.body = examList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching exams', error };
    }
  })
  .get("/api/exam/:id", async (ctx) => {
    try {
      const examId = ctx.params.id;
      const mongoId = new ObjectId(examId);
      const exam = await exams.findOne({ _id: mongoId });

      if (!exam) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Exam not found" };
        return;
      }

      ctx.response.status = 200;
      ctx.response.body = exam;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Error fetching exam", error };
    }
  })
  .post("/api/exams", async (ctx) => {
    const exam: Exam = await ctx.request.body().value
    try {
      const result = await exams.insertOne(exam);
      ctx.response.status = 200;
      ctx.response.body = {
        message: 'Exam saved successfully! ',
        insertedId: result // also returns the _id of the created Exam
      }
    } catch (err) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error saving exam', error: err }
    }
  })
  .put("/api/exams/update", async (ctx) => {
    try {
      const { examId, updatedExam } = await ctx.request.body().value;

      // validate examId and updatedExamData are provided
      if (!examId || !updatedExam) {
        ctx.response.status = 400;
        ctx.response.body = { message: "Exam ID and updated data are required" };
        return;
      }

      // Convert the examId to an ObjectId (MongoDB uses ObjectId for the _id field)
      const mongoId = new ObjectId(examId)

      // create update object without id
      const updateData = { ...updatedExam };
      delete updateData._id;  // remove id

      // Updating the Exam with the provided id
      const result = await exams.updateOne(
        { _id: mongoId },  // finds exam
        { $set: updateData }  // updates just the changed fields in the exam
      );

      // If no matching exam found, return 404
      if (result.matchedCount === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Exam not found" };
        return;
      }

      ctx.response.status = 200;
      ctx.response.body = { message: "Exam updated successfully" };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Error updating exam", error };
    }
  })
  .post("/api/generate-exam", async (ctx) => {
    if (isGenerating) { // avoids race conditions when button is presses repeatedly
        ctx.response.status = 429; // statuscode for too many requests
        ctx.response.body = { message: "Another exam generation is already in progress. Please wait." };
        return;
    }
    isGenerating = true

    try {
      const exam: Exam = await ctx.request.body().value
      
      // temp dir for avoiding race conditions when generating the PDF's is paralelized
      const tempDir = await Deno.makeTempDir({ prefix: "exam_gen_single_" });
      await copy(basePath, tempDir, { overwrite: true });
      
      const tasksPath = `${tempDir}/aufgaben.tex`;

      // update metaTemplate
      await updateMetaTemplate(exam, tempDir)
      await updateMetaStudent({ vollername: 'Max Musterloesung', matrikelnummer: 0, zeigeloesung: 'yes', sprache: 'de' }, tempDir)

      // generates latex for the tasks and updates aufgaben.tex in the templates
      const tasksContentLatex = await generateTasksLatex(exam, tempDir)
      await Deno.writeTextFile(tasksPath, tasksContentLatex)
      
      const examPDF = await generateExam(tempDir)

      // tell the frontend that this is an PDF
      ctx.response.headers.set("Content-Type", "application/pdf")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${exam.courseName}.pdf"`)

      ctx.response.body = examPDF
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error generating Exam PDF', error }
    } finally {
        isGenerating = false
    }
  })
  .post("/api/upload", async (ctx) => {
    const body = ctx.request.body({ type: "form-data" });
    const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 });

    if (!formData.files || formData.files.length === 0) {
      ctx.response.status = 400;
      ctx.response.body = { message: "No file uploaded" };
      return;
    }

    const file = formData.files[0];

    if (!file.content) {
      ctx.response.status = 400;
      ctx.response.body = { message: "No file content" };
      return;
    }

    // Compute SHA-256 hash of the file content
    const fileHashBuffer = await crypto.subtle.digest("SHA-256", file.content);
    const fileHash = encodeHex(fileHashBuffer);

    const ext = file.originalName?.split(".").pop();
    const hashedFileName = ext ? `${fileHash}.${ext}` : fileHash;

    file.originalName = hashedFileName;
    const uploadDir = "./uploads";

    const filePath = `${uploadDir}/${file.originalName}`;
    if (file.content) {
      await Deno.mkdir(uploadDir, { recursive: true });
      await Deno.writeFile(filePath, file.content);
      console.log("File saved to:", filePath);
    }

    const fileTrackerEntry: FileTracker = { name: file.originalName, refs: [], timeToLive: 7 };
    try {
      await fileTracker.insertOne(fileTrackerEntry);
      console.log("File tracker entry created:", fileTrackerEntry);
    } catch (error) {
      console.error("Error inserting file tracker entry:", error);
      ctx.response.status = 500;
      ctx.response.body = { message: "Error inserting file tracker entry", error };
      return;
    }



    ctx.response.body = {
      message: "File uploaded successfully",
      url: `./uploads/${file.originalName}`,
    };
    ctx.response.status = 200;
  })
  .get("/api/download", async (ctx) => {
    const fileUrl = ctx.request.url.searchParams.get("fileUrl");

    if (!fileUrl) {
      ctx.response.status = 400;
      ctx.response.body = { message: "File URL is required" };
      return;
    }

    try {
      const fileContent = await Deno.readFile(fileUrl);
      const fileName = fileUrl.split("/").pop() || "downloaded_file";

      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      let contentType = "application/octet-stream";
      // extract all formats that are supported by LaTeX
      switch (fileExtension) {
        case "pdf":
          contentType = "application/pdf";
          break;
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        default:
          contentType = "application/octet-stream";
      }

      ctx.response.headers.set("Content-Type", contentType);
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
      ctx.response.body = fileContent;
      console.log("sending file: ", fileUrl)
    } catch (error) {
      console.error("Error reading file:", error);
      ctx.response.status = 500;
      ctx.response.body = { message: "Error reading file", error: error.message };
    }
  })
  .post("/api/generate-exams", async (ctx) => {
    if (isGenerating) { // avoids race conditions when button is presses repeatedly
      ctx.response.status = 429; // statuscode for too many requests
      ctx.response.body = { message: "Another exam generation is already in progress. Please wait." };
      return;
    }
    isGenerating = true

    // temp dir for mass-generation
    const mainTempDir = await Deno.makeTempDir({
        dir: Deno.cwd(), // use current working directory
        prefix: "exam_gen_main_"
    });

    try {
      const body = ctx.request.body({ type: "form-data" })
      const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 })

      const examJson = JSON.parse(formData.fields.exam)
      const file = formData.files?.find(f => f.name === "list")

      if (!file || !examJson) {
        ctx.response.status = 400
        ctx.response.body = { message: "Missing file or exam" }
        return
      }
      
      const outDir = `${mainTempDir}/out`
      await Deno.mkdir(outDir)
      console.log("Created outDir: ", outDir)
      
      const examListPath = `${mainTempDir}/${file.originalName}`
      if (!file.content) {
          ctx.response.status = 400;
          ctx.response.body = { message: "Missing list content" }
          return
      }
      await Deno.writeFile(examListPath, file.content)

      // set what is common over all exams
      const templateDir = `${mainTempDir}/template`
      await copy(basePath, templateDir, { overwrite: true })
      await updateMetaTemplate(examJson, templateDir)
      const tasksContentLatex = await generateTasksLatex(examJson, templateDir)
      await Deno.writeTextFile(`${templateDir}/aufgaben.tex`, tasksContentLatex)

      await generateAllExams(examListPath, templateDir, outDir)
      
      const zipFilePath = `${mainTempDir}/exams_output.zip`

      try {
        await createZipArchiveFromDirectory(outDir, zipFilePath)
      } catch (zipError) {
        console.error("Zip creation error:", zipError)
        ctx.response.status = 500
        ctx.response.body = { message: "Error creating ZIP archive", error: zipError instanceof Error ? zipError.message : String(zipError) }
        return
      }

      const zipFileBytes = await Deno.readFile(zipFilePath)
      console.log("Zip file created:", zipFilePath)

      // send Email
      try {
        await sendEmail(
          ctx.state.user.email,
          "Your exam is ready for download",
          `<p>Hello,</p><p>Your generated exams are ready for download.</p>`
        );
        console.log("Email sent successfully");
      } catch (error) {
        console.error("Sending the Email failed:", error)
      }

      ctx.response.headers.set("Content-Type", "application/zip")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="all-exams.zip"`)
      ctx.response.body = zipFileBytes

    } catch (error) {
      console.error('Error generating Mass-Exams - FULL ERROR:')
      console.error(error);
      if (error instanceof Error) {
        console.error('Error Stack Trace:', error.stack);
      }
      ctx.response.status = 500;
      ctx.response.body = {
        message: 'Error generating all Exams',
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      await Deno.remove(mainTempDir, { recursive: true }).catch(e => console.error("Error cleaning up temp dir in finally:", e));
      isGenerating = false
    }
  })
  .get("/api/taskPool", async (ctx) => {
    try {
      const taskList = await pool.find().toArray();
      ctx.response.status = 200;
      ctx.response.body = taskList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching tasks', error };
    }
  })
  .get("/api/taskPool/type/:type", async (ctx) => {
    const taskType = ctx.params.type;
    try {
      const taskList = await pool.find({ type: taskType }).toArray();
      ctx.response.status = 200;
      ctx.response.body = taskList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching tasks by type', error };
    }
  })
  .get("/api/taskPool/tags/:tag", async (ctx) => {
    const tag = ctx.params.tag;
    try {
      const taskList = await pool.find({ tags: { $elemMatch: { name: tag } } }).toArray();
      ctx.response.status = 200;
      ctx.response.body = taskList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching tasks by tag', error };
    }
  })
  .get("/api/taskPool/user/:userId", async (ctx) => {
    const userId = ctx.params.userId;
    try {
      const taskList = await pool.find({ createdBy: userId }).toArray();
      ctx.response.status = 200;
      ctx.response.body = taskList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching tasks by user', error };
    }
  })
  .post("/api/taskPool", async (ctx) => {
    const task: Task = await ctx.request.body().value
    try {
      await pool.insertOne(task);
      ctx.response.status = 200;
      ctx.response.body = { message: 'Task added to pool' };
    } catch (err) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error adding to pool', error: err };
    }

    if (task.type === "pictureTask") {
      const fileURLs = [
        task.questionPicture.urlDE,
        task.questionPicture.urlEN,
        task.solutionPicture.urlDE,
        task.solutionPicture.urlEN,
      ]
      console.log("File URLs: ", fileURLs);
      for (const fileURL of fileURLs) {
        const fileName = fileURL.split("/").pop();
        try {
          await fileTracker.updateOne({ name: fileName }, { $addToSet: { refs: task.taskId } })
        } catch (error) {
          console.error("Error fetching file tracker enttry:", error);
        }
      }
    }

  })
  .delete("/api/exams", async (ctx) => {
    try {
      const result = await exams.deleteMany({})
      ctx.response.status = 200;
      ctx.response.body = {
        message: `${result} exams deleted successfully!`,
        deletedCount: result,
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Error deleting exams", error };
    }
  })
  .delete("/api/taskPool/:taskId", async (ctx) => {
    try {
      const result = await pool.deleteOne({ taskId: ctx.params.taskId });

      if (result.deletedCount === 0) {
        ctx.response.status = 404;
        ctx.response.body = { message: "Task not found" };
        return;
      }

      ctx.response.status = 200;
      ctx.response.body = { message: "Task deleted successfully" };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Error deleting task", error };
    }
  })
  .delete("/api/taskPool", async (ctx) => {
    try {
      const result = await pool.deleteMany({})
      await fileTracker.deleteMany({})
      await fs.emptyDir("./uploads");
      ctx.response.status = 200;
      ctx.response.body = {
        message: `${result} task-pool deleted successfully!`,
        deletedCount: result,
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: "Error deleting task-pool", error };
    }
  })


// Use the Router
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
const port = 3000;
await app.listen({ port });



async function generateExam(workingDir: string): Promise<Uint8Array> {
  const examTexPath = `${workingDir}/exam.tex`
  const examPdfPath = `${workingDir}/exam.pdf`

  try {
    // 3 passes of pdflatex to resolve all references
    for (let i = 0; i < 3; i++) {
      const cmd = new Deno.Command("pdflatex", {
        args: [
          "-interaction=nonstopmode", // Continue on errors without stopping
          "-halt-on-error",
          "-output-directory",
          workingDir,
          examTexPath,
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output()
      const stdoutStr = new TextDecoder().decode(stdout)
      const stderrStr = new TextDecoder().decode(stderr)

      if (stderrStr) {
        console.error(`pdflatex pass ${i + 1} errors in ${workingDir}:\n${stderrStr}`)
      }
    }

    // verify PDF was generated
    try {
      await Deno.stat(examPdfPath)
    } catch (err) {
      throw new Error("PDF output file was not generated")
    }

    // Read and return the PDF
    const pdfBytes = await Deno.readFile(examPdfPath)
    return pdfBytes

  } catch (error) {
    console.error("Error during PDF generation:", error)
    throw new Error("Failed to generate PDF: " + error.message)
  }
}

// generates all exams (parelelized) and more
async function generateAllExams(examListPath: string, templateDir: string, outDir: string) {
  try {
    // read excel file
    const fileContent = await Deno.readFile(examListPath)
    const workbook = read(fileContent, { type: "buffer" })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // process student data starting from row 6
    const studentData = utils.sheet_to_json(worksheet, {
      header: [
        "examPlanId", "examNumber", "examTitle", "lastName", "firstName", "studentId",
        "performance", "attempt", "status", "bonus", "semester", "year", "period",
        "remark", "topic", "startTime", "plannedEnd", "actualEnd", "examType",
        "examForm", "studyProgram", "lockVersion"
      ],
      range: 5, // skip first 5 rows (metadata and headers)
    }).filter(student => student.firstName && student.lastName) // ensure that no other rows like empty rows are included

    studentData.sort((a, b) => a.studentId - b.studentId)
    console.log("Students number:", studentData.length)

    let examDELog = ""
    let examENLog = ""
    let examSolutionLog = ""

    const deRandomExamNumbers: string[] = []
    const enRandomExamNumbers: string[] = []
    const counterStart = Math.floor(Math.random() * 100)

    // --- GERMAN EXAMS (PARALLEL) ---
    console.log("Generating German exams in parallel...")
    const germanExamPromises = studentData.map((student, index) => {
        const seatNumber = index + 1
        let fullName = `${student.firstName} ${student.lastName}`
        let counter = counterStart + 1 + index
        let randomNumber = genRandomNumber('de', counter)
        deRandomExamNumbers[index] = randomNumber

        return (async () => {
            const studentTempDir = await Deno.makeTempDir({ prefix: `student_de_${student.studentId}_` })
            await copy(templateDir, studentTempDir, { overwrite: true })
            await updateMetaStudent({
                vollername: fullName,
                matrikelnummer: student.studentId,
                zeigeloesung: 'no',
                sprache: 'de',
                randomexamnumber: randomNumber,
                sequenznummer: seatNumber
            }, studentTempDir);
            const pdfBytes = await generateExam(studentTempDir)
            await Deno.remove(studentTempDir, { recursive: true })
            return pdfBytes
        })()
    })
    const examDE = await Promise.all(germanExamPromises)
    console.log("All German exams generated.")

    // generate one more time just to get a log file
    const deLogDir = await Deno.makeTempDir({ prefix: "log_gen_de_" })
    await copy(templateDir, deLogDir, { overwrite: true })
    await updateMetaStudent({ sprache: 'de' }, deLogDir)
    await generateExam(deLogDir)
    examDELog = await Deno.readTextFile(`${deLogDir}/exam.log`)
    await Deno.remove(deLogDir, { recursive: true })
    console.log("German log file generated.")

    // --- ENGLISH EXAMS (PARALLEL) ---
    console.log("Generating English exams in parallel...");
    const englishExamPromises = studentData.map((student, index) => {
        const seatNumber = index + 1
        let fullName = `${student.firstName} ${student.lastName}`
        let counter = counterStart + 1 + index
        let randomNumber = genRandomNumber('en', counter)
        enRandomExamNumbers[index] = randomNumber

        return (async () => {
            const studentTempDir = await Deno.makeTempDir({ prefix: `student_en_${student.studentId}_` })
            await copy(templateDir, studentTempDir, { overwrite: true })
            await updateMetaStudent({
                vollername: fullName,
                matrikelnummer: student.studentId,
                zeigeloesung: 'no',
                sprache: 'en',
                randomexamnumber: randomNumber,
                sequenznummer: seatNumber
            }, studentTempDir)
            const pdfBytes = await generateExam(studentTempDir)
            await Deno.remove(studentTempDir, { recursive: true })
            return pdfBytes
        })()
    })
    const examEN = await Promise.all(englishExamPromises)
    console.log("All English exams generated.")

    // generate one more time just to get a log file
    const enLogDir = await Deno.makeTempDir({ prefix: "log_gen_en_" })
    await copy(templateDir, enLogDir, { overwrite: true })
    await updateMetaStudent({ sprache: 'en' }, enLogDir)
    await generateExam(enLogDir)
    examENLog = await Deno.readTextFile(`${enLogDir}/exam.log`)
    await Deno.remove(enLogDir, { recursive: true })
    console.log("English log file captured.")

    // --- MERGE AND SOLUTION ---
    console.log("Merging PDFs and generating solution...")
    const examDEMerged = await mergePDFs(examDE)
    const examENMerged = await mergePDFs(examEN)

    // generate solution exam (no seat number)
    const solutionTempDir = await Deno.makeTempDir({ prefix: "solution_" })
    await copy(templateDir, solutionTempDir, { overwrite: true })
    await updateMetaStudent({
      vollername: 'Max Musterloesung',
      matrikelnummer: 0,
      zeigeloesung: 'yes',
      sprache: 'de'
    }, solutionTempDir)
    const examSolution = await generateExam(solutionTempDir)
    examSolutionLog = await Deno.readTextFile(`${solutionTempDir}/exam.log`)
    await Deno.remove(solutionTempDir, { recursive: true })
    console.log("Solution exam and log file generated.")

    // generating anwesenheitsliste.csv
    const csvHeader = "Sitzplatz,Random,Matrikelnr,Name,Anwesend? (X)\n"
    let csvContent = csvHeader;
    studentData.forEach((student, index) => {
      const seatNumber = index + 1;
      const randomCode = deRandomExamNumbers[index] + "/" + enRandomExamNumbers[index]
      csvContent += `${seatNumber},${randomCode},${student.studentId},${student.firstName} ${student.lastName},\n`
    });
    console.log("Attendance list generated.")

    // write everything to output dir
    await Deno.writeFile(`${outDir}/exam_merged_de.pdf`, examDEMerged)
    await Deno.writeFile(`${outDir}/exam_merged_en.pdf`, examENMerged)
    await Deno.writeFile(`${outDir}/exam_solution_de.pdf`, examSolution)
    await Deno.writeTextFile(`${outDir}/exam_de.log`, examDELog)
    await Deno.writeTextFile(`${outDir}/exam_en.log`, examENLog)
    await Deno.writeTextFile(`${outDir}/exam_solution.log`, examSolutionLog)
    await Deno.writeTextFile(`${outDir}/anwesenheitsliste.csv`, csvContent)

  } catch (error) {
    console.error('Error generating mass exams:', error)
    throw error
  }
}

async function mergePDFs(pdfs: Uint8Array[]) {
  const mergedPdf = await PDFDocument.create()

  for (const pdfBytes of pdfs) {
    const pdf = await PDFDocument.load(pdfBytes)
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    copiedPages.forEach(page => mergedPdf.addPage(page))
  }

  return mergedPdf.save()
}

// for escaping special characters in latex
function escapeLatex(text?: string): string {
  if (!text) return ""
  return text.replace(/([&%$#_{}~^\\])/g, '\\$1')
}

async function generateTasksLatex(exam: Exam, workingDir: string): Promise<string> {
  await clearLatexIMGFolder(workingDir) // remove old images from previous runs

  const taskGroups = exam.tasks // get the array of task groups
  let latexContent = ""

  // iterate over each task group
  for (let group of taskGroups) {
    const groupTitleDE = group.groupTitle.DE
    const groupTitleEN = group.groupTitle.EN

    // start a main task (\aufgabe) for the group
    latexContent += `\\aufgabe{${escapeLatex(groupTitleDE)}}{${escapeLatex(groupTitleEN)}}\n\n`;

    // iterate over the sub-tasks within this group
    for (let subTask of group.tasks) {
      const questionDE = subTask.question.DE
      const questionEN = subTask.question.EN

      if (subTask.type === "manualText") {
        // Handle manual text task separately because it does not start with "\aufgabenteil"
        latexContent += `\\manualText\n`
        latexContent += `{${escapeLatex(questionDE)}}\n`
        latexContent += `{${escapeLatex(questionEN)}}\n\n`
        continue; // skip to the next sub-task
      }

      // start a sub-task (\aufgabenteil)
      latexContent += `\\aufgabenteil{${subTask.points ?? 0}}\n`
      latexContent += `{${escapeLatex(questionDE)}}\n`
      latexContent += `{${escapeLatex(questionEN)}}\n\n`

      // --- handle multiple choice task ---
      if (subTask.type === "multipleChoice" && subTask.answerOptions) {
        const answerOptions = subTask.answerOptions
        const correctAnswersCount = answerOptions.filter(opt => opt.correct).length // calculate points per correct answer
        const totalMcPoints = subTask.points

        latexContent += `\\fortype{A}{\n`
        latexContent += `\\mcstart[${totalMcPoints}]{${correctAnswersCount}}\n` // use total points for the question

        answerOptions.forEach(option => {
          const de = escapeLatex(option.DE)
          const en = escapeLatex(option.EN)
          const correctness = option.correct ? "w" : "f"
          latexContent += `\\mcline{${de}}{${en}}{${correctness}}\n`
        });

        latexContent += `\\mcend\n}\n\n` // end fortype and add newline
      }

      // --- handle short answer task ---
      else if (subTask.type === "shortAnswer" && subTask.solution) {
        const solutionDE = escapeLatex(subTask.solution.DE)
        const solutionEN = escapeLatex(subTask.solution.EN)

        // Estimates number of lines needed based on the solution. Better more lines than less.
        const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50))
        const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50))
        const numberLn = Math.max(numberLnDE, numberLnEN)

        latexContent += `\\loesung{${numberLn}}{${solutionDE} / ${solutionEN}}\n\n`
      }

      // --- handle latex task ---
      else if (subTask.type === "latex") {
        // Insert raw LaTeX content directly
        if (subTask.questionLatex?.DE) {
          latexContent += subTask.questionLatex.DE + "\n\n";
        }
        if (subTask.questionLatex?.EN) {
          latexContent += subTask.questionLatex.EN + "\n\n";
        }
      }

      else if (subTask.type === "pictureTask") {
        // copy the images to the img folder
        const questionImageName = subTask.questionPicture.urlDE.split('/').pop()
        const solutionImageName = subTask.solutionPicture.urlDE.split('/').pop()
        await Deno.copyFile(subTask.questionPicture.urlDE, `${workingDir}/img/${questionImageName}`)
        await Deno.copyFile(subTask.solutionPicture.urlDE, `${workingDir}/img/${solutionImageName}`)


        latexContent += `\\bildAufgabe{}`
        latexContent += `{0.3\\textwidth}{img/${questionImageName}}{img/${solutionImageName}}\n`
        latexContent += `\\manualText{${subTask.questionPicture.altTextDE || ""}}{${subTask.questionPicture.altTextEN || ""}}\n\n`
      }

      else if (subTask.type === "table") {
        if (!subTask.tableDataQuestion || !subTask.tableDataSolution) {
          console.warn("Table task missing data:", subTask.taskId);
          continue; // skip this task if data is missing
        }
        const numberOfRows = subTask.tableDataQuestion[0].length;
        const numberOfColumns = subTask.tableDataQuestion.length;

        let tableFormat = "";   // e.g. "|l|l|l|l|l|l"
        for (let i = 0; i < numberOfRows; i++) {
          tableFormat += "|l";
        }

        //find longest solution text to set the column width
        const longestSolution =
          subTask.tableDataSolution
            .map((col) =>
              col.reduce(
                (maxLength, cell) =>
                  maxLength.DE.length > cell.DE.length ? maxLength : cell
              )
            )
            .reduce(
              (maxLength, cell) =>
                maxLength.DE.length > cell.DE.length ? maxLength : cell
            ).DE.length;

        latexContent += `\\begin{center}\n`
        latexContent += `\\begin{tabular}`
        latexContent += `{${tableFormat}|}\n`

        latexContent += `\\hline\n`

        for (let i = 0; i < numberOfColumns; i++) {
          latexContent += `%line ${i + 1}\n`
          for (let j = 0; j < numberOfRows; j++) {

            // add & between columns
            latexContent += j === 0 ? "" : " & ";

            latexContent += `\\lineloesung`;
            if (subTask.tableDataQuestion[i][j].DE) {
              latexContent += `{${escapeLatex(subTask.tableDataQuestion[i][j].DE)}}`
            } else {
              latexContent += `{${"~".repeat(longestSolution)}}`;
            }
            latexContent += `{ ${escapeLatex(subTask.tableDataSolution[i][j].DE)} }`;
          }
          latexContent += ` \\\\ \\hline\n`
        }

        latexContent += `\\end{tabular}\n`
        latexContent += `\\end{center}\n\n`
      }

      latexContent += "\\aufgabenteilende\n\n\n";
    };

    // add a clearpage after each main task group if desired (optional)
    // latexContent += "\\clearpage\n\n";

  } // end of iterating through task groups

  // console.log(latexContent) // uncomment for debugging
  return latexContent;
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

  // Extract data from JSON
  const { courseName, examinerName, semester, date, examLengthMinutes, tasks } = exam;

  // Read meta-exam.tex
  const metaTemplate = await Deno.readTextFile(metaPath);

  // Replace placeholders in meta-exam.tex
  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\veranstaltung\}\{.*?\}/, `\\newcommand{\\veranstaltung}{ ${courseName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')} }`)
    .replace(/\\newcommand\{\\semester\}\{.*?\}/, `\\newcommand{\\semester}{${semester.replace(/ /g, '\\ ')}}`)
    .replace(/\\newcommand\{\\pruefer\}\{.*?\}/, `\\newcommand{\\pruefer}{${examinerName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')}}`)
    .replace(/\\newcommand\{\\datum\}\{.*?\}/, `\\newcommand{\\datum}{${date}}`)

  // these can also be updated, see meta-exam.tex
  // \newcommand{\klausurtyp}{A}
  // \newcommand{\schmierblaetteranzahl}{2} % (CB) set to 0 for no empty pages at the end. Will be filled to a even number of pages
  // \newcommand{\interactive}{N} % Y=Yes, N=No; use PDF forms and generate info for digital exams
  // \newcommand{\englishandgerman}{yes}

  // Update meta-exam.tex
  await Deno.writeTextFile(metaPath, updatedMeta)
}

async function updateMetaStudent(options: {
  zeigeloesung?: 'yes' | 'no',
  sprache?: string,
  randomexamnumber?: string,
  sequenznummer?: number,
  vollername?: string,
  matrikelnummer?: number,
  uploadurl?: string,
} = {},
workingDir: string
) {
  const { zeigeloesung, sprache, randomexamnumber, sequenznummer, vollername, matrikelnummer, uploadurl } = options
  const metaPath = `${workingDir}/meta-exam.tex`

  // Read meta-exam.tex
  const metaTemplate = await Deno.readTextFile(metaPath);

  // Replace placeholders in meta-exam.tex
  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\zeigeloesung\}\{.*?\}/, `\\newcommand{\\zeigeloesung}{${zeigeloesung === 'yes' ? 'yes' : 'no'}}`)
    .replace(/\\newcommand\{\\sprache\}\{.*?\}/, `\\newcommand{\\sprache}{${sprache || 'de'}}`)
    .replace(/\\newcommand\{\\randomexamnumber\}\{.*?\}/, `\\newcommand{\\randomexamnumber}{${randomexamnumber || '7PYT'}}`)
    .replace(/\\newcommand\{\\sequenznummer\}\{.*?\}/, `\\newcommand{\\sequenznummer}{${sequenznummer || '6'}}`)
    .replace(/\\newcommand\{\\vollername\}\{.*?\}/, `\\newcommand{\\vollername}{${vollername ? vollername.replace(/ /g, '\\ ') : 'Tom\ Morello'}}`)
    .replace(/\\newcommand\{\\matrikelnummer\}\{.*?\}/, `\\newcommand{\\matrikelnummer}{${matrikelnummer || '3120434'}}`)
    .replace(/\\newcommand\{\\uploadurl\}\{.*?\}/, `\\newcommand{\\uploadurl}{${uploadurl || 'aklsjdhflkjashdflkjahsdf'}}`);

  // Update meta-exam.tex
  await Deno.writeTextFile(metaPath, updatedMeta);
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
function genRandomNumber(lang: 'de'|'en', counter: number): string {
  const paddedCount = counter.toString().padStart(4, "0")
  const langPrefix = lang === 'de' ? '1' : '2'
  const num = parseInt(langPrefix + paddedCount, 10).toString(36).toUpperCase()
  const parity = calc_check_digit(num)
  return num + parity
}

async function clearLatexIMGFolder(workingDir: string) {
  try {
    const imgPath = `${workingDir}/img`
    for await (const entry of Deno.readDir(imgPath)) {
      if (
        entry.isFile &&
        !["kreuze.png", "Unilogo.jpg", "vslogo.png", "background-svg.pdf", "background-svg-muster.pdf", "background-svg-muster-first.pdf"].includes(entry.name)
      ) {
        await Deno.remove(`${imgPath}/${entry.name}`);
      }
    }

  } catch (error) {
    console.error("Error clearing latex img folder:", error);
  }
}