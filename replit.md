# SHEIN SOA Rewards Bot

A Telegram rewards bot that lets users earn points through referrals and redeem them for SHEIN coupon codes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server + Telegram bot
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run push-force` — push DB schema changes (force, no prompt)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secrets: `BOT_TOKEN`, `ADMIN_ID`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Bot: Telegraf v4
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (users, channels, coupons, redemptions, referrals, joinRequests)
- `artifacts/api-server/src/bot/` — Telegram bot logic
- `artifacts/api-server/src/bot/handlers/` — Per-feature handlers
- `artifacts/api-server/src/bot/db.ts` — Database query helpers
- `artifacts/api-server/src/bot/keyboards.ts` — Inline keyboard builders

## Architecture decisions

- Bot runs as a long-polling Telegraf bot inside the same Express process.
- Admin state (multi-step flows like add_coupon, broadcast) is tracked in-memory via a Map — fine for a single-instance bot.
- Private channel join requests are tracked in `join_requests` table via `chat_join_request` Telegram events.
- Referral points are awarded only after the referred user completes all channel verification (not immediately on join).
- Force-join channels are stored in the DB and configurable at runtime via the admin panel.

## Product

- Users start the bot, join required channels, and get verified.
- Referral system: share a unique link, earn 1 point per verified referral.
- Redeem 10 points for a SHEIN coupon code.
- Admin panel: add/remove channels and coupons, broadcast messages, view stats and users.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing DB schema, run `pnpm --filter @workspace/db run push-force` to apply.
- After any code change, the workflow must restart (it runs `build` before `start`).
- For private channel force-join to work: add the bot as admin to the private channel with "Manage invite links" permission.
- The bot username is fetched dynamically at startup via `getMe()`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
