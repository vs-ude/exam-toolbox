import { Application } from "@oak/oak";
import { MongoClient } from "@db/mongo";
import { parseLogFileForSubtaskInfo } from "./src/services/mod.ts";
import {
  configureExamManagerRouter,
  configureTagRouter,
  configureTaskPoolRouter,
  createExamManagerRuntime,
} from "./src/examManager/mod.ts";
import { TEMPLATE_BASE_PATH } from "./src/config/paths.ts";

const basePath = TEMPLATE_BASE_PATH;
const JOBS_DIR = "/app/jobs";
const REQUIRED_GROUP = "researcher";
const port = 3000;

// MongoDB setup
const client = new MongoClient();
await client.connect("mongodb://mongo:27017/examToolboxDB");
const db = client.database("examToolboxDB");
const exams = db.collection("exams");

// Create exam manager runtime (generation queue, workers, finalization, cleanup)
const examRuntime = createExamManagerRuntime(
  {
    basePath,
    jobsDir: JOBS_DIR,
    workerModulePath: "./worker.ts",
  },
  {
    exams: exams,
  },
);

await Deno.mkdir(examRuntime.jobsDir, { recursive: true });

// Create Oak application + routers
const app = new Application();

const examManagerRouter = configureExamManagerRouter({
  db,
  jobs: examRuntime.jobs,
  taskQueue: examRuntime.taskQueue,
  workers: examRuntime.workers,
  basePath: examRuntime.basePath,
  JOBS_DIR: examRuntime.jobsDir,
  processQueue: examRuntime.processQueue,
  genRandomNumber: examRuntime.genRandomNumber,
  getDownloadableJobs: examRuntime.getDownloadableJobs,
  parseLogFileForSubtaskInfo,
});

const taskPoolRouter = configureTaskPoolRouter({
  db,
  basePath: examRuntime.basePath,
});

const tagRouter = configureTagRouter({ db });

// Core middleware: CORS + authentication/authorization
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Auth-Uid, X-Auth-Email, X-Auth-Member-Of",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  const userId = ctx.request.headers.get("X-Token-Subject");
  const userEmail = ctx.request.headers.get("X-Token-User-Email");
  const userRolesHeader = ctx.request.headers.get("X-Token-User-Roles");
  const userRoles = userRolesHeader
    ? userRolesHeader
      .split(" ")
      .map((role) => role.trim())
      .filter((role) => role !== "")
    : [];

  if (!userRoles.includes(REQUIRED_GROUP)) {
    console.warn(
      `⛔ Access Denied: User ${
        userId || "Anonymous"
      } lacks group '${REQUIRED_GROUP}'`,
    );
    ctx.response.status = 403;
    ctx.response.body = { error: "Access Denied: You do not have permission." };
    return;
  }

  ctx.state.user = { id: userId, email: userEmail, roles: userRoles };
  await next();
});

// Route registration
app.use(examManagerRouter.routes());
app.use(examManagerRouter.allowedMethods());
app.use(taskPoolRouter.routes());
app.use(taskPoolRouter.allowedMethods());
app.use(tagRouter.routes());
app.use(tagRouter.allowedMethods());

// Schedule periodic in-memory job cleanup and start server
examRuntime.scheduleDailyCleanup();

await app.listen({ port });
