# Copilot Instructions for this Repo

This is a Next.js 15 (App Router) + TypeScript project with i18n, market-data pipelines, and AI features; follow these conventions to be effective.

## Architecture & Key Paths
- App Router with locale prefix: pages live under `src/app/[locale]/**`; middleware enforces locales and security headers (`src/middleware.ts`).
- i18n via `next-intl`:
	- Config and route helpers: `src/i18n/config.ts`, `src/i18n/routing.ts` (use `Link`, `redirect`, `useRouter` from here).
	- Request-time messages loader: `src/i18n/request.ts` (loads from `messages/en.json`, `messages/it.json`).
- Server vs client:
	- Server-only utilities are under `src/lib/**` (e.g., `env.ts`, data providers). Do not import `src/lib/env.ts` in client components.
	- Client components declare `'use client'` (e.g., dashboard UI in `src/app/[locale]/dashboard/page.tsx`).
- Data layer highlights:
	- Yahoo/Stooq merge: `src/lib/multi-source-pipeline.ts` and `src/lib/yahooFinance.ts`.
	- Unified aggregator for equities/forex/crypto/commodities: `src/lib/unified-market-api.ts`.
	- Snapshots persisted to `data-snapshots/` via `src/lib/snapshot-store.ts`.
	- Rate limiting helpers for API routes: `src/lib/rate-limit.ts`.
	- Optional services: MongoDB (`src/lib/mongodb.ts`), Supabase (`src/lib/supabase.ts`), OpenAI (`src/lib/openai.ts`).

## Build, Run, and Environment
- Dev server wraps Next.js with an auto-restart script: `npm run dev` executes `server-dev-wrapper.mjs` (Windows-friendly). To select a port use `npm run dev:3000` or set `DEV_PORT`.
- Production: `npm run build` then `npm start`.
- Next config: single source of truth is `next.config.js` with `next-intl` plugin; images are unoptimized for dev.
- Env access: use getters from `src/lib/env.ts` on the server. Public values use `NEXT_PUBLIC_*`. Never log secrets.

## Patterns to Follow
- API routes live in `src/app/api/**/route.ts`. Include rate limiting when exposing public endpoints:
	- Use `getClientIp(req)` + `rateLimit(key)` and apply `rateLimitHeaders` to responses.
- i18n-aware navigation: import `Link`, `redirect`, `useRouter`, `usePathname` from `src/i18n/routing.ts` instead of `next/navigation` directly.
- Market data fetches should batch and throttle (see `getYahooQuotes` batching and `AbortSignal.timeout`). Reuse `UnifiedMarketAPI` where possible.
- Snapshots: prefer reading via `snapshot-store.ts` helpers and keep files under `data-snapshots/`.
- Path alias: import app code with `@/*` per `tsconfig.json` paths.

## Integration Notes
- OpenAI: `src/lib/openai.ts` centralizes the client and schemas (`AIPortfolioService`). Supply `OPENAI_API_KEY`.
- Supabase: guarded by `SUPABASE_ENABLED`; throws if accessed without env vars. Check before calling.
- MongoDB: connection is cached across reloads; requires `MONGODB_URI`.

## Examples
- Locale page path: `src/app/[locale]/about/page.tsx`.
- i18n messages import happens via `src/i18n/request.ts` – do not import JSON directly in pages.
- Data pipeline example: `fetchMultiSourceUniverse(buildDefaultUniverse())` in `src/lib/multi-source-pipeline.ts`.

## Gotchas
- Do not import `src/lib/env.ts` in client components.
- Keep pages under `src/app/[locale]` to remain locale-prefixed (middleware expects it).
- If adding new external fetches, use short timeouts and small batch sizes (copy `getYahooQuotes`).

