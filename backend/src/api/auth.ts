import { Context } from '@hono/hono';
import {
  createRoute,
  defineOpenAPIRoute,
  OpenAPIHono,
  RouteConfig,
  z,
} from '@hono/zod-openapi';

import { authenticate } from '../services/auth.ts';
import { getOrCreateDb } from '../services/mod.ts';
import { AppEnv } from '../types/context.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { handle } from './helpers.ts';
import {
  ErrorSchema,
  GroupStubSchema,
  LoginBodySchema,
  LoginResponseSchema,
  MessageSchema,
  UserStubSchema,
} from './schemas.ts';

export function configureAuthRouter(): OpenAPIHono<AppEnv> {
  const validateRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/validate',
      tags: ['Auth'],
      summary: 'Validate',
      description: 'Validate the JWT token and do nothing else.',
      security: [],
      responses: {
        200: {
          description: 'Authentication successful',
        },
        401: {
          description: 'Authentication failed',
        },
      },
    }),
    handler: c => handle(c, () => success(c)),
  });

  const loginRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/login',
      tags: ['Auth'],
      summary: 'Authenticate',
      description:
        'Authenticate with LDAP credentials. Returns a JWT and also sets it as an HTTP-only cookie.',
      security: [],
      request: {
        body: {
          content: { 'application/json': { schema: LoginBodySchema } },
          required: true,
        },
      },
      responses: {
        200: {
          content: { 'application/json': { schema: LoginResponseSchema } },
          description: 'Authentication successful',
        },
        400: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Missing or invalid credentials',
        },
        401: {
          content: { 'application/json': { schema: ErrorSchema } },
          description: 'Authentication failed',
        },
      },
    }),
    handler: c => handle(c, () => login(c)),
  });

  const logoutRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'post',
      path: '/logout',
      tags: ['Auth'],
      summary: 'Logout',
      description: 'Noop.',
      security: [{ Bearer: [] }],
      responses: {
        200: {
          content: { 'application/json': { schema: MessageSchema } },
          description: 'Logged out successfully',
        },
      },
    }),
    handler: c => handle(c, () => logout(c)),
  });

  const entitiesRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/entities',
      tags: ['Auth'],
      summary: 'List users and groups',
      description: 'Returns stubs for all active users and configured groups.',
      security: [{ Bearer: [] }],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: z.object({
                users: z.array(UserStubSchema),
                groups: z.array(GroupStubSchema),
              }),
            },
          },
          description: 'Users and groups',
        },
      },
    }),
    handler: c => handle(c, () => getUsersAndGroups()),
  });

  // ── Router ────────────────────────────────────────────────────────────────────

  const router = new OpenAPIHono<AppEnv>();

  router.openapiRoutes([validateRoute, loginRoute, logoutRoute, entitiesRoute]);

  return router;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// The actual validation is done by middleware
function success(_: Context<AppEnv>): HandlerResult {
  return { kind: 'json', status: 200, body: null };
}

async function login(c: Context<AppEnv>): Promise<HandlerResult> {
  const body = await c.req.json();
  const { username, password } = body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'username and password are required');
  }

  let token: string;
  try {
    token = await authenticate(username, password);
  } catch (err) {
    if (Deno.env.get('NODE_ENV') === 'development') {
      throw err;
    }
    throw new HttpError(401, 'authentication unsuccessful');
  }

  return { kind: 'json', status: 200, body: { token } };
}

/**
 * This is a no-op route since 'logging out' is done by clearing the auth_token on the client side.
 */
function logout(_: Context<AppEnv>): HandlerResult {
  return { kind: 'json', status: 200, body: { message: 'Logged out' } };
}

async function getUsersAndGroups(): Promise<HandlerResult> {
  const db = await getOrCreateDb();
  const users = await db.getAllUserStubs();
  const groups = await db.getGroups();
  return { kind: 'json', status: 200, body: { users: users, groups } };
}
