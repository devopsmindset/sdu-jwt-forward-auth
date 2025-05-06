import { Middleware } from 'koa';
import jwt from 'koa-jwt';

import { Issuer } from 'openid-client';
import { jwksSecret } from '../jwks-secret';
import { JWT_ALGOS, REQUIRE_AUDIENCE, AUTH_BY_HEADER, AUTH_HEADER, AUTH_BY_COOKIE, AUTH_COOKIE } from '../constants';

/**
 * Generate dynamic middleware for multiple backend OIDC IDPs.
 */
export function dynamicJwtMiddleware(): Middleware<{
  token: string | undefined;
  issuer: Issuer | undefined;
}> {
  console.log('Algorithms:', JWT_ALGOS.join(', '));
  console.log("JWT MIDDLEWARE");

  if (REQUIRE_AUDIENCE) {
    console.log('Required audience:', REQUIRE_AUDIENCE);
  }

  const jwtMiddlewares: Record<string, jwt.Middleware> = {};

  return async (ctx, next) => {
    const { issuer } = ctx.state;

    if (!issuer) {
      await next();
      return;
    }

    if (!jwtMiddlewares[issuer.metadata.issuer]) {
      const jwtOptions: Partial<jwt.Options> = {
        secret: jwksSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 1,
          jwksUri: issuer.metadata.jwks_uri,
          algorithms: JWT_ALGOS,
        }),
        algorithms: JWT_ALGOS,
        getToken: (ctx) => {
          return ctx.state.token;
        }, 
      };

      if (REQUIRE_AUDIENCE) {
        jwtOptions.audience = REQUIRE_AUDIENCE;
      }

      jwtMiddlewares[issuer.metadata.issuer] = jwt(jwtOptions as jwt.Options);
    }

    console.log("END JWT");
    await jwtMiddlewares[issuer.metadata.issuer](ctx, next);
  };
}
