# AGENTS.md - Casino 21 Card Game

## Project Overview

Multiplayer card game using React + Vite frontend and Node.js + Express + Socket.io backend. Supabase handles auth and persistence. Game logic follows 3-layer architecture: Domain, Application, Presentation.

## Build/Lint/Test Commands

### Frontend (root)
```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run build:server     # Build backend only
npm run build:prod       # Build frontend + backend
npm run start            # Preview frontend build
npm run preview:host      # Preview accessible on network
```

### Backend (`server/`)
```bash
cd server
npm run dev              # Dev with nodemon + ts-node
npm run build            # Compile TypeScript
npm run start            # Run compiled server
```

### Tests (Jest + fast-check)
```bash
# All tests
npm test

# Single test file
npm test -- tests/domain/card.test.ts

# Single test (pattern match)
npm test -- --testPathPattern="card.test.ts"

# Single test name
npm test -- --testNamePattern="creates card with valid suit and rank"

# Property tests
npm test -- tests/application/game-engine.property.test.ts

# With coverage
npm test -- --coverage
```

## Code Style Guidelines

### TypeScript Configuration
- Frontend: `tsconfig.json` with `strict: true`, `moduleResolution: "bundler"`
- Backend: `tsconfig.json` with `strict: false`, `moduleResolution: "node"`, `module: "CommonJS"`

### Imports
- Use absolute paths via module alias when available: `import { Card } from '../../domain/card'`
- Frontend React components: named imports preferred
- Backend: named imports, CommonJS interop handled by `esModuleInterop: true`

### Naming Conventions
- Types/Interfaces: PascalCase (`GameState`, `PlayerAction`)
- Functions/methods: camelCase (`getValidActions`, `calculateScore`)
- Constants: SCREAMING_SNAKE_CASE (`TURN_TIME_LIMIT_MS`)
- Files: kebab-case (`game-engine.ts`, `action-validator.ts`)
- React components: PascalCase files (`GameScreen.tsx`, `HandView.tsx`)

### Types
```typescript
// Result type for operations that can fail
type Result<T> = { success: true; value: T } | { success: false; error: ErrorCode };

// Use explicit return types on public methods
function startNewGame(mode: GameMode, playerNames: string[]): Result<GameState>
```

### Error Handling
- Domain/Application: Return `Result<T>` type with discriminated union
- Backend: Use `try/catch` with logging, emit Socket.io error events
- Frontend: Display errors in UI, use `throw new Error` for unrecoverable states

### State Management
- Game state is immutable; use spread operator for updates: `newState = { ...state, phase: 'playing' }`
- Socket sanitization: Hide opponent cards before sending to client
- React: Use Context for global state (GameProvider), local state for UI-only

### Comments
- No comments unless required by specification
- Use JSDoc for public API documentation (see `game-engine.ts:27-35`)

### React Patterns
```typescript
// Custom hooks return typed interfaces
export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Cleanup effects properly
useEffect(() => {
  let mounted = true;
  // ... async setup
  return () => { mounted = false; /* cleanup */ };
}, []);
```

### Database (Supabase)
- Use Row-Level Security (RLS) policies
- Profile auto-creation via database trigger on auth
- Prefer RPC functions for complex operations
- Never expose service role key client-side

### Game Logic Architecture
```
src/domain/     # Pure models (Card, Deck, Board, Player, GameState)
src/application/ # Business logic (GameEngine, ActionValidator, ScoreCalculator)
src/web/        # React frontend
server/src/     # Express + Socket.io backend
```

## File Structure
```
├── src/
│   ├── domain/          # Card, Deck, Board, Player, Team, GameState, Types
│   ├── application/     # GameEngine, ActionValidator, TurnManager, ScoreCalculator, Persistence
│   └── web/
│       ├── components/   # React UI components
│       ├── hooks/        # useAuth, useGame, useAudio, useNotifications
│       └── services/     # socket.ts, supabase.ts
├── server/src/           # Express app, Socket.io handlers
├── tests/               # Jest unit + property tests
│   ├── domain/
│   ├── application/
│   └── presentation/
└── docs/                # PRD documentation (events phases)
```

## Key Conventions

### Turn Timer (Backend)
- 30-second limit per turn (`TURN_TIME_LIMIT_MS`)
- Auto-disconnect lowest card on timeout via `getTimeoutAction()`
- Timer restarted on each action

### Card Protection
- Canted cards protected via `protectedUntilTurn` field
- Formations can be claimed by any player with matching value card

### Scoring Rules
- 17 points: only majority cards and spades count
- 18-19 points: only majority cards
- 20 points: only majority spades
- 21+ points: victory

### Socket.io Authentication
- JWT token validated via Supabase `getUser()` API
- Supports both RS256 (new) and HS256 (legacy) tokens
- `ALLOW_INSECURE_JWT_FALLBACK` for debugging (never in production)

## Environment Variables

### Frontend (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Backend (`server/.env`)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
PORT=4000
CORS_ORIGINS=http://localhost:3000
NODE_ENV=development
EXPOSE_RULES_VERSION=false
ALLOW_INSECURE_JWT_FALLBACK=false
```