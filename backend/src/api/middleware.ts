import { Context, Next } from '@hono/hono';
import { HTTPException } from '@hono/hono/http-exception';
import { jwt } from '@hono/hono/jwt';

import { AppEnv } from '../types/mod.ts';
import { getConfig } from '../config/mod.ts';
import { getOrCreateDb } from '../services/mod.ts';
import { checkUserExistsAndActive } from '../services/auth.ts';

const db = await getOrCreateDb();
const config = getConfig();

let publicRoutes: Record<string, string>[];

/**
 * Registers the given routes as public endpoints. Appends to the existing list
 * of public routes.
 *
 * @param routes - The routes to register.
 */
export function registerPublicRoutes(routes: Record<string, string>[]): void {
  publicRoutes = [...(publicRoutes ?? []), ...routes];
}

/**
 * Checks if the given path and method are marked as public.
 * Public endpoints are defined in {@link publicRoutes}.
 *
 * @param path - The request path.
 * @param method - The request method.
 * @returns `true` if the path/method is public, `false` otherwise.
 */
export function isPublic(path: string, method: string): boolean {
  return publicRoutes.some(r => r.path === path && r.method === method);
}

/**
 * Middleware that validates the JWT for non-public routes.
 * Bypasses the check for public routes using {@link isPublic}.
 * This means that public routes have no 'jwtPayload' in {@link AppEnv}.
 */
export function validateJwt(
  c: Context<AppEnv>,
  next: Next,
): Promise<void | Response> {
  if (isPublic(c.req.path, c.req.method)) {
    return next();
  }

  return jwt({
    secret: config.auth.jwt.secret,
    alg: 'HS384',
  })(c, next);
}

/**
 * Middleware that checks if the user is active. We assume this is attached to all routes so it checks whether the current url and are marked as public using {@link isPublic}.
 * Rejects requests that are not marked as active.
 */
export async function checkActive(
  c: Context<AppEnv>,
  next: Next,
): Promise<void> {
  const jwtPayload = c.get('jwtPayload');
  if (
    isPublic(c.req.path, c.req.method) ||
    (await checkUserExistsAndActive(jwtPayload.sub))
  ) {
    await next();
    return;
  } else {
    throw new HTTPException(403, { message: 'User is inactive' });
  }
}

/**
 * Middleware that checks for admin rights.
 * Rejects requests whose user is not in the admin group.
 * Assumes the JWT has already been verified but checks the groups from DB
 * since the user may have been removed from the admins group in the meantime.
 */
export async function checkAdmin(
  ctx: Context<AppEnv>,
  next: Next,
): Promise<void | Response> {
  const user = ctx.get('jwtPayload')!;
  if (!user) {
    console.warn('Admin Check: No JWT payload, something is wrong.');
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }

  const userFromDB = (await db.getUsers([user!.sub]))[0];

  const adminGroups = getConfig().auth.ldap.groups.admin;
  if (userFromDB.groups.filter(g => adminGroups.includes(g)).length === 0) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  return await next();
}

/**
 * Middleware that guards routes with direct content access (exam, tasks).
 * Rejects requests whose user is not in the admin group.
 * Assumes the JWT has already been verified but checks the groups from DB
 * since the user may have been removed from the admins group in the meantime.
 */
export async function checkAccess(
  ctx: Context<AppEnv>,
  next: Next,
): Promise<void | Response> {
  const user = ctx.get('jwtPayload');
  if (!user) {
    console.warn('Access Check: No JWT payload, something is wrong.');
    throw new HTTPException(500, { message: 'Internal Server Error' });
  }

  const groups = getConfig().auth.ldap.groups.admin.concat(
    getConfig().auth.ldap.groups.full,
  );
  if (user.groups.filter(g => groups.includes(g)).length === 0) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  return await next();
}
