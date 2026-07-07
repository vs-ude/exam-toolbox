import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

import { getOrCreateDb } from "../services/db.ts";
import { testLDAPConnection } from "../services/auth.ts";
import { HandlerResult } from "../types/handler.ts";
import { AppEnv } from "../types/context.ts";
import { handle } from "./helpers.ts";
import { ErrorSchema, HealthSchema } from "./schemas.ts";

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  description:
    "Returns the operational status of backend dependencies (database and LDAP).",
  security: [],
  responses: {
    200: {
      content: { "application/json": { schema: HealthSchema } },
      description: "All dependencies are healthy",
    },
    500: {
      content: {
        "application/json": {
          schema: HealthSchema.and(
            z.object({ message: z.string().optional() }),
          ),
        },
      },
      description: "One or more dependencies are unavailable",
    },
  },
});

export function configureBaseRouter(): OpenAPIHono<AppEnv> {
  const router = new OpenAPIHono<AppEnv>();

  router.openapi(healthRoute, (c) => handle(c, () => healthCheck()));
  // (non-chained to preserve OpenAPIHono type)

  return router;
}

async function healthCheck(): Promise<HandlerResult> {
  const result = { db: true, ldap: true };
  let code = 200;
  try {
    (await getOrCreateDb()).test();
  } catch {
    result.db = false;
    code = 500;
  }
  try {
    await testLDAPConnection();
  } catch {
    result.ldap = false;
    code = 500;
  }
  return { kind: "json", status: code, body: result };
}

// Keep ErrorSchema accessible from this module for other routers
export { ErrorSchema };
