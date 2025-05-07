import Koa, { HttpError } from 'koa';
import logger from 'koa-logger';
import Router from 'koa-router';

import { dynamicJwtMiddleware } from './middleware/jwt.middleware';
import { tokenToHeaders } from './token-to-headers';
import { tokenMiddleware } from './middleware/token.middleware';
import { issuerMiddleware } from './middleware/issuer.middleware';
import { ENVIRONMENT, HEADER_PREFIX, LOG_REQUESTS, PORT, READ_SA_TOKEN, ADMIN_SA_TOKEN } from './constants';
import { Issuer } from 'openid-client';
import { getUserInfo } from './userInfo';

type TokenData = Record<string, unknown>;

const authByCookie = process.env.AUTH_BY_COOKIE === 'true';
const authByHeader = process.env.AUTH_BY_HEADER === 'true';
const authCookie = process.env.AUTH_COOKIE ? process.env.AUTH_COOKIE : "";
const authHeader = process.env.AUTH_HEADER ? process.env.AUTH_HEADER : "";

if ((authByCookie && authByHeader) || (!authByCookie && !authByHeader)) {
  throw new Error("Invalid configuration: You must set exactly one of AUTH_BY_COOKIE or AUTH_BY_HEADER to 'true'");
} 

if (authByCookie) {
  if (authCookie == "") {
    throw new Error("Invalid configuration: If AUTH_BY_COOKIE is set, AUTH_COOKIE must be set with the name of the cookie containing the JWT.");
  }
}

if (authByHeader) {
  if (authHeader == "") {
    throw new Error("Invalid configuration: If AUTH_BY_HEADER is set, AUTH_HEADER must be set with the name of the header containing the JWT.");
  }
} 

if (READ_SA_TOKEN == "" || ADMIN_SA_TOKEN == "") {
  throw new Error("Invalid configuration: Both READ_SA_TOKEN and ADMIN_SA_TOKEN must not be empty.")
}

const app = new Koa();
const router = new Router();

(async () => {
  console.group('💥 Initializing... 🚀');

  console.log('Header prefix:', HEADER_PREFIX);

  if (LOG_REQUESTS) {
    app.use(logger());
  }

  // Main authentication route.
  router.get(
    '/',
    tokenMiddleware(),
    issuerMiddleware(),
    dynamicJwtMiddleware(),
    (ctx: Koa.ParameterizedContext<{ user: TokenData | undefined; token: string }>) => {
      console.log("After middleware");
      console.log(ctx.host); 
      ctx.body = '';
      const { token, user } = ctx.state;

      if (user) {
        ctx.set(tokenToHeaders(user, { headerPrefix: HEADER_PREFIX }, ctx.host));
        const encodedToken = encodeURIComponent(Buffer.from(token).toString('base64'));
        ctx.set(`${HEADER_PREFIX}UserInfo`, `${ctx.origin}/userinfo/${encodedToken}`);
      }
    },
  );

  router.get(
    '/userinfo/:encodedToken',
    async (ctx: Koa.ParameterizedContext<{ token: string }>, next) => {
      const encodedToken = ctx.params.encodedToken;
      const token = Buffer.from(encodedToken, 'base64').toString('utf-8');
      ctx.state.token = token;
      await next();
    },
    issuerMiddleware(),
    async (ctx: Koa.ParameterizedContext<{ issuer: Issuer; token: string }>, next) => {
      const { issuer, token } = ctx.state;

      if (!issuer) {
        ctx.throw(401, 'Issuer not found');
      }

      const userInfo = await getUserInfo({ url: issuer.metadata.userinfo_endpoint, token });

      ctx.body = userInfo;
    },
  );

  // Health check.
  router.get('/_health', (ctx) => {
    ctx.body = 'OK';
  });

  app.use(router.middleware());

  app.on('error', (err, ctx) => {
    if (err instanceof HttpError && err.status === 401) {
      return;
    }

    console.error(err);
  });

  console.groupEnd();

  app.listen(PORT, () => {
    console.log(`🚀 Listening on ${PORT}`);
  });
})();
