# obp-base

The non-visual base every Offbeatport product stands on: analytics, error reporting, mail, env
checks and HTTP hardening. The sibling of [`obp-ui`](https://github.com/offbeatport/obp-ui),
which owns everything a visitor sees.

```jsonc
"obp-base": "github:offbeatport/obp-base#main"
```

Public, MIT, fetched over HTTPS, so a Coolify build needs no key. Move an app forward with
`pnpm update obp-base && pnpm install --force`.

## What belongs here

A fix that would have to land in every product. One product's need stays in that product; the
second product that needs it moves it here. Product decisions — copy, pricing, flows — never do:
the library takes values, the app owns its wording.

## Entries

| entry | runs in | peer | what |
|---|---|---|---|
| `obp-base/analytics` | browser | `@openpanel/web` | OpenPanel: `startAnalytics`, `track`, `identify`, `resetIdentity` |
| `obp-base/sentry` | both (plain JS) | — | Privacy-first option factories for any Sentry SDK, plus `sampleRate` |
| `obp-base/mail` | server | — | `createMailer` over Resend's HTTP API |
| `obp-base/email-check` | server | `mailchecker` | `checkEmail` — reason codes, the app owns the copy |
| `obp-base/env` | server | `zod` ≥3.25 | `defineEnv` + `nonEmpty`, `url`, `intIn`, `flag`, `emailList` |
| `obp-base/http` | server | — | `securityHeaders`, `withSecurityHeaders`, `healthResponse` |
| `obp-check-env` | container | — | Pre-boot check of `.env.example` `# REQUIRED` markers |
| `snippets/openpanel.html` | static HTML | — | The analytics tag for sites with no build step |

Entries are TypeScript source that the app's Vite build compiles. `sentry` and `check-env` are
plain `.mjs` because Node runs them directly (`node --import`, the entrypoint), outside the bundle.

Vite bundles TypeScript dependencies by default. An app whose config externalizes dependencies
for SSR, or whose Vitest setup does, adds `ssr: { noExternal: ["obp-base"] }` to `vite.config.ts`
and `test: { server: { deps: { inline: ["obp-base"] } } }` to `vitest.config.ts`.

## The env contract

Every app names these the same way, in `.env.example`, `.env`, the Dockerfile and compose.

| variable | where | per app? |
|---|---|---|
| `VITE_OPENPANEL_CLIENT_ID` | build arg | yes — one OpenPanel project + client per product |
| `VITE_OPENPANEL_API_URL` | build arg | no — `https://opapi.offbeatport.com` |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | runtime / build arg | yes — one Sentry project per product, same DSN in both |
| `SENTRY_PROJECT` | build arg | yes |
| `SENTRY_ORG`, `SENTRY_AUTH_TOKEN` | build arg | no — Coolify shared team variables |
| `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | runtime | optional |

`VITE_*` values are inlined at build time, so each must be an `ARG` in the Dockerfile build stage
and a `build.args` entry in compose; a runtime-only value never reaches the browser. No OpenPanel
client secret exists anywhere: browser tracking needs only the client ID, and the client's CORS
origins are what stop other sites using it.

## Usage

```ts
import { startAnalytics, track } from "obp-base/analytics";

startAnalytics({
    clientId: import.meta.env.VITE_OPENPANEL_CLIENT_ID,
    apiUrl: import.meta.env.VITE_OPENPANEL_API_URL,
    untrackedPaths: /^\/(admin|reset-password)(\/|$)/,
});
track("checkout_started", { plan: "pro" });
```

```js
import * as Sentry from "@sentry/tanstackstart-react";
import { sampleRate, serverOptions } from "obp-base/sentry";

Sentry.init(
    serverOptions({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT,
        release: process.env.SENTRY_RELEASE,
        tracesSampleRate: sampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.05),
        sensitiveKeys: ["prompt"],
    }),
);
```

```ts
import { defineEnv, nonEmpty, url } from "obp-base/env";
import { z } from "zod";

export const { env, assertEnv, parseEnv } = defineEnv({
    app: "PicSuper",
    schema: z.object({ APP_URL: url("APP_URL"), FAL_KEY: nonEmpty("FAL_KEY") }),
    derive: (parsed) => ({ ...parsed, isProduction: process.env.NODE_ENV === "production" }),
});
```

```sh
node node_modules/obp-base/bin/check-env.mjs --app PicSuper --require-in-production RESEND_API_KEY
```

## Static sites

Paste `snippets/openpanel.html` before `</head>` and fill in `clientId`. With the ID blank the tag
does nothing.

## Development

```sh
pnpm install
pnpm typecheck && pnpm test && pnpm lint
```
