import { Context, Input, Next } from '@hono/hono';
import type { ContentfulStatusCode } from '@hono/hono/utils/http-status';
import { HTTPException } from '@hono/hono/http-exception';

import { AppEnv } from '../types/context.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';
import { getConfig } from '../config/mod.ts';
import { getOrCreateDb } from '../services/mod.ts';

const db = await getOrCreateDb();

export async function handle<
  E extends AppEnv = AppEnv,
  P extends string = string,
  I extends Input = Input,
>(
  c: Context<E, P, I>,
  fn: () => HandlerResult | Promise<HandlerResult>,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  try {
    const result = await fn();
    if (result.kind === 'json') {
      return c.json(
        result.body,
        (result.status ?? 200) as ContentfulStatusCode,
      );
    } else {
      const headers = new Headers({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      });
      if (result.extraHeaders) {
        for (const [k, v] of Object.entries(result.extraHeaders)) {
          headers.set(k, v);
        }
      }
      return new Response(result.content as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }
  } catch (e) {
    if (e instanceof HttpError) {
      return c.json(
        e.body ?? { message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    return c.json(
      { message: 'Internal server error', error: String(e) },
      500 as ContentfulStatusCode,
    );
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
  const userFromDB = (await db.getUsers([ctx.get('jwtPayload').sub]))[0];

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
  const userFromDB = (await db.getUsers([ctx.get('jwtPayload').sub]))[0];

  const groups = getConfig().auth.ldap.groups.admin.concat(
    getConfig().auth.ldap.groups.full,
  );
  if (userFromDB.groups.filter(g => groups.includes(g)).length === 0) {
    throw new HTTPException(403, { message: 'Forbidden' });
  }

  return await next();
}
