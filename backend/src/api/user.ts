import { Router, RouterContext } from "@oak/oak";

import { HandlerResult, HttpError } from "../types/handler.ts";

import { handle, rc } from "./helpers.ts";

export function configureUserRouter(): Router {
  const router = new Router({ prefix: "/api" });

  router
    .get("/", (_) => {
      return { kind: "json", body: "API is running..." };
    })
    .get("/user", (ctx) => handle(rc(ctx), () => getUser(rc(ctx))));
  return router;
}
function getUser(
  ctx: RouterContext<string>,
): HandlerResult {
  const user = ctx.state.user;
  if (!user || !user.id) {
    throw new HttpError(401, "Not authenticated");
  }
  return {
    kind: "json",
    status: 200,
    body: { id: user.id, email: user.email, roles: user.roles },
  };
}
