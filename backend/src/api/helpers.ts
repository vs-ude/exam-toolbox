import { RouterContext } from "@oak/oak";

import { HandlerResult, HttpError } from "../types/handler.ts";

// Cast a narrowly-typed route context to the generic RouterContext<string>
// used by our handler functions. This is safe because the handlers only
// read ctx.params, ctx.request, and ctx.state — all of which are present.
export function rc(ctx: unknown): RouterContext<string> {
  return ctx as RouterContext<string>;
}

export async function handle(
  ctx: RouterContext<string>,
  fn: () => HandlerResult | Promise<HandlerResult>,
): Promise<void> {
  try {
    const result = await fn();
    if (result.kind === "json") {
      ctx.response.status = result.status ?? 200;
      // deno-lint-ignore no-explicit-any
      ctx.response.body = result.body as any;
    } else {
      ctx.response.headers.set("Content-Type", result.contentType);
      ctx.response.headers.set(
        "Content-Disposition",
        `attachment; filename="${result.fileName}"`,
      );
      if (result.extraHeaders) {
        for (const [k, v] of Object.entries(result.extraHeaders)) {
          ctx.response.headers.set(k, v);
        }
      }
      ctx.response.body = result.content;
    }
  } catch (e) {
    if (e instanceof HttpError) {
      ctx.response.status = e.status;
      ctx.response.body = e.body ?? { message: e.message };
    } else {
      ctx.response.status = 500;
      ctx.response.body = { message: "Internal server error", error: e };
    }
  }
}
