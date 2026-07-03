import { Router, RouterContext } from "@oak/oak";

import { authenticate, syncLdapUsers } from "../services/auth.ts";
import { HandlerResult, HttpError } from "../types/handler.ts";
import { handle, rc } from "./helpers.ts";
import { getOrCreateDb } from "../services/db.ts";
import { getConfig } from "../config/mod.ts";

const config = getConfig();

export function configureAuthRouter(): Router {
  const router = new Router({ prefix: "/api/auth" });

  router
    .post("/login", (ctx) => handle(rc(ctx), () => login(rc(ctx))))
    .post("/logout", (ctx) => handle(rc(ctx), () => logout(rc(ctx))))
    .get("/entities", (ctx) => handle(rc(ctx), () => getUsersAndGroups()))
    .get("/users", (ctx) => handle(rc(ctx), () => getUserObjects(rc(ctx))));

  return router;
}

async function login(ctx: RouterContext<string>): Promise<HandlerResult> {
  const body = await ctx.request.body.json();
  const { username, password } = body ?? {};

  if (typeof username !== "string" || typeof password !== "string") {
    throw new HttpError(400, "username and password are required");
  }

  let token: string;
  try {
    token = await authenticate(username, password);
  } catch (err) {
    console.log(err);
    throw new HttpError(401, "error during authentication");
  }

  // Set token as HTTP-only cookie for browser clients
  ctx.cookies.set("auth_token", token, {
    httpOnly: !config.server.https,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
  });

  return {
    kind: "json",
    status: 200,
    body: { token },
  };
}

function logout(ctx: RouterContext<string>): HandlerResult {
  ctx.cookies.delete("auth_token");
  return { kind: "json", status: 200, body: { message: "Logged out" } };
}

/**
 * Returns the list of all users and their groups.
 * For users it only returns the uids.
 */
async function getUsersAndGroups(): Promise<HandlerResult> {
  const uids = await syncLdapUsers();
  const db = await getOrCreateDb();
  const groups = await db.getGroups();
  return {
    kind: "json",
    status: 200,
    body: { uids, groups },
  };
}

/**
 * Returns the complete user objects for the given uids.
 */
async function getUserObjects(
  ctx: RouterContext<string>,
): Promise<HandlerResult> {
  const uids = ctx.request.url.searchParams.getAll("uids");
  console.debug("uids", uids);

  if (uids.length < 1) {
    throw new HttpError(400, "uids must be a non-empty query parameter list");
  }

  const db = await getOrCreateDb();
  const resolvedUsers = await db.getUsers(uids);
  return {
    kind: "json",
    status: 200,
    body: { users: resolvedUsers },
  };
}
