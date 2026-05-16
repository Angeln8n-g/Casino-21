# Casino 21 — AGENTS.md

## What this is

Monorepo: frontend (root) + backend (`server/`). Card game (21) with real-time multiplayer via Socket.io, Supabase auth/db, React 19 + Vite + Tailwind.

## Setup

```bash
npm install && cd server && npm install   # install both packages
```

Copy `.env.example` to `.env` (root) and `server/.env.example` to `server/.env` (backend). Both needed.

## Dev commands

| What | Command | Where |
|---|---|---|
| Frontend dev (port 3000) | `npm run dev` | root |
| Backend dev (port 4000) | `npm run dev` | `server/` |
| Test all | `npm test` (jest) | root |
| Single test file | `npm test -- tests/domain/card.test.ts` | root |
| Property tests (fast-check) | `npm test -- tests/application/game-engine.property.test.ts` | root |
| Build all | `npm run build:prod` | root |
| Backend build only | `npm run build:server` | root |
| Backend start (prod) | `npm run start` | `server/` |
| Lint styles | `npx stylelint "src/web/**/*.css"` | root |

No linter or typecheck scripts in package.json — only stylelint is configured. No `npm run typecheck`.

## Architecture quirks

- **Duplicated game logic**: `src/domain/` and `src/application/` are mirrored in both `src/` (frontend bundle) and `server/src/` (backend). The backend has the authoritative copy; frontend imports are only used for local rendering/types. Keep them in sync.
- **3-layer domain**: `domain/` (pure models), `application/` (game engine, validators), `web/` (React UI). Tests mirror this in `tests/{domain,application,presentation}/`.
- **Server entry**: `server/src/index.ts` — Express + Socket.io server. All game rooms, matchmaking, and turn management in one file (~1200 lines, no Redis, all in-memory).
- **Frontend entry**: `src/web/main.tsx` → `App.tsx`. Code-splitting via `React.lazy()` on all major screens.
- **Separate landing page**: `src/landing/` has its own entry (`main.tsx`). Built as part of the same Vite config.
- **CLI mode**: `src/presentation/cli.ts` — used for headless testing/scoring.

## Key env vars

Frontend (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SOCKET_URL`
Backend (`server/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `PORT=4000`, `CORS_ORIGINS`, `ALLOW_INSECURE_JWT_FALLBACK=false`, `EXPOSE_RULES_VERSION=false`

## Testing

- Jest + ts-jest. `testEnvironment: "node"`.
- Property-based tests use `fast-check`. Found in `tests/application/*.property.test.ts`.
- Backend (`server/`) has **no tests**.
- Tests are in `tests/` at root (not co-located with source).

## Database

- Schema: `database/database-schema.sql`. Apply via Supabase SQL Editor.
- Migrations: `database/database-migration-*.sql`. Apply in order (they're versioned by phase number).
- Auth: Supabase Auth with RLS policies. Profile auto-creation via DB trigger.
- Match results persisted via `process_match_results` RPC (atomic).
- Quests assigned via `assign_daily_quests` RPC on match completion.

## Game engine specifics

- Turn timer: 30s (`TURN_TIME_LIMIT_MS = 30000`). On timeout, auto-discards lowest card via `getTimeoutAction()`.
- `Result<T>` return type: `{ success: true; value: T } | { success: false; error: ErrorCode }` — used throughout domain/application layers.
- State sanitization: opponent's hand hidden (`{ rank: '?', suit: 'hidden' }`) before emitting `game_state_update`.
- Bot support: room with `isBot: true` flag. Bot difficulty levels in `server/src/bot/bot-player.ts`.
- Matchmaking: ELO-based with expanding tolerance (50 base + 50 per 5s wait, max 500 diff).
- Escrow: bet amounts deducted from both players before match starts, refunded on failure.

## Deployment

- Production: Vite build → `dist/`, server build → `server/dist/`.
- Vercel config for SPA rewrites (`vercel.json` — SPA fallback).
- PM2 ecosystem: `ecosystem.config.cjs` runs server from `server/dist/index.js`.
- `console.*` stripped in production builds via esbuild `drop`.
- PWA enabled via `vite-plugin-pwa`. Service worker caches static assets, Supabase API, Google Fonts.

## Notable conventions

- `tsconfig.json` (root): `strict: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`.
- `server/tsconfig.json`: `strict: false`, `moduleResolution: "node"`, `module: "CommonJS"`.
- `package.json` has `"type": "commonjs"` (root). Server also CommonJS.
- CSS: Tailwind with custom `casino-*` color palette in `tailwind.config.js`. Custom utility animations (shimmer, card-enter, glow-pulse, etc.).
- File naming: kebab-case for logic files, PascalCase for React components.
- JWT auth: Socket.io middleware validates via `supabase.auth.getUser(token)` (handles both RS256 and HS256). `ALLOW_INSECURE_JWT_FALLBACK` skips verification (debug only, never prod).
- `.gitignore` excludes: `node_modules`, `dist`, `.env`, `.env.local`, `.trae`, `.agents`, `.vscode`.
