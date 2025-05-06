import 'dotenv/config';

import { boolean } from 'boolean';

export const HEADER_PREFIX = process.env.HEADER_PREFIX ?? 'X-Auth-';
export const LOG_REQUESTS = boolean(process.env.LOG_REQUESTS);
export const PORT = parseInt(process.env.PORT ?? '3000');
export const MAX_ISSUER_COUNT = parseInt(process.env.MAX_ISSUER_COUNT ?? '50', 10); // Set a maximum number of issuers to prevent a DoS where the process can run out of memory if it gets lots of tokens with different valid issuer URLs.
export const DEFAULT_ISSUER = process.env.DEFAULT_ISSUER ? process.env.DEFAULT_ISSUER : undefined;
export const JWT_ALGOS = (process.env.JWT_ALGOS || 'RS256,RS384,RS512').split(',');
export const REQUIRE_AUDIENCE = process.env.REQUIRE_AUDIENCE;
export const REQUIRE_TOKEN = boolean(process.env.REQUIRE_TOKEN);
export const ENVIRONMENT = process.env.ENVIRONMENT;
export const AUTH_BY_HEADER = boolean(process.env.AUTH_BY_HEADER);
export const AUTH_HEADER = process.env.AUTH_HEADER ? process.env.AUTH_HEADER : "";
export const AUTH_BY_COOKIE = boolean(process.env.AUTH_BY_COOKIE);
export const AUTH_COOKIE = process.env.AUTH_COOKIE ? process.env.AUTH_COOKIE : "";
export const READ_SA_TOKEN = process.env.READ_SA_TOKEN ? process.env.READ_SA_TOKEN : "";
export const ADMIN_SA_TOKEN = process.env.ADMIN_SA_TOKEN ? process.env.ADMIN_SA_TOKEN : "";
export const ADMIN_LIST = JSON.parse(process.env.ADMIN_LIST ? process.env.ADMIN_LIST : "[]"); 