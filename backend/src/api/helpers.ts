import { Context, Input } from '@hono/hono';
import type { ContentfulStatusCode } from '@hono/hono/utils/http-status';

import { AppEnv } from '../types/context.ts';
import { HandlerResult, HttpError } from '../types/handler.ts';

export async function handle<
  E extends AppEnv = AppEnv,
  P extends string = string,
  I extends Input = Input,
>(
  c: Context<E, P, I>,
  fn: () => HandlerResult | Promise<HandlerResult>,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  try {
    const result = await fn();
    if (result.kind === 'json') {
      return c.json(
        result.body,
        (result.status ?? 200) as ContentfulStatusCode,
      );
    } else {
      const headers = new Headers({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      });
      if (result.extraHeaders) {
        for (const [k, v] of Object.entries(result.extraHeaders)) {
          headers.set(k, v);
        }
      }
      return new Response(result.content as unknown as BodyInit, {
        status: 200,
        headers,
      });
    }
  } catch (e) {
    if (e instanceof HttpError) {
      return c.json(
        e.body ?? { message: e.message },
        e.status as ContentfulStatusCode,
      );
    }
    return c.json(
      { message: 'Internal server error', error: String(e) },
      500 as ContentfulStatusCode,
    );
  }
}
