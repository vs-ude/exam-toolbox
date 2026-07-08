import {
  OpenAPIGeneratorConfigure,
  OpenAPIHono,
  OpenAPIObjectConfigure,
} from '@hono/zod-openapi';
import { cors } from '@hono/hono/cors';
import { jwt } from '@hono/hono/jwt';

import {
  configureAdminRouter,
  configureAuthRouter,
  configureBaseRouter,
  configureExamManagerRouter,
} from './src/api/mod.ts';
import { getConfig, QRConfig } from './src/config/mod.ts';
import { AppEnv } from './src/types/context.ts';
import { createExamManagerRuntime } from './src/examManager/mod.ts';
import {
  checkUserExists,
  setupConfiguredGroups,
  waitForLdapConnection,
} from './src/services/auth.ts';
import { getOrCreateDb } from './src/services/db.ts';
import { parseLogFileForSubtaskInfo } from './src/services/mod.ts';
import { preGeneratePageQRCache } from './src/services/qr.ts';
import { Context, Next } from '@hono/hono';
import { createMiddleware } from '@hono/hono/factory';

const config = getConfig();
console.debug('Config loaded', config);
const db = await getOrCreateDb();
try {
  await waitForLdapConnection(10);
  await setupConfiguredGroups();
} catch (e) {
  console.error('Failed during LDAP setup:', e);
  Deno.exit(1);
}

// Create exam manager runtime (generation queue, workers, finalization, cleanup)
const examRuntime = createExamManagerRuntime(
  {
    basePath: config.paths.templateBase,
    jobsDir: config.paths.jobsDir,
    workerModulePath: './worker.ts',
  },
  { db },
);

await Deno.mkdir(examRuntime.jobsDir, { recursive: true });
preGeneratePageQRCache(QRConfig.minStudents, QRConfig.minPages);

// Build the typed route tree (split to avoid TS instantiation-depth limits)
const routesA = new OpenAPIHono<AppEnv>()
  .route('/api/admin', configureAdminRouter())
  .route('/api/auth', configureAuthRouter());

const routesB = routesA.route('/api', configureBaseRouter()).route(
  '/api',
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

// Export the fully-typed app for client SDK generation
export type AppType = typeof routesB;

// Create the live app and layer middleware on top of routes
const app = new OpenAPIHono<AppEnv>();

// Core middleware: CORS
app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Authentication middleware: public endpoints bypass JWT verification
app.use((c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  if (
    (path === '/api/auth/login' && method === 'POST') ||
    (path === '/api/health' && method === 'GET') ||
    (path === '/api/doc' && method === 'GET') ||
    (path === '/api/doc/ui' && method === 'GET')
  ) {
    return next();
  }

  return jwt({
    secret: config.auth.jwt.secret,
    alg: 'HS384',
  })(c, next);
});

// Authentication middleware: reject if the user is no longer active even though the JWT is valid
// TODO we should probably find a way to not call LDAP on each request and still be safe
app.use(
  createMiddleware(async (c: Context<AppEnv>, next: Next): Promise<void> => {
    const jwtPayload = c.get('jwtPayload');
    if (jwtPayload === undefined || (await checkUserExists(jwtPayload.sub))) {
      await next();
      return;
    } else {
      c.json({ error: 'User inactive' }, 403);
      return;
    }
  }),
);

// Mount all routes
app.route('/', routesB);

// OpenAPI spec + Swagger UI (only when NODE_ENV=development)
if (Deno.env.get('NODE_ENV') === 'development') {
  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    name: 'Authorization',
    in: 'header',
    description:
      'JWT obtained from POST /api/auth/login. Can also be supplied as the `auth_token` cookie.',
  });
  const apidoc: OpenAPIObjectConfigure<AppEnv, string> = {
    openapi: '3.1.0',
    info: {
      title: 'Exam Toolbox API',
      version: '0.2.0',
      description: 'WIP API for the exam toolbox',
    },
    tags: [
      { name: 'System', description: 'Health and operational endpoints' },
      { name: 'Auth', description: 'Authentication and user management' },
      { name: 'Admin', description: 'Admin-only configuration endpoints' },
      { name: 'Exams', description: 'Exam CRUD and search' },
      { name: 'Tasks', description: 'Task pool management' },
      { name: 'Tags', description: 'Tag management' },
      { name: 'Jobs', description: 'Bulk exam generation jobs' },
      { name: 'Files', description: 'File upload and download' },
    ],
    servers: [
      {
        url: `${config.server.publicUrl}`,
        description: 'Current environment',
      },
    ],
  };
  const generator: OpenAPIGeneratorConfigure<AppEnv, string> = {
    unionPreferredType: 'oneOf',
  };
  app.doc('/api/doc', apidoc, generator);

  console.log(`API docs available at ${config.server.publicUrl}/api/doc`);
  // app.getOpenAPI31Document(apidoc, generator);
}

// Schedule periodic in-memory job cleanup and start server
examRuntime.scheduleDailyCleanup();

Deno.serve({ port: config.server.port }, app.fetch);
