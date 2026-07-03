import { Application } from "@oak/oak";

import {
  configureAdminRouter,
  configureAuthRouter,
  configureBaseRouter,
  configureExamManagerRouter,
} from "./src/api/mod.ts";
import { getConfig, QRConfig } from "./src/config/mod.ts";
import { createExamManagerRuntime } from "./src/examManager/mod.ts";
import {
  setupConfiguredGroups,
  verifyJwt,
  waitForLdapConnection,
} from "./src/services/auth.ts";
import { getOrCreateDb } from "./src/services/db.ts";
import { parseLogFileForSubtaskInfo } from "./src/services/mod.ts";
import { preGeneratePageQRCache } from "./src/services/qr.ts";
import { User } from "./src/types/user.ts";

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

// Create Oak application + routers
const app = new Application();

const routers = [
  configureAdminRouter(),
  configureAuthRouter(),
  configureBaseRouter(),
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
];

// Core middleware: CORS
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }

  await next();
});

// Authentication middleware
app.use(async (ctx, next) => {
  const path = ctx.request.url.pathname;
  const method = ctx.request.method;

  // Public endpoint: login and health do not require a token
  if (
    (path === "/api/auth/login" && method === "POST") ||
    (path === "/api/health" && method === "GET")
  ) {
    await next();
    return;
  }

  // Extract token from Authorization header or cookie
  const authHeader = ctx.request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const cookieToken = await ctx.cookies.get("auth_token");
  const token = bearerToken ?? cookieToken;

  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Authentication required" };
    return;
  }

  try {
    const payload = await verifyJwt(token);
    ctx.state.user = {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
      groups: payload.groups,
    } as User;
  } catch {
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid or expired token" };
    return;
  }

  await next();
});

// Route registration
for (const router of routers) {
  app.use(router.routes());
  app.use(router.allowedMethods());
}

// Schedule periodic in-memory job cleanup and start server
examRuntime.scheduleDailyCleanup();

await app.listen({ port: config.server.port });
