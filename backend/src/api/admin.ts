import { Context, Hono, Next } from "@hono/hono";

import { HandlerResult } from "../types/handler.ts";
import { AppEnv } from "../types/context.ts";
import { getConfig } from "../config/mod.ts";
import { getOrCreateDb } from "../services/db.ts";

import { handle } from "./helpers.ts";

const db = await getOrCreateDb();

export function configureAdminRouter(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.use("/*", checkAdmin);
  router.get("/config", (c) => handle(c, () => conf()));

  return router;
}

function conf(): HandlerResult {
  return { kind: "json", status: 200, body: getConfig() };
}

/**
 * Middleware that guards routes under /api/admin.
 * Rejects requests whose user is not in the admin group.
 * Assumes the JWT has already been verified but checks the groups from DB
 * since the user may have been removed from the admins group in the meantime.
 */
async function checkAdmin(
  ctx: Context<AppEnv>,
  next: Next,
): Promise<void | Response> {
  const userFromDB = (await db.getUsers([ctx.get("jwtPayload").sub]))[0];

  const adminGroups = getConfig().auth.ldap.groups.admin;
  if (userFromDB.groups.filter((g) => adminGroups.includes(g)).length === 0) {
    return ctx.json({ message: "Unauthorized" }, 401);
  }

  await next();
}
