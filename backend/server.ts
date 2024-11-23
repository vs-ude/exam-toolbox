// Import necessary modules
import { Application, Router } from "https://deno.land/x/oak@v10.5.0/mod.ts";
import { MongoClient } from "https://deno.land/x/mongo/mod.ts";

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
    const { name, comment } = await ctx.request.body().value;
    try {
      const exam = { name, comment };
      await exams.insertOne(exam);
      ctx.response.status = 200;
      ctx.response.body = { message: 'Exam saved successfully!' };
    } catch (err) {
      ctx.response.status = 500;
      ctx.response.body = { message: 'Error saving exam', error: err };
    }
  })
  .get("/api/test", (ctx) => {
    ctx.response.body = { message: 'Hello this is the Backend calling!' };
  });

// Use the Router
app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
const port = 3000;
console.log(`Server is running on http://localhost:${port}`);
await app.listen({ port });
