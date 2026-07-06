import { Context, Hono } from "@hono/hono";
import { deleteCookie, setCookie } from "@hono/hono/cookie";

import { authenticate, syncLdapUsers } from "../services/auth.ts";
import { HandlerResult, HttpError } from "../types/handler.ts";
import { AppEnv } from "../types/context.ts";
import { handle } from "./helpers.ts";
import { getOrCreateDb } from "../services/db.ts";
import { getConfig } from "../config/mod.ts";

const config = getConfig();

export function configureAuthRouter(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router
    .post("/login", (c) => handle(c, () => login(c)))
    .post("/logout", (c) => handle(c, () => logout(c)))
    .get("/entities", (c) => handle(c, () => getUsersAndGroups()))
    .get("/users", (c) => handle(c, () => getUserObjects(c)));

  return router;
}

async function login(c: Context<AppEnv>): Promise<HandlerResult> {
  const body = await c.req.json();
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
  setCookie(c, "auth_token", token, {
    httpOnly: !config.server.https,
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
  });

  return {
    kind: "json",
    status: 200,
    body: { token },
  };
}

function logout(c: Context<AppEnv>): HandlerResult {
  deleteCookie(c, "auth_token");
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
  c: Context<AppEnv>,
): Promise<HandlerResult> {
  const uids = c.req.queries("uids") ?? [];
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
