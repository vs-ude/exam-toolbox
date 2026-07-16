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
import { getOrCreateDb } from '../services/mod.ts';
import { AppEnv } from '../types/context.ts';
import { HandlerResult } from '../types/handler.ts';
import { handle } from './helpers.ts';
import { checkAdmin } from './middleware.ts';
import { ErrorSchema, UserSchema } from './schemas.ts';

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

  const router = new OpenAPIHono<AppEnv>();

  router.openapiRoutes([configRoute, syncUsersRoute, usersRoute]);

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
