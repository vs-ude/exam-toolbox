// @ts-ignore
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
// @ts-ignore
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
// @ts-ignore
import { latrex } from "https://deno.land/x/latrex/mod.ts";
import { Exam, Task } from "./exam.ts";
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






const basePath = "/app/ExamTemplate"

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
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  await next();
});

// Routes
router
  .get("/", (ctx) => {
    ctx.response.body = "API is running...";
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

      // Updating the Exam with the provided id
      const result = await exams.updateOne(
        { _id: mongoId },  // finds exam
        { $set: updatedExam }  // updates just the changed fields in the exam
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
    const exam: Exam = await ctx.request.body().value
    const tasksPath = `${basePath}/aufgaben.tex`
    try {
      // update metaTemplate
      await updateMetaTemplate(exam)
      await updateMetaStudent({ vollername: 'Max Musterloesung', matrikelnummer: 0, zeigeloesung: 'yes', sprache: 'de' })

      // generates latex for the tasks and updates aufgaben.tex in the templates
      const tasksContentLatex = generateTasksLatex(exam)
      await Deno.writeTextFile(tasksPath, tasksContentLatex)
      const examPDF = await generateExam()

      // tell the frontend that this is an PDF
      ctx.response.headers.set("Content-Type", "application/pdf")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${exam.courseName}.pdf"`)

      ctx.response.body = examPDF
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error generating Exam PDF', error }
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
      switch (fileExtension) {
        case "pdf":
          contentType = "application/pdf";
          break;
        case "txt":
          contentType = "text/plain";
          break;
        case "csv":
          contentType = "text/csv";
          break;
        case "json":
          contentType = "application/json";
          break;
        case "zip":
          contentType = "application/zip";
          break;
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        case "gif":
          contentType = "image/gif";
          break;
        case "svg":
          contentType = "image/svg+xml";
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
    const tempDir = await Deno.makeTempDir({
      dir: `${basePath}`,
      prefix: "exam_gen_"
    });
    const tasksPath = `${basePath}/aufgaben.tex`

    try {
      const body = ctx.request.body({ type: "form-data" })
      const formData = await body.value.read({ maxSize: 10 * 1024 * 1024 })

      const examJson = JSON.parse(formData.fields.exam)

      const file = formData.files?.find(f => f.name === "list")
      console.log(examJson)
      console.log(file)

      if (!file || !examJson) {
        ctx.response.status = 400
        ctx.response.body = { message: "Missing file or exam" }
        return
      }

      const tempDir = await Deno.makeTempDir({
        dir: `${basePath}`,
        prefix: "exam_gen_"
      });

      const outDir = `${tempDir}/out`;
      await Deno.mkdir(outDir);
      console.log("Created outDir: ", outDir);

      const examListPath = `${tempDir}/${file.originalName}`

      if (!file.content) {
        ctx.response.status = 400
        ctx.response.body = { message: "Missing list content" }
        return
      }
      await Deno.writeFile(examListPath, file.content)

      updateMetaTemplate(examJson)
      const tasksContentLatex = generateTasksLatex(examJson)
      await Deno.writeTextFile(tasksPath, tasksContentLatex)
      await generateAllExams(examListPath, basePath, outDir)

      const zipFilePath = `${tempDir}/exams_output.zip`

      // outdir to zip
      try {
        await createZipArchiveFromDirectory(outDir, zipFilePath)
      } catch (zipError) {
        console.error("Zip creation error:", zipError)
        await Deno.remove(tempDir, { recursive: true }).catch(e => console.error("Error cleaning up temp dir after zip error:", e))
        ctx.response.status = 500
        ctx.response.body = { message: "Error creating ZIP archive", error: zipError instanceof Error ? zipError.message : String(zipError) }
        return
      }

      // read zipfile of mass-exam
      const zipFileBytes = await Deno.readFile(zipFilePath)
      console.log("Zip file created:", zipFilePath)

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
      await Deno.remove(tempDir, { recursive: true }).catch(e => console.error("Error cleaning up temp dir in finally:", e));
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



async function generateExam(): Promise<Uint8Array> {
  const examTexPath = `${basePath}/exam.tex`
  const examPdfPath = `${basePath}/exam.pdf`

  try {
    // 3 passes of pdflatex to resolve all references
    for (let i = 0; i < 3; i++) {
      const cmd = new Deno.Command("pdflatex", {
        args: [
          "-interaction=nonstopmode", // Continue on errors without stopping
          "-halt-on-error",
          "-output-directory",
          basePath,
          examTexPath,
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await cmd.output()
      const stdoutStr = new TextDecoder().decode(stdout)
      const stderrStr = new TextDecoder().decode(stderr)

      console.log(`pdflatex pass ${i + 1} output:\n${stdoutStr}`)
      if (stderrStr) {
        console.error(`pdflatex pass ${i + 1} errors:\n${stderrStr}`)
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

async function generateAllExams(examListPath: string, basePath: string, outDir: string) {
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

    console.log("Students number:", studentData.length)

    let examDE = []
    let examEN = []
    let examDELog = ""
    let examENLog = ""
    let examSolutionLog = ""
    const logPath = `${basePath}/exam.log`

    // generating german exams
    for (const student of studentData) {
      let fullName = `${student.firstName} ${student.lastName}`
      await updateMetaStudent({ vollername: fullName, matrikelnummer: student.studentId, zeigeloesung: 'no', sprache: 'de' })
      examDE.push(await generateExam())
    }
    examDELog = new TextDecoder().decode(await Deno.readFile(logPath)) // save log file

    // generating english exams
    for (const student of studentData) {
      let fullName = `${student.firstName} ${student.lastName}`
      await updateMetaStudent({ vollername: fullName, matrikelnummer: student.studentId, zeigeloesung: 'no', sprache: 'en' })
      examEN.push(await generateExam());
    }
    examENLog = new TextDecoder().decode(await Deno.readFile(logPath)) // save log file

    // merge all generated exams to one german and english one
    const examDEMerged = await mergePDFs(examDE)
    const examENMerged = await mergePDFs(examEN)

    // generate solution exam
    await updateMetaStudent({ vollername: 'Max Musterloesung', matrikelnummer: 0, zeigeloesung: 'yes', sprache: 'de' })
    const examSolution = await generateExam();
    examSolutionLog = new TextDecoder().decode(await Deno.readFile(logPath))

    // generating anwesenheitsliste.csv
    const csvHeader = "Sitzplatz,Random,Matrikelnr,Name,Anwesend? (X)\n"
    let csvContent = csvHeader;
    studentData.forEach((student, index) => {
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase() + "/" + Math.random().toString(36).substring(2, 6).toUpperCase()
      csvContent += `${index + 1},${randomCode},${student.studentId},${student.firstName} ${student.lastName},\n`
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

// generates the latex for the tasks
function generateTasksLatex(exam: Exam): string {
  const taskGroups = exam.tasks // get the array of task groups
  let latexContent = ""

  // iterate over each task group
  taskGroups.forEach((group) => {
    const groupTitleDE = group.groupTitle.DE
    const groupTitleEN = group.groupTitle.EN

    // start a main task (\aufgabe) for the group
    latexContent += `\\aufgabe{${escapeLatex(groupTitleDE)}}{${escapeLatex(groupTitleEN)}}\n\n`;

    // iterate over the sub-tasks within this group
    group.tasks.forEach((subTask) => {
      const questionDE = subTask.question.DE
      const questionEN = subTask.question.EN

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
      if (subTask.type === "shortAnswer" && subTask.solution) {
        const solutionDE = escapeLatex(subTask.solution.DE)
        const solutionEN = escapeLatex(subTask.solution.EN)

        // Estimates number of lines needed based on the solution. Better more lines than less.
        const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50))
        const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50))
        const numberLn = Math.max(numberLnDE, numberLnEN)

        latexContent += `\\loesung{${numberLn}}{${solutionDE} / ${solutionEN}}\n\n`
      }

      latexContent += "\\aufgabenteilende\n\n\n";
    });

    // add a clearpage after each main task group if desired (optional)
    // latexContent += "\\clearpage\n\n";

  }) // end of iterating through task groups

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

async function updateMetaTemplate(exam: Exam) {
  const metaPath = `${basePath}/meta-exam.tex`

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
  zeigeloesung?: boolean,
  sprache?: string,
  randomexamnumber?: string,
  sequenznummer?: number,
  vollername?: string,
  matrikelnummer?: number,
  uploadurl?: string
} = {}
) {
  const { zeigeloesung, sprache, randomexamnumber, sequenznummer, vollername, matrikelnummer, uploadurl } = options
  const metaPath = `${basePath}/meta-exam.tex`;

  // Read meta-exam.tex
  const metaTemplate = await Deno.readTextFile(metaPath);

  // Replace placeholders in meta-exam.tex
  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\zeigeloesung\}\{.*?\}/, `\\newcommand{\\zeigeloesung}{${zeigeloesung ? 'yes' : 'no'}}`)
    .replace(/\\newcommand\{\\sprache\}\{.*?\}/, `\\newcommand{\\sprache}{${sprache || 'de'}}`)
    .replace(/\\newcommand\{\\randomexamnumber\}\{.*?\}/, `\\newcommand{\\randomexamnumber}{${randomexamnumber || '7PYT'}}`)
    .replace(/\\newcommand\{\\sequenznummer\}\{.*?\}/, `\\newcommand{\\sequenznummer}{${sequenznummer || '6'}}`)
    .replace(/\\newcommand\{\\vollername\}\{.*?\}/, `\\newcommand{\\vollername}{${vollername ? vollername.replace(/ /g, '\\ ') : 'Tom\ Morello'}}`)
    .replace(/\\newcommand\{\\matrikelnummer\}\{.*?\}/, `\\newcommand{\\matrikelnummer}{${matrikelnummer || '3120434'}}`)
    .replace(/\\newcommand\{\\uploadurl\}\{.*?\}/, `\\newcommand{\\uploadurl}{${uploadurl || 'aklsjdhflkjashdflkjahsdf'}}`);

  // Update meta-exam.tex
  await Deno.writeTextFile(metaPath, updatedMeta);
}
