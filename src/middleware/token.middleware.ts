import { boolean } from 'boolean';
import { REQUIRE_TOKEN, AUTH_BY_HEADER, AUTH_HEADER, AUTH_BY_COOKIE, AUTH_COOKIE } from '../constants';
import { DefaultContext, Middleware } from 'koa';

function getTokenFromContext(ctx: DefaultContext): string | null {
  let token: null | string = null;
  if (AUTH_BY_HEADER) {
    const authHeader = ctx.headers[AUTH_HEADER.toLowerCase()]; 
    if (authHeader) {
      if (AUTH_HEADER.toLowerCase() == "authorization") {
        // If the header to look for is "Authorization" we need to 
        // stirp the "Bearer " to get the JWT 
        const match = authHeader.match(/^Bearer[ ]+(.*)$/);
        if (match) {
          token = match[1];
        }
      } else {
        // Otherwise we just get the value for the chosen header 
        token = authHeader;
      }
    }
    if (!token) throw new Error('Header ${AUTH_HEADER} not found.'); 
  } else {
    // Implicit: the JWT comes from a COOKIE instead of a HEADER
    token = ctx.cookies.get(AUTH_COOKIE);
    console.log("Retrieved token")
    console.log(token) 
    if (!token) throw new Error('Cookie ${AUTH_COOKIE} not found.') 
  }
  console.log("Hola")
  return token; 
  /*
  const authHeader = ctx.headers.authorization;
  let token: null | string = null;
  if (authHeader) {
    const match = authHeader.match(/^Bearer[ ]+(.*)$/);
    if (match) {
      token = match[1];
    }
  }
  */
}

export function tokenMiddleware(): Middleware<{ token: string | undefined }> {
  console.log('Require token: ', REQUIRE_TOKEN);
  console.log('Authentication by header: ', AUTH_BY_HEADER);
  console.log('Authentication by cookie: ', AUTH_BY_COOKIE); 
  console.log('Authentication header: ', AUTH_HEADER); 
  console.log('Authentication cookie: ', AUTH_COOKIE); 

  return async (ctx: DefaultContext, next: () => Promise<void>) => {
    const token = getTokenFromContext(ctx);

    ctx.state.token = token;

    const isTokenRequired = REQUIRE_TOKEN || boolean(ctx.query.requireToken);

    if (isTokenRequired && !token) {
      console.log('Token required');
      ctx.throw(401, 'Token is required');
    }

    await next();
  };
}
