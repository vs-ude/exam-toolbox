import { Router } from "@oak/oak";

import { getOrCreateDb } from "../services/db.ts";
import { testLDAPConnection } from "../services/auth.ts";
import { HandlerResult } from "../types/handler.ts";
import { handle, rc } from "./helpers.ts";

export function configureBaseRouter(): Router {
  const router = new Router({ prefix: "/api" });

  router
    .get("/health", (ctx) => handle(rc(ctx), () => healthCheck()));
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
