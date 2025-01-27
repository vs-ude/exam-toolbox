import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
import { latrex } from "https://deno.land/x/latrex/mod.ts";
import { Exam } from "./exam.ts";



// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");

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
      const examList = await exams.find();
      ctx.response.status = 200;
      ctx.response.body = examList;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error fetching exams', error };
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
  .post("/api/generate-exam", async (ctx) => {
    const exam: Exam = await ctx.request.body().value
    try {
      const examPDF = await generateExam(exam)

      // tell the frontend that this is an PDF
      ctx.response.headers.set("Content-Type", "application/pdf")
      ctx.response.headers.set("Content-Disposition", `attachment; filename="${exam.title}.pdf"`)

      ctx.response.body = examPDF
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error generating Exam PDF', error }
    }
  })

// Use the Router
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
const port = 3000;
await app.listen({ port });



async function generateExam(examGiven?: Exam): Promise<Uint8Array> {
  try {
    // Directory for templates
    const basePath = "/app/ExamTemplate"
    const metaPath = `${basePath}/meta-exam.tex`
    const examTemplatePath = `${basePath}/exam.tex`

    console.log("Paths:");
    console.log("Base Path:", basePath);
    console.log("Meta Path:", metaPath);
    console.log("Exam Template Path:", examTemplatePath);

    // fetch latest exam from db 
    const latestExam = await exams.find().sort({ _id: -1 }).limit(1).toArray();
    if (latestExam.length === 0) {
      throw new Error("No exams found in the database.");
    }

    // Extract data from JSON
    const exam: Exam = latestExam[0] as Exam;
    const { examId, title, courseName, examinerName, semester, date, examLengthMinutes, tasks } = exam;
    console.log(examId + ", " + title + ", " + courseName + ", " + examinerName + ", " + semester + ", " + date + ", " + examLengthMinutes + ", " + tasks);

    // Read meta-exam.tex
    const metaTemplate = await Deno.readTextFile(metaPath);

    // Replace placeholders in meta-exam.tex
    const updatedMeta = metaTemplate
      .replace(/\\newcommand\{\\veranstaltung\}\{.*?\}/, `\\newcommand{\\veranstaltung}{${courseName.replace(/ /g, '\\ ')}}`)
      .replace(/\\newcommand\{\\semester\}\{.*?\}/, `\\newcommand{\\semester}{${semester.replace(/ /g, '\\ ')}}`)
      .replace(/\\newcommand\{\\pruefer\}\{.*?\}/, `\\newcommand{\\pruefer}{${examinerName.replace(/ /g, '\\ ')}}`)
      .replace(/\\newcommand\{\\datum\}\{.*?\}/, `\\newcommand{\\datum}{${date}}`);


    console.log(updatedMeta)

    // Update meta-exam.tex
    await Deno.writeTextFile(metaPath, updatedMeta);

    // Read exam.tex
    const examTemplate = await Deno.readTextFile(examTemplatePath);

    // Set name and path for new exam LaTeX file
    const newExamFilename = `${examId}.tex`;
    const newExamPath = `${basePath}/${newExamFilename}`
    console.log("Path for new exam:", newExamPath);

    // Create new exam LaTeX file
    await Deno.writeTextFile(newExamPath, examTemplate);
    console.log(`New LaTeX file created: ${newExamFilename}`);


    const errorLogsPath = `${basePath}/${examId}_error.log`

    // Generate PDF from the new LaTeX file
    console.log("Generating PDF from LaTeX content...");
    Deno.chdir(basePath)
    const pdfBuffer = await latrex(newExamPath, {
      returnLogs: true,
      errorLogsPath,
      cwd: basePath,
      inputs: [basePath],
    });
    console.log("PDF generation successful");

    return pdfBuffer;

  } catch (error) {
    console.error("Error during LaTeX document generation:", error);
    throw new Error("LaTeX Document generation failed");
  }
}
