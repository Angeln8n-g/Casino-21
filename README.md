# 🃏 Casino 21 Card Game — Monorepo Multijugador

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%20%2F%206.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-5.2-lightgrey.svg?logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black.svg?logo=socket.io&logoColor=white)](https://socket.io/)
[![Supabase](https://img.shields.io/badge/Supabase-2.100-emerald.svg?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Jest](https://img.shields.io/badge/Jest-30-red.svg?logo=jest&logoColor=white)](https://jestjs.io/)

**Casino 21** es un videojuego de cartas competitivo en tiempo real con una interfaz moderna y estética *premium*. El proyecto está estructurado como un monorreferencial (monorepo) con lógica duplicada y compartida entre el servidor y el cliente, donde el servidor es el único estado de autoridad.

---

## 📌 Tabla de Contenidos

- [🎯 Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [✨ Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🚀 Instalación y Configuración](#-instalación-y-configuración)
- [⚙️ Variables de Entorno](#️-variables-de-entorno)
- [🗄️ Base de Datos (Supabase)](#️-base-de-datos-supabase)
- [🧪 Pruebas y Calidad](#-pruebas-y-calidad)
- [💻 Modo CLI (Headless)](#-modo-cli-headless)
- [🌐 Despliegue en Producción](#-despliegue-en-producción)
- [🔒 CSP y Seguridad](#-csp-y-seguridad)

---

## 🎯 Arquitectura del Proyecto

El monorepo separa el código del **Frontend** (raíz del proyecto) del **Backend** (`server/`). El juego implementa una **arquitectura en 3 capas** (Dominio, Aplicación y Presentación):

```
├── database/               # Esquemas y 30+ migraciones SQL estructuradas
├── deploy/                 # Configuraciones de servidor de despliegue (Nginx, etc.)
├── docs/                   # Especificaciones de negocio, PRDs y guías de desarrollo
├── public/                 # Recursos estáticos y configuraciones SEO (sitemaps, robots)
├── server/                 # SERVIDOR DE SOCKET.IO Y NEGOCIO AUTORITATIVO
│   ├── src/
│   │   ├── application/    # Lógica del motor duplicada (autoritativa)
│   │   ├── domain/         # Modelos y tipos duplicados (autoritativa)
│   │   ├── bot/            # Inteligencia Artificial y dificultades
│   │   ├── index.ts        # Punto de entrada principal del servidor (Express + Sockets)
│   │   └── ...
│   └── tsconfig.json
├── src/                    # CLIENTE FRONTEND (VITE + REACT)
│   ├── domain/             # Lógica de dominio del juego (espejo)
│   ├── application/        # Lógica de aplicación del juego (espejo)
│   ├── landing/            # Página de aterrizaje optimizada independiente
│   ├── presentation/       # Interfaz en consola (modo CLI)
│   └── web/                # Código fuente de la SPA React
│       ├── components/     # Componentes visuales (Lobby, Juego, Tienda, Admin)
│       └── main.tsx        # Punto de entrada de la aplicación
├── tests/                  # Suite de pruebas automatizadas unitarias y de propiedades
├── package.json            # Scripts y dependencias generales
└── tsconfig.json           # Configuración TypeScript del frontend
```

### Regla de Duplicidad
Los directorios `src/domain/` y `src/application/` están duplicados/espejeados exactamente en `server/src/`. 
- **Backend es Autoritativo**: Cualquier decisión de juego (si un movimiento es válido, cálculo de puntos, etc.) la toma el servidor.
- **Frontend local**: Su copia de lógica sirve únicamente para autocompletado, tipado seguro y renderizado local predictivo.

---

## ✨ Características Principales

### 🎮 Mecánicas de Juego y Motor
- **Modos soportados**: Partidas multijugador `1v1` y base para `2v2`.
- **Acciones estrictas**: Llevar cartas del tablero, crear formaciones (`formar`, `formarPar`, `aumentarFormacion`), colocar cartas y cantar ases.
- **Temporizador de Turno**: Límite de 30 segundos (`TURN_TIME_LIMIT_MS = 30000`). Si el tiempo expira, el servidor descarta de manera automática la carta de menor valor del jugador activo para no trabar la partida.
- **Sanitización del Estado**: Las cartas de la mano del rival se ocultan al oponente mediante transformación del estado `{ rank: '?', suit: 'hidden' }`.
- **Escrow de Apuestas**: Las monedas apostadas se descuentan antes de iniciar la partida y se devuelven solo si la partida se cancela de forma justificada.

### 🤖 Bots Avanzados
- Salas con soporte de bot (`isBot: true`).
- Múltiples niveles de dificultad integrados en [bot-player.ts](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/server/src/bot/bot-player.ts) con simulación de retraso de decisión humano (`BOT_THINK_DELAY_MS`).

### ⚔️ Matchmaking y Salas
- Sistema de Matchmaking basado en ELO con tolerancia expansiva automática (50 puntos de ELO iniciales, expandiéndose 50 puntos cada 5 segundos hasta un máximo de 500).
- Reconexión fluida a la sala tras recargar la pestaña del navegador.
- Sistema de espectadores para visualizar partidas activas.

### 💬 Social y Comunicación
- Lista de amigos, buscador y solicitudes de amistad en tiempo real.
- Panel social intuitivo con invitaciones a partidas personalizadas.
- Chat global y de partida con soporte de respuestas y sincronización inmediata.

### 🏪 Tienda VIP y Cosméticos
- Compra de temas visuales personalizados y avatares con monedas virtuales.
- Modal BottomSheet no intrusivo para compras seguras sin uso de diálogos `confirm` nativos del navegador.
- Soporte para pruebas A/B de visualización (grilla compacta vs. detallada).

### 🏆 Torneos y Eventos
- Renderizado de llaves competitivas (Tournament Brackets) de forma vertical y horizontal en el cliente.
- Eventos especiales con recompensas basadas en misiones diarias y semanales.

### 📢 Sistema de Anuncios y Administración
- Panel de administración avanzado para la creación de artículos, visualización de métricas de uso y control de recompensas de anuncios.
- Ad Manager con soporte para anuncios premiados con límites diarios estrictos de seguridad a nivel de base de datos.

### 📈 Actualización de Estadísticas en Tiempo Real
- Sincronización automática de perfil, monedas y ELO usando suscripciones a canales en tiempo real de Supabase (`supabase.channel`).
- Disparo redundante de eventos del sistema (`profile_updated`, `coins_updated`, `elo_updated`) para asegurar el refresco rápido de la interfaz tras finalizar partidas.

### 📱 Experiencia PWA y SEO
- Instalable en dispositivos móviles como Progressive Web App (PWA) usando `vite-plugin-pwa`.
- Estructura de SEO Premium con metatags dinámicos en rutas del frontend, Sitemap XML, directivas de `robots.txt` y microdatos estructurados JSON-LD (`WebApplication` y `VideoGame`) para cumplimiento con Google AdSense.

---

## 🛠️ Stack Tecnológico

### Frontend (Raíz)
*   **React 19** & **Vite 5** (Desarrollo y empaquetado ultra rápido).
*   **Tailwind CSS** (Estilos optimizados con paleta de colores de casino).
*   **Framer Motion** (Animaciones fluidas y transiciones 3D de cartas).
*   **@dnd-kit** (Arrastrar y soltar cartas en el tablero de juego).
*   **Socket.io-client** (Conexión persistente mediante WebSockets).
*   **Howler.js** (Gestión avanzada de música y efectos de audio).

### Backend (`server/`)
*   **Node.js** & **Express 5**.
*   **Socket.io** (Servidor autoritativo de salas y sockets).
*   **TypeScript 6** & **ts-node-dev** (Tipado estricto en servidor).
*   **web-push** (Notificaciones push a navegadores y móviles).
*   **Redis Adapter** (Instalado y preparado para escalado horizontal en PM2, aunque actualmente las salas operan en memoria).

### Base de Datos y Servicios
*   **Supabase** (Autenticación de usuarios, persistencia relacional Postgres, Realtime WebSockets y almacenamiento de buckets).

---

## 🚀 Instalación y Configuración

Sigue estos pasos para configurar tu entorno local de desarrollo:

### 1. Clonar el repositorio e instalar dependencias

Instala los paquetes en el directorio raíz (frontend) y en el subdirectorio del backend de manera simultánea:

```bash
npm install && cd server && npm install
```

### 2. Configurar variables de entorno

Copia las plantillas de variables de entorno y rellena los valores reales de tu instancia de Supabase:

```bash
# En el directorio raíz (Frontend)
cp .env.example .env

# En el directorio server/ (Backend)
cp server/.env.example server/.env
```

---

## ⚙️ Variables de Entorno

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_SOCKET_URL=http://localhost:4000
```

### Backend (`server/.env`)
```env
NODE_ENV=development
PORT=4000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
JWT_SECRET=tu_jwt_secret_de_supabase
CORS_ORIGINS=http://localhost:3000
ALLOW_INSECURE_JWT_FALLBACK=false
EXPOSE_RULES_VERSION=false
```

---

## 🗄️ Base de Datos (Supabase)

Toda la base de datos se maneja a través de Supabase.

1. Abre el **SQL Editor** de tu Dashboard de Supabase.
2. Ejecuta el esquema base del archivo [database-schema.sql](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/database/database-schema.sql).
3. Aplica los scripts secuenciales de migración que se encuentran dentro de [database/](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/database) en orden numérico para habilitar las tablas secundarias (amistades, misiones, tiendas, anuncios, torneos, etc.).

> [!IMPORTANT]
> Para que la actualización de estadísticas en tiempo real funcione correctamente, debes habilitar la replicación de Postgres para la tabla `profiles` en tu consola de Supabase:
> **Database -> Replication -> Habilitar tabla `profiles`**.

---

## 💻 Ejecución en Desarrollo

Puedes arrancar ambos servicios de forma independiente desde sus respectivas carpetas:

### Levantar el Servidor Backend (Puerto 4000)
```bash
cd server
npm run dev
```

### Levantar el Cliente Frontend (Puerto 3000)
```bash
# Desde la raíz del proyecto
npm run dev
```

---

## 🧪 Pruebas y Calidad

El proyecto cuenta con un entorno riguroso de pruebas unitarias y de propiedades utilizando **Jest** y **fast-check**:

```bash
# Ejecutar todas las pruebas del workspace
npm test

# Ejecutar un archivo de prueba unitaria en específico
npm test -- tests/domain/card.test.ts

# Ejecutar pruebas de propiedades (Property-based tests) en el motor del juego
npm test -- tests/application/game-engine.property.test.ts

# Validar y formatear la sintaxis de CSS con Tailwind
npx stylelint "src/web/**/*.css"
```

---

## 💻 Modo CLI (Headless)

El proyecto cuenta con una interfaz de comandos para realizar simulaciones de partidas y depuración rápida sin necesidad de levantar el navegador. 

El archivo correspondiente está en [cli.ts](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/src/presentation/cli.ts) y está excluido de la compilación normal del frontend.

---

## 🌐 Despliegue en Producción

### Compilación General
Para generar los paquetes optimizados de cliente y servidor, ejecuta:
```bash
npm run build:prod
```
*   El frontend optimizado se compilará en `dist/` (procesando también las páginas de aterrizaje estáticas de SEO).
*   El backend optimizado se compilará en `server/dist/`.

### Configuración del VPS (PM2 + Nginx)

1. **PM2**: Mantiene el proceso del backend activo y escalado en modo clúster. Utiliza el archivo `ecosystem.config.cjs`:
   ```bash
   cd /var/www/casino21/current
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

2. **Nginx**: Actúa como proxy inverso y sirve los estáticos. La configuración de referencia está en [casino21.conf](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/deploy/nginx/casino21.conf). Recuerda habilitar la actualización de cabeceras para WebSockets:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "Upgrade";
   ```

3. **Vercel**: Si decides desplegar el frontend de forma independiente, el archivo [vercel.json](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/vercel.json) provee redirecciones SPA automáticas y cabeceras de seguridad.

---

## 🔒 CSP y Seguridad

El Content Security Policy (CSP) se define y mantiene sincronizado en **dos ubicaciones**:
1. **Nginx** (Configuración activa de producción): `/etc/nginx/sites-available/kasino21.com.conf`
2. **Vite dev server** (Solo desarrollo): Configurado en la sección `server.headers` de [vite.config.mts](file:///c:/Users/angel/Desktop/Develop/Web all projects/casino-21-card-game/vite.config.mts).

Al realizar cambios en la política de CSP (por ejemplo, al añadir proveedores externos de scripts o fuentes), recuerda actualizar ambas referencias para evitar problemas de bloqueo.
