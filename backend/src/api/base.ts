import { Hono } from "@hono/hono";

import { getOrCreateDb } from "../services/db.ts";
import { testLDAPConnection } from "../services/auth.ts";
import { HandlerResult } from "../types/handler.ts";
import { AppEnv } from "../types/context.ts";
import { handle } from "./helpers.ts";

export function configureBaseRouter(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.get("/health", (c) => handle(c, () => healthCheck()));

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
