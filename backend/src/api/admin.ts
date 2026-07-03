import { Context, Next, Router } from "@oak/oak";

import { HandlerResult } from "../types/handler.ts";
import { getConfig } from "../config/mod.ts";
import { getOrCreateDb } from "../services/db.ts";

import { handle, rc } from "./helpers.ts";

const db = await getOrCreateDb();

export function configureAdminRouter(): Router {
  const router = new Router({ prefix: "/api/admin" });

  router.use(checkAdmin);
  router
    .get("/config", (ctx) => handle(rc(ctx), () => conf()));
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
async function checkAdmin(ctx: Context, next: Next): Promise<void> {
  const userFromDB = (await db.getUsers([ctx.state.user.uid]))[0];

  const adminGroups = getConfig().auth.ldap.groups.admin;
  console.debug(
    `Comparing user groups: ${userFromDB.groups} vs ${adminGroups}`,
  );
  if (userFromDB.groups.filter((g) => adminGroups.includes(g)).length === 0) {
    ctx.response.status = 401;
    ctx.response.body = { message: "Unauthorized" };
    return;
  }

  await next();
}
