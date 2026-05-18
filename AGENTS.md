# Casino 21 — AGENTS.md

## What this is

Monorepo: frontend (root) + backend (`server/`). Card game (21) with real-time multiplayer via Socket.io (Express 5), Supabase auth/db, React 19 + Vite + Tailwind. Spanish-language UI. No CI/CD, no GitHub Actions.

## Setup

```bash
npm install && cd server && npm install   # install both packages
```

Copy `.env.example` to `.env` (root) and `server/.env.example` to `server/.env`. Both needed.

## Dev commands

| What | Command | Where |
|---|---|---|
| Frontend dev (port 3000) | `npm run dev` | root |
| Backend dev (port 4000) | `npm run dev` | `server/` |
| Test all | `npm test` (jest) | root |
| Single test | `npm test -- tests/domain/card.test.ts` | root |
| Property tests (fast-check) | `npm test -- tests/application/game-engine.property.test.ts` | root |
| Build all | `npm run build:prod` | root |
| Lint CSS | `npx stylelint "src/web/**/*.css"` | root |

No typecheck or general linter scripts. `npm run build` also runs `scripts/generate-seo-pages.mjs`.

## Architecture

- **Duplicated game logic**: `src/domain/` and `src/application/` are mirrored in `server/src/`. Backend is authoritative; frontend copy is for local rendering/types only.
- **Server entry**: `server/src/index.ts` (~1300 lines, no Redis, all in-memory). Express 5 + Socket.io. All game rooms, matchmaking, turn management in one file.
- **Frontend entry**: `src/web/main.tsx` → `App.tsx`. Code-splitting via `React.lazy()`.
- **Separate landing page**: `src/landing/` has its own entry (`main.tsx`). Built as part of same Vite config.
- **CLI mode**: `src/presentation/cli.ts` — headless testing/scoring. **Excluded** from root `tsconfig.json` (only `src/web/`, `src/domain/`, `src/application/`, `src/landing/` are included).
- **Static assets**: `src/Public/` contains audio files and images (served directly by Vite).
- **Redis adapter** (`@socket.io/redis-adapter`, `ioredis`) in root `package.json` deps (not server/). Installed but currently unused in code — all game state is in-memory.

## Key env vars

Frontend (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SOCKET_URL`
Backend (`server/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `PORT=4000`, `CORS_ORIGINS`, `ALLOW_INSECURE_JWT_FALLBACK=false`, `EXPOSE_RULES_VERSION=false`, `NODE_ENV`

## Testing

- Jest + ts-jest, `testEnvironment: "node"`, uses `tsconfig.test.json` (extends root with `rootDir: "."` and jest types).
- Tests in `tests/{domain,application,presentation}/` (not co-located).
- Property tests (`fast-check`) in `tests/application/*.property.test.ts`.
- Backend (`server/`) has **no tests** — `npm test` in server/ only prints an error.

## Database

- Schema: `database/database-schema.sql`. Apply via Supabase SQL Editor.
- Migrations: `database/database-migration-*.sql` — versioned by phase number, apply in order.
- Auth: Supabase Auth with RLS. Profile auto-creation via DB trigger.
- Match results persisted via `process_match_results` RPC (atomic). Quests via `assign_daily_quests` RPC.
- There are 30+ migration files. Schema is complex (profiles, matches, tournaments, quests, events, store, themes, chat, etc.).

## Game engine specifics

- Turn timer: 30s (`TURN_TIME_LIMIT_MS = 30000`). On timeout, auto-discards lowest card.
- `Result<T>` return type: `{ success: true; value: T } | { success: false; error: ErrorCode }`.
- State sanitization: opponent's hand hidden (`{ rank: '?', suit: 'hidden' }`).
- Bot support: room with `isBot: true` flag. Bot difficulty levels in `server/src/bot/bot-player.ts` (includes `BOT_USER_ID`, `BOT_NAMES`, `BOT_THINK_DELAY_MS`).
- Matchmaking: ELO-based with expanding tolerance (50 base + 50 per 5s wait, max 500 diff).
- Escrow: bet amounts deducted before match, refunded on failure.

## Deployment

- Production: Vite build → `dist/`, server build → `server/dist/`.
- `npm run build:prod` runs both.
- PM2: `ecosystem.config.cjs` runs server from `server/dist/index.js`. Nginx config at `deploy/nginx/casino21.conf` proxies to 6 PM2 instances (ports 4000-4005), with WebSocket upgrade for `/socket.io/`.
- Vercel config (`vercel.json`) provides SPA fallback rewrites + security headers.
- `console.*` stripped in Vite production builds via esbuild `drop`.
- PWA via `vite-plugin-pwa` with Workbox runtime caching.

## Notable conventions

- `tsconfig.json` (root): `strict: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`. Excludes `tests/`, `server/`, `src/presentation/`.
- `server/tsconfig.json`: `strict: false`, `moduleResolution: "node"`, `module: "CommonJS"`. Has `ignoreDeprecations: "6.0"`.
- `tsconfig.test.json`: extends root, sets `rootDir: "."`, includes `tests/` + `src/domain/` + `src/application/`.
- `package.json` has `"type": "commonjs"` (root). Server also CommonJS.
- File naming: kebab-case for logic, PascalCase for React components.
- CSS: Tailwind with custom `casino-*` palette. Custom utility animations (shimmer, card-enter, glow-pulse, etc.).
- Key frontend libs: `framer-motion` (animations), `@dnd-kit/*` (drag-and-drop), `lucide-react` (icons), `qrcode.react` (QR sharing).
- JWT auth: Socket.io middleware validates via `supabase.auth.getUser(token)` (RS256 + HS256). `ALLOW_INSECURE_JWT_FALLBACK` skips verification (debug only).
- `server/src/supabase.js` is stale compiled CommonJS output alongside `supabase.ts` — ts-node uses the .ts file.
- `.gitignore` additionally excludes: `*.local`, `.trae`, `.agents`, `.config.kiro`, `.vscode`, `partida_*.json`.
