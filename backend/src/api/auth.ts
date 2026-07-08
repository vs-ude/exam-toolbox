import { Context } from '@hono/hono';
import { deleteCookie, setCookie } from '@hono/hono/cookie';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { authenticate, syncLdapUsers } from '../services/auth.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { AppEnv } from '../types/context.ts';
import { handle } from './helpers.ts';
import { getOrCreateDb } from '../services/db.ts';
import { getConfig } from '../config/mod.ts';
import {
  ErrorSchema,
  GroupSchema,
  LoginBodySchema,
  LoginResponseSchema,
  MessageSchema,
  UserSchema,
} from './schemas.ts';

const config = getConfig();

// ── Route definitions ─────────────────────────────────────────────────────────
const validateRoute = createRoute({
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
});

const loginRoute = createRoute({
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
});

const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Auth'],
  summary: 'Logout',
  description: 'Clears the authentication cookie.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: MessageSchema } },
      description: 'Logged out successfully',
    },
  },
});

const entitiesRoute = createRoute({
  method: 'get',
  path: '/entities',
  tags: ['Auth'],
  summary: 'List users and groups',
  description:
    'Synchronises LDAP users to the database and returns all user UIDs and configured groups.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            uids: z.array(z.string()),
            groups: z.array(GroupSchema),
          }),
        },
      },
      description: 'Users and groups',
    },
  },
});

const usersRoute = createRoute({
  method: 'get',
  path: '/users',
  tags: ['Auth'],
  summary: 'Resolve user objects',
  description:
    'Returns full user objects for a list of UIDs supplied as repeated query params.',
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
});

// ── Router ────────────────────────────────────────────────────────────────────

export function configureAuthRouter(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(validateRoute, c => handle(c, () => success(c)));
  router.openapi(loginRoute, c => handle(c, () => login(c)));
  router.openapi(logoutRoute, c => handle(c, () => logout(c)));
  router.openapi(entitiesRoute, c => handle(c, () => getUsersAndGroups()));
  router.openapi(usersRoute, c => handle(c, () => getUserObjects(c)));

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
  const uids = await syncLdapUsers();
  const db = await getOrCreateDb();
  const groups = await db.getGroups();
  return { kind: 'json', status: 200, body: { uids, groups } };
}

async function getUserObjects(c: Context<AppEnv>): Promise<HandlerResult> {
  const uids = c.req.queries('uids') ?? [];
  if (uids.length < 1) {
    throw new HttpError(400, 'uids must be a non-empty query parameter list');
  }
  const db = await getOrCreateDb();
  const resolvedUsers = await db.getUsers(uids);
  return { kind: 'json', status: 200, body: { users: resolvedUsers } };
}
