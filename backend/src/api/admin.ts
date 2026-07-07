import { Context, Next } from "@hono/hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { HandlerResult } from "../types/handler.ts";
import { AppEnv } from "../types/context.ts";
import { getConfig } from "../config/mod.ts";
import { getOrCreateDb } from "../services/db.ts";
import { handle } from "./helpers.ts";

const db = await getOrCreateDb();

// ── Route definitions ─────────────────────────────────────────────────────────

const configRoute = createRoute({
  method: "get",
  path: "/config",
  tags: ["Admin"],
  summary: "Get server configuration",
  description:
    "Returns the current runtime configuration. Restricted to users in the admin group.",
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        "application/json": { schema: z.record(z.string(), z.unknown()) },
      },
      description: "Current server configuration",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "Not authorised (not an admin)",
    },
  },
});

// ── Router ────────────────────────────────────────────────────────────────────

export function configureAdminRouter(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  // Middleware must be registered before the openapi route
  router.use("/*", checkAdmin);
  router.openapi(configRoute, (c) => handle(c, () => conf()));

  return router;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

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
    return ctx.json({ message: "Forbidden" }, 403);
  }

  await next();
}
