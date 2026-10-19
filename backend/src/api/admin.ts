import { Context } from '@hono/hono';
import {
  createRoute,
  defineOpenAPIRoute,
  OpenAPIHono,
  RouteConfig,
  z,
} from '@hono/zod-openapi';

import { getConfig, type AppConfig } from '../config/mod.ts';
import { syncLdapUsers } from '../services/auth.ts';
import { AdminExamSortDir, AdminExamSortField } from '../services/db/exam.ts';
import { getOrCreateDb } from '../services/mod.ts';
import { AppEnv } from '../types/context.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { handle } from './helpers.ts';
import { checkAdmin } from './middleware.ts';
import {
  AdminExamStubSchema,
  ErrorSchema,
  ExamAccessSchema,
  MessageSchema,
  UserSchema,
} from './schemas.ts';

// ── Route definitions ─────────────────────────────────────────────────────────

export function configureAdminRouter(): OpenAPIHono<AppEnv> {
  const configRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/config',
      tags: ['Admin'],
      summary: 'Get server configuration',
      description:
        'Returns the current runtime configuration. Restricted to users in the admin group.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      responses: {
        200: {
          content: {
            'application/json': { schema: z.record(z.string(), z.unknown()) },
          },
          description: 'Current server configuration',
        },
        403: {
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
          description: 'Not authorised (not an admin)',
        },
      },
    }),
    handler: c => handle(c, () => conf()),
  });

  const syncUsersRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/syncUsers',
      tags: ['Admin'],
      summary: 'Sync LDAP users',
      description:
        'Syncs LDAP users with the local database. Restricted to users in the admin group.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      responses: {
        200: {
          content: {
            'application/json': { schema: z.array(z.string()) },
          },
          description: 'LDAP users synced successfully',
        },
        403: {
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
          description: 'Not authorised (not an admin)',
        },
      },
    }),
    handler: c => handle(c, () => syncUsers(c)),
  });

  const usersRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/users',
      tags: ['Admin'],
      summary: 'Resolve user objects',
      description:
        'Returns full user objects for a list of UIDs supplied as repeated query params.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      request: {
        query: z.object({
          uids: z.union([z.string(), z.array(z.string())]).openapi({
            description: 'One or more user UIDs to resolve',
          }),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({ users: z.array(UserSchema) }),
            },
          },
          description: 'Resolved user objects',
        },
        400: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'No UIDs provided',
        },
      },
    }),
    handler: c => handle(c, () => getUserObjects(c)),
  });

  const adminExamsRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/exams',
      tags: ['Admin'],
      summary: 'List all exams',
      description:
        'Returns lightweight stubs for every exam in the database, regardless of access lists. Optional `sort` (`date`, `owner` or `taskCount`) and `dir` (`asc`/`desc`) query params control the ordering.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      request: {
        query: z.object({
          sort: z
            .enum(['date', 'owner', 'taskCount'])
            .optional()
            .openapi({ description: 'Field to sort by' }),
          dir: z
            .enum(['asc', 'desc'])
            .optional()
            .openapi({ description: 'Sort direction' }),
        }),
      },
      responses: {
        200: {
          content: {
            'application/json': { schema: z.array(AdminExamStubSchema) },
          },
          description: 'All exams',
        },
        403: {
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
          description: 'Not authorised (not an admin)',
        },
      },
    }),
    handler: c => handle(c, () => getAdminExams(c)),
  });

  const deleteAdminExamRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'delete',
      path: '/exams/{examId}',
      tags: ['Admin'],
      summary: 'Delete exam',
      description:
        'Deletes any exam by ID, without access filtering. Restricted to users in the admin group.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      request: {
        params: z.object({
          examId: z.string().openapi({
            param: { name: 'examId', in: 'path' },
          }),
        }),
      },
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Deleted',
        },
        403: {
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
          description: 'Not authorised (not an admin)',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => deleteAdminExam(c)),
  });

  const setAdminExamAccessRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'put',
      path: '/exams/{examId}/access',
      tags: ['Admin'],
      summary: 'Set exam access',
      description:
        'Replaces the `access` field of any exam, without ownership checks. Restricted to users in the admin group.',
      middleware: [checkAdmin],
      security: [{ Bearer: [] }],
      request: {
        params: z.object({
          examId: z.string().openapi({
            param: { name: 'examId', in: 'path' },
          }),
        }),
        body: {
          content: { 'application/json': { schema: ExamAccessSchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: ExamAccessSchema } },
          description: 'Updated access list',
        },
        403: {
          content: {
            'application/json': {
              schema: z.object({ message: z.string() }),
            },
          },
          description: 'Not authorised (not an admin)',
        },
        404: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Not found',
        },
      },
    }),
    handler: c => handle(c, () => setAdminExamAccess(c)),
  });

  const router = new OpenAPIHono<AppEnv>();

  router.openapiRoutes([
    configRoute,
    syncUsersRoute,
    usersRoute,
    adminExamsRoute,
    deleteAdminExamRoute,
    setAdminExamAccessRoute,
  ]);

  return router;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function conf(): HandlerResult {
  // deep copy config
  const config = JSON.parse(JSON.stringify(getConfig())) as AppConfig;
  config.auth.ldap.bindPassword = '<redacted>';
  config.auth.jwt.secret = '<redacted>';
  return { kind: 'json', status: 200, body: config };
}

async function syncUsers(_: Context<AppEnv>): Promise<HandlerResult> {
  const users = await syncLdapUsers();
  return { kind: 'json', status: 200, body: users };
}

async function getUserObjects(c: Context<AppEnv>): Promise<HandlerResult> {
  const uids = c.req.queries('uids') ?? [];
  if (uids.length < 1) {
    return {
      kind: 'json',
      status: 400,
      body: { error: 'uids must be a non-empty query parameter list' },
    };
  }
  const db = await getOrCreateDb();
  const resolvedUsers = await db.getUsers(uids);
  return { kind: 'json', status: 200, body: { users: resolvedUsers } };
}

async function getAdminExams(c: Context<AppEnv>): Promise<HandlerResult> {
  const sort = c.req.query('sort') as AdminExamSortField | undefined;
  const dir = (c.req.query('dir') ?? 'asc') as AdminExamSortDir;
  const db = await getOrCreateDb();
  const exams = await db.getAllExamsAdmin(sort, dir);
  return { kind: 'json', status: 200, body: exams };
}

async function deleteAdminExam(c: Context<AppEnv>): Promise<HandlerResult> {
  const id = c.req.param('examId');
  if (!id) {
    throw new HttpError(400, 'Exam ID is required');
  }
  const db = await getOrCreateDb();
  const result = await db.deleteExamAdmin(id);
  if (result === 0) {
    throw new HttpError(404, 'Exam not found');
  }
  console.log(`Exam ${id} deleted (admin).`);
  return {
    kind: 'json',
    status: 200,
    body: { message: 'Exam deleted successfully' },
  };
}

async function setAdminExamAccess(c: Context<AppEnv>): Promise<HandlerResult> {
  const id = c.req.param('examId');
  if (!id) {
    throw new HttpError(400, 'Exam ID is required');
  }
  const access = await c.req.json();
  const db = await getOrCreateDb();
  await db.setExamAccess(id, access);
  return { kind: 'json', status: 200, body: access };
}
