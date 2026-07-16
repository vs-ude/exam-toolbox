import {
  createRoute,
  defineOpenAPIRoute,
  OpenAPIHono,
  RouteConfig,
  z,
} from '@hono/zod-openapi';

import { testLDAPConnection } from '../services/auth.ts';
import { getOrCreateDb } from '../services/mod.ts';
import { AppEnv } from '../types/context.ts';
import { HandlerResult } from '../types/handler.ts';
import { handle } from './helpers.ts';
import { ErrorSchema, HealthSchema } from './schemas.ts';

export function configureBaseRouter(): OpenAPIHono<AppEnv> {
  const healthRoute = defineOpenAPIRoute<RouteConfig, AppEnv>({
    route: createRoute({
      method: 'get',
      path: '/health',
      tags: ['System'],
      summary: 'Health check',
      description:
        'Returns the operational status of backend dependencies (database and LDAP).',
      security: [],
      responses: {
        200: {
          content: { 'application/json': { schema: HealthSchema } },
          description: 'All dependencies are healthy',
        },
        500: {
          content: {
            'application/json': {
              schema: HealthSchema.and(
                z.object({ message: z.string().optional() }),
              ),
            },
          },
          description: 'One or more dependencies are unavailable',
        },
      },
    }),
    handler: c => handle(c, () => healthCheck()),
  });

  const router = new OpenAPIHono<AppEnv>();

  router.openapiRoutes([healthRoute]);

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
  return { kind: 'json', status: code, body: result };
}

// Keep ErrorSchema accessible from this module for other routers
export { ErrorSchema };
