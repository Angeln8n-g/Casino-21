# Casino 21 Card Game (MVP Web Multijugador)

Casino 21 es un juego de cartas competitivo implementado con:

- Frontend: React + Vite + Tailwind + DnD Kit
- Backend: Node.js + Express + Socket.io
- Autenticación y datos: Supabase (Auth + Postgres)

El proyecto está orientado a partidas online en tiempo real, con autoridad del servidor sobre el estado del juego.

## Requisitos

- Node.js 18+
- npm
- Proyecto de Supabase activo

## Instalación

```bash
npm install
cd server
npm install
```

## Variables de entorno

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

### Backend (`server/.env`)

```env
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
JWT_SECRET=tu_jwt_secret_de_supabase
```

## Base de datos (Supabase)

Ejecuta el script SQL del proyecto en el SQL Editor de Supabase:

- `database-schema.sql`

Este script crea:
- `profiles`
- `matches`
- políticas RLS y trigger de creación de perfil automático

## Ejecución en desarrollo

### 1) Levantar backend (Socket.io)

```bash
cd server
npm run dev
```

### 2) Levantar frontend

```bash
npm run dev
```

Frontend por defecto: `http://localhost:3000`  
Backend por defecto: `http://localhost:4000`

## Build

### Frontend

```bash
npm run build
```

### Backend

```bash
cd server
npm run build
```

### Produccion (frontend + backend)

```bash
npm run build:prod
```

Guia operativa de VPS:

- `DEPLOY_VPS.md`

## Mecánicas principales implementadas

- Modos: `1v1` y base para `2v2`
- Acciones: `llevar`, `formar`, `formarPar`, `aumentarFormacion`, `colocar`, `cantar`
- Validaciones estrictas de reglas en backend
- Estado sanitizado por jugador (oculta mano del rival)
- Reconexión automática a sala tras recarga
- Timer por turno con penalización automática por timeout:
  - al agotarse el tiempo, el servidor descarta la carta de menor valor del jugador activo
- Flujo de scoring y continuación de ronda desde servidor
- Persistencia de resultados y actualización de ELO en Supabase

## Reglas clave de esta fase

- Si un jugador tiene formaciones pendientes creadas por él, no puede encadenar nuevas formaciones que consuman la carta necesaria para llevárselas.
- El avance de turnos debe mantenerse consistente incluso cuando se reparte nueva mano dentro de la misma ronda.
- El timeout no debe trabar la partida.

## Scripts disponibles

### Raíz

- `npm run dev` → frontend con Vite
- `npm run build` → build frontend
- `npm run build:server` → build backend desde la raiz
- `npm run build:prod` → build frontend + backend
- `npm run start` → preview frontend build
- `npm run start:server` → arranque backend desde la raiz
- `npm run preview:host` → preview accesible en red para pruebas
- `npm test` → tests del workspace principal

### `server/`

- `npm run dev` → backend con nodemon + ts-node
- `npm run start` → backend compilado (`dist/index.js`)
- `npm run build` → compilación TypeScript del backend

## Estado actual

MVP jugable en línea con autenticación, salas, turnos, reconexión y persistencia básica de resultados.
