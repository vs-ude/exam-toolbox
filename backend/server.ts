// @ts-ignore
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
// @ts-ignore
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
// @ts-ignore
import { latrex } from "https://deno.land/x/latrex/mod.ts";
import { Exam, Task } from "./exam.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.33.0/deps.ts";
import { ZipWriter } from "https://deno.land/x/zipjs/index.js";
import { walk } from "https://deno.land/std/fs/walk.ts";




const basePath = "/app/ExamTemplate"

// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");
const pool = db.collection("taskPool");

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
    try {
      const examPDF = await generateExam(exam)

      // tell the frontend that this is an PDF
      ctx.response.headers.set("Content-Type", "application/pdf")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${exam.courseName}.pdf"`)

      ctx.response.body = examPDF
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error generating Exam PDF', error }
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
      const formData = await body.value.read({maxSize: 10 * 1024 * 1024})

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

      const pythonOutDir = `${tempDir}/out`;
      await Deno.mkdir(pythonOutDir);
      console.log("Created pythonOutDir: ", pythonOutDir);

      const tempFilePath = `${tempDir}/${file.originalName}`

      if (!file.content) {
        ctx.response.status = 400
        ctx.response.body = { message: "Missing list content" }
        return
      }
      await Deno.writeFile(tempFilePath, file.content)

      updateMetaTemplate(examJson)
      const tasksContentLatex = generateTasksLatex(examJson)
      await Deno.writeTextFile(tasksPath, tasksContentLatex)

      const pythonScriptPath = `${basePath}/scripts/generate_mass_exam.py`

      // run python script for generating mass exam
      const pythonResult = await executePythonScript(pythonScriptPath, tempFilePath, pythonOutDir, basePath)
      
      if (pythonResult.code !== 0) {
        await Deno.remove(tempDir, { recursive: true })
        ctx.response.status = 500
        ctx.response.body = {
          message: "Exam generation failed",
          error: pythonResult.stderr
        }
        return
      }

      const zipFilePath = `${tempDir}/exams_output.zip`

      // outdir to zip
      try {
        await createZipArchiveFromDirectory(pythonOutDir, zipFilePath)
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
  .delete("/api/taskPool", async (ctx) => {
    try {
      const result = await pool.deleteMany({})
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



async function generateExam(examGiven?: Exam): Promise<Uint8Array> {
  let exam: Exam
  try {
    // Directory for templates
    const examTemplatePath = `${basePath}/exam.tex`
    const tasksPath = `${basePath}/aufgaben.tex`

    if(examGiven == undefined){
      // fetch latest exam from db 
      const latestExam = await exams.find().sort({ _id: -1 }).limit(1).toArray()
      if (latestExam.length === 0) {
        throw new Error("No exams found in the database.")
      }
      exam = latestExam[0] as Exam
    }
    else{
      exam = examGiven
    }

    // update metaTemplate
    updateMetaTemplate(exam)

    // generates latex for the tasks and updates aufgaben.tex in the templates
    const tasksContentLatex = generateTasksLatex(exam)
    await Deno.writeTextFile(tasksPath, tasksContentLatex)

    // Generate PDF from the new LaTeX file
    console.log("Generating PDF from LaTeX content...")
    Deno.chdir(basePath)
    const pdfBuffer = await latrex(examTemplatePath, {
      inputs: [basePath],
      passes: 3, // needs multiple passes because .aux files are persisting to the second pass and the pdf can only be generated correctly when the .aux files from the pass before is used. 
    })
    console.log("PDF generation successful")

    return pdfBuffer

  } catch (error) {
    console.error("Error during LaTeX document generation:", error)
    throw new Error("LaTeX Document generation failed")
  }
}

// for escaping special characters in latex
function escapeLatex(text?: string): string {
  if (!text) return ""
  return text.replace(/([&%$#_{}~^\\])/g, '\\$1')
}

// generates the latex for the tasks
function generateTasksLatex(exam: Exam): string {
  const tasks: Task[] = exam.tasks
  let latexContent = ""

  tasks.forEach((task) => {
    const questionDE = task.question.DE
    const questionEN = task.question.EN
    
    latexContent += `\\aufgabe{${escapeLatex(questionDE)}}{${escapeLatex(questionEN)}}\n`
    latexContent += `\\aufgabenteil{${task.points ?? 0}}\n`
    latexContent += `{${escapeLatex(questionDE)}}\n`
    latexContent += `{${escapeLatex(questionEN)}}\n\n`
    
    if (task.type === "multipleChoice") {
      const answerOptions = task.answerOptions
      const correctAnswers = answerOptions.filter(opt => opt.correct).length
      const pointsPerCorrect = task.points * correctAnswers

      latexContent += `\\fortype{A}{\n\\mcstart[${pointsPerCorrect}]{${correctAnswers}}\n`

      answerOptions.forEach(option => {
        const de = escapeLatex(option.DE)
        const en = escapeLatex(option.EN)
        const correctness = option.correct ? "w" : "f"
        latexContent += `\\mcline{${de}}{${en}}{${correctness}}\n`
      })

      latexContent += `\\mcend\n}\n`
    }

    if(task.type === "shortAnswer"){
      const solutionDE = escapeLatex(task.solution.DE)
      const solutionEN = escapeLatex(task.solution.EN)

      // esitmates numer of lines needed based on the solution. Better more lines than less. 
      const numberLnDE = Math.max(3, Math.ceil(solutionDE.length / 50))
      const numberLnEN = Math.max(3, Math.ceil(solutionEN.length / 50))
      const numberLn = Math.max(numberLnDE, numberLnEN)
      
      latexContent += `\\loesung{${numberLn}}{${solutionDE}${solutionEN}}\n\n`
    }

    latexContent += "\\aufgabenteilende\n\n\n"
  })

  // console.log(latexContent)
  return latexContent;
}

async function createZipArchiveFromDirectory(pythonOutDir: string, zipFilePath: string): Promise<void> {
  const zipFile = await Deno.open(zipFilePath, { write: true, create: true })
  const zipWriter = new ZipWriter(zipFile)

  try {
    for await (const entry of walk(pythonOutDir)) {
      if (entry.isFile) {
        const relativePath = entry.path.substring(pythonOutDir.length + 1)
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

async function executePythonScript(
  pythonScriptPath: string,
  tempFilePath: string,
  pythonOutDir: string,
  basePath: string
): Promise<{ stdout: string; stderr: string; code: number }> {
  const cmd = new Deno.Command("python3", {
    args: [
      pythonScriptPath,
      "--de",
      "--en",
      "--examlist", tempFilePath,
      "--examdir", basePath,
      "--outdir", pythonOutDir
    ],
    stdout: "piped",
    stderr: "piped"
  })

  Deno.chdir(basePath);
  const { code, stdout, stderr } = await cmd.output()
  const errorOutput = new TextDecoder().decode(stderr)
  const stdOutput = new TextDecoder().decode(stdout)

  console.log("Python Script stderr: ", errorOutput)
  console.log("Python Script stdout: ", stdOutput)

  return { code, stdout: stdOutput, stderr: errorOutput }
}

async function updateMetaTemplate(exam: Exam){
  const metaPath = `${basePath}/meta-exam.tex`

  // Extract data from JSON
  const { courseName, examinerName, semester, date, examLengthMinutes, tasks } = exam;

  // Read meta-exam.tex
  const metaTemplate = await Deno.readTextFile(metaPath);

  // Replace placeholders in meta-exam.tex
  const updatedMeta = metaTemplate
    .replace(/\\newcommand\{\\veranstaltung\}\{.*?\}/, `\\newcommand{\\veranstaltung}{${courseName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')}}`)
    .replace(/\\newcommand\{\\semester\}\{.*?\}/, `\\newcommand{\\semester}{${semester.replace(/ /g, '\\ ')}}`)
    .replace(/\\newcommand\{\\pruefer\}\{.*?\}/, `\\newcommand{\\pruefer}{${examinerName.replace(/([#\$%&_\{\}~^\\ ])/g, '\\$1')}}`)
    .replace(/\\newcommand\{\\datum\}\{.*?\}/, `\\newcommand{\\datum}{${date}}`)
    .replace(/\\newcommand\{\\zeigeloesung\}\{.*?\}/, `\\newcommand{\\zeigeloesung}{yes}`)
  
  // Update meta-exam.tex
  await Deno.writeTextFile(metaPath, updatedMeta)
}