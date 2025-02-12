// @ts-ignore
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
// @ts-ignore
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
// @ts-ignore
import { latrex } from "https://deno.land/x/latrex/mod.ts";
import { Exam, Task } from "./exam.ts";
import { ObjectId } from "https://deno.land/x/mongo@v0.33.0/deps.ts";



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
      await exams.insertOne(exam);
      ctx.response.status = 200;
      ctx.response.body = { message: 'Exam saved successfully!' };
    } catch (err) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error saving exam', error: err };
    }
  })
  .post("/api/exams/update", async (ctx) => {
    try {
      const { examId, updatedExam } = await ctx.request.body().value;
      console.log("Incoming request body:", await ctx.request.body().value);
  
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
    const basePath = "/app/ExamTemplate"
    const metaPath = `${basePath}/meta-exam.tex`
    const examTemplatePath = `${basePath}/exam.tex`
    const tasksPath = `${basePath}/aufgaben.tex`

    if(examGiven == undefined){
      // fetch latest exam from db 
      const latestExam = await exams.find().sort({ _id: -1 }).limit(1).toArray();
      if (latestExam.length === 0) {
        throw new Error("No exams found in the database.");
      }
      exam = latestExam[0] as Exam;
    }
    else{
      exam = examGiven
    }

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
    await Deno.writeTextFile(metaPath, updatedMeta);


    // generates latex for the tasks and updates aufgaben.tex in the templates
    const tasksContentLatex = generateTasksLatex(tasks)
    await Deno.writeTextFile(tasksPath, tasksContentLatex)


    // Read exam.tex
    const examTemplate = await Deno.readTextFile(examTemplatePath);

    // Set name and path for new exam LaTeX file
    const newExamFilename = `newExam.tex`;
    const newExamPath = `${basePath}/${newExamFilename}`
    console.log("Path for new exam:", newExamPath);

    // Create new exam LaTeX file
    await Deno.writeTextFile(newExamPath, examTemplate);
    console.log(`New LaTeX file created: ${newExamFilename}`);

    // Generate PDF from the new LaTeX file
    console.log("Generating PDF from LaTeX content...");
    Deno.chdir(basePath)
    const pdfBuffer = await latrex(newExamPath, {
      inputs: [basePath],
      passes: 3, // needs multiple passes because .aux files are persisting to the second pass and the pdf can only be generated correctly when the .aux files from the pass before is used. 
    });
    console.log("PDF generation successful");

    await Deno.remove(newExamPath)

    return pdfBuffer;

  } catch (error) {
    console.error("Error during LaTeX document generation:", error);
    throw new Error("LaTeX Document generation failed");
  }
}

// for escaping special characters in latex
function escapeLatex(text?: string): string {
  if (!text) return ""
  return text.replace(/([&%$#_{}~^\\])/g, '\\$1')
}

// generates the latex for the tasks
function generateTasksLatex(tasks: Task[]): string {
  let latexContent = ""

  tasks.forEach((task) => {
      // Ensure required fields exist with fallbacks
      const questionDE = task.question.DE
      const questionEN = task.question.EN
      
      latexContent += `\\aufgabe{${escapeLatex(questionDE)}}{${escapeLatex(questionEN)}}\n`;
      latexContent += `\\aufgabenteil{${task.points ?? 0}}\n`;
      latexContent += `{${escapeLatex(questionDE)}}\n`;
      latexContent += `{${escapeLatex(questionEN)}}\n\n`;

      if (task.type === "multipleChoice") {
          const answerOptions = task.answerOptions
          const correctAnswers = answerOptions.filter(opt => opt.correct).length
          const pointsPerCorrect = task.points * correctAnswers

          latexContent += `\\fortype{A}{\n\\mcstart[${pointsPerCorrect}]{${correctAnswers}}\n`;
          
          answerOptions.forEach(option => {
              const de = escapeLatex(option.DE);
              const en = escapeLatex(option.EN);
              const correctness = option.correct ? "w" : "f";
              latexContent += `\\mcline{${de}}{${en}}{${correctness}}\n`;
          });
          
          latexContent += `\\mcend\n}\n`;
      }

      latexContent += "\\aufgabenteilende\n\n";
  });

  return latexContent;
}