import { Hono } from "@hono/hono";
import { cors } from "@hono/hono/cors";
import { jwt } from "@hono/hono/jwt";

import {
  configureAdminRouter,
  configureAuthRouter,
  configureBaseRouter,
  configureExamManagerRouter,
} from "./src/api/mod.ts";
import { getConfig, QRConfig } from "./src/config/mod.ts";
import { AppEnv } from "./src/types/context.ts";
import { createExamManagerRuntime } from "./src/examManager/mod.ts";
import {
  setupConfiguredGroups,
  waitForLdapConnection,
} from "./src/services/auth.ts";
import { getOrCreateDb } from "./src/services/db.ts";
import { parseLogFileForSubtaskInfo } from "./src/services/mod.ts";
import { preGeneratePageQRCache } from "./src/services/qr.ts";

const config = getConfig();
console.debug("Config loaded", config);
const db = await getOrCreateDb();
try {
  await waitForLdapConnection(10);
  await setupConfiguredGroups();
} catch (e) {
  console.error("Failed during LDAP setup:", e);
  Deno.exit(1);
}

// Create exam manager runtime (generation queue, workers, finalization, cleanup)
const examRuntime = createExamManagerRuntime(
  {
    basePath: config.paths.templateBase,
    jobsDir: config.paths.jobsDir,
    workerModulePath: "./worker.ts",
  },
  { db },
);

await Deno.mkdir(examRuntime.jobsDir, { recursive: true });
preGeneratePageQRCache(
  QRConfig.minStudents,
  QRConfig.minPages,
);

// Build the typed route tree (split to avoid TS instantiation-depth limits)
const routesA = new Hono<AppEnv>()
  .route("/api/admin", configureAdminRouter())
  .route("/api/auth", configureAuthRouter());

const routesB = routesA
  .route("/api", configureBaseRouter())
  .route(
    "/api",
    configureExamManagerRouter({
      db,
      jobs: examRuntime.jobs,
      taskQueue: examRuntime.taskQueue,
      workers: examRuntime.workers,
      basePath: examRuntime.basePath,
      JOBS_DIR: examRuntime.jobsDir,
      processQueue: examRuntime.processQueue,
      genExamCode: examRuntime.genExamCode,
      getDownloadableJobs: examRuntime.getDownloadableJobs,
      parseLogFileForSubtaskInfo,
    }),
  );

// Export the fully-typed app for hono-docs OpenAPI generation
export type AppType = typeof routesB;

// Create the live app and layer middleware on top of routes
const app = new Hono<AppEnv>();

// Core middleware: CORS
app.use(
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Authentication middleware: public endpoints bypass JWT verification
app.use("*", (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  if (
    (path === "/api/auth/login" && method === "POST") ||
    (path === "/api/health" && method === "GET")
  ) {
    return next();
  }

  return jwt({
    secret: config.auth.jwt.secret,
    alg: "HS384",
    cookie: "auth_token",
  })(c, next);
});

// Mount all routes
app.route("/", routesB);

// Schedule periodic in-memory job cleanup and start server
examRuntime.scheduleDailyCleanup();

Deno.serve({ port: config.server.port }, app.fetch);
