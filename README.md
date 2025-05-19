# Custom JWT Forward Auth 

> Handle authentication with Json Web Tokens 

This tool (based on [sdu-jwt-forward.auth](https://github.com/elseu/sdu-jwt-forward-auth)) extracts the "common-name" JWT claim of requests (can be configured to extract JWT either from Headers or Cookies), validates it against the issuers configured on startup and returns a 200 response (if JWT is valid and issued by ALLOWED_ISSUERS, otherwise returns 401) with either ADMIN_TOKEN or READ_TOKEN on the Authorization header based on if the user is in the ADMIN_LIST or not. 

Mainly used in Headlamp authorization as an external authentication middleware by sending all Headlamp requests (with a JWT added by Cloudflare) to the service so that it embeds the correct K8s service account token into requests. 

## Install

The  run this service you can download the image from: (https://hub.docker.com/r/devopsmindset/sdu-jwt-forward-auth)[https://hub.docker.com/r/devopsmindset/sdu-jwt-forward-auth].

### For development

If you want to develop JWT Forward Auth, run:

```
npm install
npm run dev # to run nodemon and reload when you change code
npm run start # to run in normal mode
```

## Usage

This component can be run as a Kubernetes ingress external authentication provider: the ingress sends the request headers to JWT Forward Auth, which checks the JWT and sends back new headers, and the ingress then includes those in the request to your webservice.

In both cases, JWT Forward Auth will unpack a JWT bearer token in the `Authorization:` header or other headers or cookies (based on service configuration) and validate its signature against the JWKS endpoint of the associated OIDC identity provider. Then:

-   If the token is valid, its claims are unpacked and sent to your backend in headers. The `sub` token becomes the `X-Auth-Sub` header, `client_id` becomes `X-Auth-Client-Id`, etc. If a claim contains an array, its values will be put in the header in comma-separated format.
-   If the token is invalid (invalid signature, expired) a `401 Authentication Required` response will be sent to the client and your webservice will not be called.
-   If no token is passed, your webservice **will** be called (unless configured otherwise), but without any `X-Auth-*` headers. This allows your webservice to expose public APIs.

To run as ingress external authentication in a Kubernetes cluster, you need to do two things:

First, **configure JWT Forward Auth as a deployment + service within the cluster**. You can do so simply by deploying the Docker image to your cluster and adding a service that points port 80 to targetPort 80 on the container. You only need one per cluster and per identity provider, so multiple APIs in the same cluster can use the same instance of JWT Forward Auth. You should configure the containers through environment variables (see [Configuration](#configuration).

An example configuration can be found in `k8s/forward-auth-service-example.yml`.

Next, **configure the JWT Forward Auth service as an external authentication for your ingress**. First make sure that your ingress controller support forward/external authentication. This is the case for Nginx. You should then add these annotations on your ingress:

```yml
nginx.ingress.kubernetes.io/auth-url: http://[jwt-auth-service-name].[jwt-auth-service-namespace].svc.cluster.local/
nginx.ingress.kubernetes.io/auth-response-headers: X-Auth-Sub, X-Auth-Client-Id, X-Auth-Role, Authorization
```

The first annotation tells your ingress where to find the authentication service. The second one tells it which headers to pass to your webservice. You have to whitelist which headers you want, separated by commas and spaces. If you add `Authorization` here, that header will be _removed_ from the request to your webservice. You can do this to make sure no other authorization logic in your webservice kicks in, or to prevent unwanted dependencies on the token's internal structure.

An example configuration for a webservice that simply echoes your request information can be found in `k8s/echo-example.yml`.

## Configuration

You can configure the services through these environment variables:

| Variable           | Usage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_BY_COOKIE`   | Indicates that the JWT token will be sent to the service as a Cookie. Either AUTH_BY_COOKIE or AUTH_BY_HEADER must be 'true' (both cannot be true).  |
| `AUTH_BY_HEADER`   | Indicates that the JWT token will be sent to the service as a Header. Either AUTH_BY_COOKIE or AUTH_BY_HEADER must be 'true' (both cannot be true).  |
| `AUTH_COOKIE`   | Indicates the name of the cookie where the JWT token will be sent to the service. Must be set if AUTH_BY_COOKIE is 'true'. |
| `AUTH_HEADER`   | Indicates the name of the header where the JWT token will be sent to the service. Must be set if AUTH_BY_HEADER is 'true'.  |
| `ALLOWED_ISSUER`   | URL of the issuer whose tokens the component should accept. This can use wildcards, e.g. `https://*.sdu.nl`. The pattern is not strict, so `https://login.sdu.nl:8080/some/path` will also match the example pattern. For more information about the pattern matching, check the [documentation ](https://www.npmjs.com/package/match-url-wildcard). You can add multiple patterns with this env variable by passing `ALLOWED_ISSUER_0`, `ALLOWED_ISSUER_1`, etc. Each of these issuers will be allowed. **Warning**: if you set this too broadly, for example `https://*`, an attacker could create their own issuer and create their own tokens to access your service, so be careful. E.g: "https://navify.cloudflareaccess.com" |
| `ADMIN_LIST`   | List of names that will be checked against the "common-name" claim of the JWT of requests to embed the ADMIN_TOKEN or READ_TOKEN to the response. E.g: ["moyanono", "torrescd"] |
| `JWT_ALGOS`        | A comma-separated list of JWT algorithms that should be accepted. Make sure these are only asymmetric key algorithms! The default is `RS256,RS384,RS512`, which is good for all RSA-based crypto. (Elliptic curves being the only reasonable alternative, if you know what you are doing.)                                                                                                                                                                                                                                                                                                                                                                                               |
| `REQUIRE_AUDIENCE` | If set, requires the `aud` claim in the token to equal the value of this variable and rejects the token otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `MAX_ISSUER_COUNT` | Maximum number of issuers this component will accept. As tokens from multiple issuers come in, this component will load their OIDC metadata and keep it in memory. This could allow an attacker to create tokens from many different issuers and overflow the memory of the component. This value keeps the max number of issuers below a certain threshold; if this number is reached and tokens from additional issuers come in, they will be rejected with an error 500. Defaults to a nice and high value of `50`.                                                                                                                                                                   |
| `REQUIRE_TOKEN`    | If set to `true` or `1`, only allows requests to go to the backend ingress if they have a valid JWT bearer token in the `Authorization` header. By default requests without a bearer token in the `Authorization` header _are_ passed to the ingress (without any `X-Auth-` headers of course); the ingress can then decide to provide an anonymous version of its API. Note that regardless what you set here, an invalid or expired JWT **always** leads to a 401 error.                                                                                                                                                                                                               |
| `HEADER_PREFIX`    | Prefix to use for authorization header names. Defaults to `X-Auth-`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `LOG_REQUESTS`     | If set to `true` or `1`, all HTTP requests are logged to stdout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `PORT`             | Port number to run the service on. Defaults to `3000`. The the Docker image sets this to `80` by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Maintainers

-   Original developer: [Sebastiaan Besselsen](https://github.com/sbesselsen) (Sdu)
-   Roche modifications: [Oriol Moyano](https://github.com/moyanono_roche)

## License

Licensed under the MIT License.

Copyright 2020-2022 Sdu.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
