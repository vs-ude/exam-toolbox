import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";
import { latrex } from "https://deno.land/x/latrex/mod.ts";


export class Exam{
  title: string;
  questions: {question: string; points: number}[];

  constructor(title: string, questions: { question: string; points: number }[]) {
      this.title = title;
      this.questions = questions;
  }
}

// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");

// Create Oak Application and Router
const app = new Application();
const router = new Router();

// For cross-origin requests (like CORS)
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
      const examPDF = await generateExamLatex(exam)

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


async function generateExamLatex(exam: Exam): Promise<Uint8Array> {
  const latexContent = `
    \\documentclass{article}
    \\begin{document}
    \\title{${exam.title}}
    \\maketitle
    ${exam.questions.map((q) => `\\section*{Question:} ${q.question} \\hfill ${q.points} points`).join("\n")}
    \\end{document}`;

  try {
    console.log("Generating PDF from LaTeX content: " + latexContent)
    const pdfBuffer = await latrex(latexContent, {returnLogs: true})
    console.log("PDF generation successful")
    return pdfBuffer
  } catch (error) {
    console.error("Error during LaTeX document generation:", error);
    throw new Error("LaTeX Document generation failed")
  }
}