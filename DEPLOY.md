# Guía de Deploy — Casino 21

## Requisitos previos

- Node.js 18+
- Git instalado y repositorio en GitHub/GitLab
- Cuenta en [expo.dev](https://expo.dev) (gratis)
- Cuenta en [render.com](https://render.com) (gratis tier disponible)
- EAS CLI: `npm install -g eas-cli`
- Para Android: cuenta en [Google Play Console](https://play.google.com/console) ($25 único)
- Para iOS: cuenta en [Apple Developer Program](https://developer.apple.com) ($99/año)

---

## Parte 1 — Subir el código a GitHub

### 1.1 Crear repositorio

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `casino-21`
3. Visibilidad: **Private**
4. No inicialices con README

### 1.2 Conectar el proyecto local

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/casino-21.git
git push -u origin main
```

### 1.3 Asegúrate de que `.gitignore` excluye los secretos

Verifica que estos archivos estén en `.gitignore`:
```
.env
.env.production
server/.env
google-service-account.json
```

---

## Parte 2 — Deploy del servidor en Render

### 2.1 Crear cuenta en Render

1. Ve a [render.com](https://render.com) y regístrate con tu cuenta de GitHub
2. Haz clic en **"New +"** → **"Web Service"**

### 2.2 Conectar el repositorio

1. Selecciona **"Connect a repository"**
2. Busca y selecciona `casino-21`
3. Render detectará automáticamente que es un proyecto Node.js

### 2.3 Configurar el servicio

Completa el formulario con estos valores:

| Campo | Valor |
|-------|-------|
| **Name** | `casino-21-server` |
| **Region** | `Oregon (US West)` o el más cercano a tus usuarios |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npx ts-node src/index.ts` |
| **Instance Type** | `Free` (para pruebas) o `Starter $7/mes` (producción) |

> ⚠️ El plan Free de Render duerme después de 15 min de inactividad. Para producción real usa **Starter** o superior.

### 2.4 Configurar variables de entorno en Render

En la sección **"Environment"** del servicio, agrega estas variables:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://yarmgboyjjnodjszwiqi.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | tu service role key de Supabase |
| `JWT_SECRET` | genera uno seguro: `openssl rand -base64 64` |
| `PORT` | `4000` |
| `CORS_ORIGINS` | `*` (temporalmente; luego restringe a tu dominio) |
| `NODE_ENV` | `production` |

### 2.5 Habilitar WebSockets en Render

Render soporta WebSockets automáticamente en todos los planes. No requiere configuración adicional.

### 2.6 Deploy

1. Haz clic en **"Create Web Service"**
2. Render construirá y desplegará automáticamente
3. Espera 2-3 minutos hasta ver **"Live"** en verde
4. Copia la URL del servicio: `https://casino-21-server.onrender.com`

### 2.7 Verificar que el servidor funciona

Abre en el navegador:
```
https://casino-21-server.onrender.com
```

Deberías ver una respuesta (aunque sea un 404 o mensaje de error de Socket.IO — eso confirma que está corriendo).

### 2.8 Deploys automáticos

Cada vez que hagas `git push` a `main`, Render redesplegará automáticamente el servidor.

---

## Parte 3 — Configurar Expo.dev y EAS

### 3.1 Crear cuenta en Expo

1. Ve a [expo.dev](https://expo.dev) y regístrate
2. Verifica tu email

### 3.2 Login desde la terminal

```bash
eas login
```

Ingresa tu email y contraseña de expo.dev.

### 3.3 Inicializar EAS en el proyecto

Desde la raíz del proyecto:

```bash
eas init
```

Esto:
- Crea el proyecto en expo.dev
- Actualiza automáticamente el `projectId` en `app.json`
- Vincula tu repositorio local con expo.dev

Verifica que `app.json` ahora tenga un UUID real en `extra.eas.projectId`.

### 3.4 Configurar variables de entorno en EAS

Las variables `EXPO_PUBLIC_*` deben configurarse en EAS para los builds de producción:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://yarmgboyjjnodjszwiqi.supabase.co"

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "tu-anon-key"

eas secret:create --scope project --name EXPO_PUBLIC_SOCKET_URL --value "https://casino-21-server.onrender.com"
```

Verifica que se crearon:
```bash
eas secret:list
```

### 3.5 Actualizar la URL del socket en .env local

Actualiza tu `.env` local para apuntar al servidor de Render:

```env
EXPO_PUBLIC_SOCKET_URL=https://casino-21-server.onrender.com
```

---

## Parte 4 — Assets de producción

Antes de hacer el build, reemplaza los assets placeholder:

| Archivo | Tamaño | Herramienta sugerida |
|---------|--------|---------------------|
| `src/mobile/assets/icon.png` | 1024×1024 px | [Canva](https://canva.com), Figma |
| `src/mobile/assets/adaptive-icon.png` | 1024×1024 px | Mismo diseño, fondo transparente |
| `src/mobile/assets/splash.png` | 1284×2778 px | Fondo `#0f0f1a` con logo centrado |
| `src/mobile/assets/favicon.png` | 196×196 px | Versión pequeña del ícono |

> Los archivos actuales son PNGs de 1×1 px. El build funcionará pero la app tendrá íconos en blanco.

---

## Parte 5 — Build para Android

### 5.1 Build de prueba (APK descargable)

```bash
eas build --profile preview --platform android
```

- EAS construye en la nube (~10-15 min)
- Al terminar, te da un link para descargar el APK
- Instálalo directamente en tu teléfono para probar

### 5.2 Build de producción (AAB para Google Play)

```bash
eas build --profile production --platform android
```

Genera un `.aab` (Android App Bundle) optimizado para Google Play.

### 5.3 Descargar el build

1. Ve a [expo.dev/accounts/TU_USUARIO/projects/casino-21/builds](https://expo.dev)
2. Descarga el `.aab` cuando el build termine

### 5.4 Subir a Google Play Console

1. Ve a [play.google.com/console](https://play.google.com/console)
2. Crea una nueva app → **"Crear aplicación"**
3. Completa la información básica (nombre, idioma, tipo)
4. Ve a **"Producción"** → **"Versiones"** → **"Crear nueva versión"**
5. Sube el `.aab` descargado
6. Completa la descripción, capturas de pantalla y clasificación de contenido
7. Envía para revisión (tarda 1-3 días)

### 5.5 Subir automáticamente con EAS Submit

Alternativa más rápida:

1. En Google Play Console, ve a **"Configuración"** → **"Acceso a la API"**
2. Crea una cuenta de servicio y descarga el JSON
3. Guárdalo como `google-service-account.json` en la raíz
4. Ejecuta:

```bash
eas submit --profile production --platform android
```

---

## Parte 6 — Build para iOS

### 6.1 Requisitos

- Mac con Xcode instalado, O usar EAS Build en la nube (no necesitas Mac)
- Cuenta de Apple Developer activa

### 6.2 Configurar credenciales automáticamente

```bash
eas credentials
```

Selecciona **iOS** → EAS gestiona automáticamente:
- Distribution Certificate
- Provisioning Profile

### 6.3 Build de producción

```bash
eas build --profile production --platform ios
```

### 6.4 Actualizar eas.json con tus datos de Apple

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "tu@email.com",
      "ascAppId": "TU_APP_ID_EN_APP_STORE_CONNECT",
      "appleTeamId": "TU_TEAM_ID"
    }
  }
}
```

El `ascAppId` lo encuentras en [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → tu app → información general.

### 6.5 Subir a App Store Connect

```bash
eas submit --profile production --platform ios
```

Luego en App Store Connect completa la metadata y envía para revisión (tarda 1-2 días).

---

## Parte 7 — Updates OTA (sin pasar por las tiendas)

Para cambios solo en JavaScript (no en código nativo):

```bash
# Publicar update
eas update --branch production --message "Fix: descripción del cambio"
```

Los usuarios recibirán la actualización automáticamente la próxima vez que abran la app.

> ⚠️ Los updates OTA NO funcionan para cambios que requieren recompilar código nativo (agregar nuevas librerías nativas, cambiar permisos, etc.).

---

## Parte 8 — Monitoreo post-deploy

### 8.1 Logs del servidor en Render

1. Ve a tu servicio en [render.com/dashboard](https://render.com/dashboard)
2. Haz clic en **"Logs"** para ver logs en tiempo real

### 8.2 Métricas de la app en Expo

1. Ve a [expo.dev](https://expo.dev) → tu proyecto
2. Sección **"Updates"** muestra cuántos usuarios tienen cada versión

### 8.3 Errores de Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sección **"Logs"** → **"API"** para ver errores de queries

---

## Checklist final antes del release

- [ ] Assets reales (icon 1024×1024, splash 1284×2778) en `src/mobile/assets/`
- [ ] Servidor desplegado en Render y respondiendo en HTTPS
- [ ] `EXPO_PUBLIC_SOCKET_URL` apunta a `https://casino-21-server.onrender.com`
- [ ] Variables de entorno configuradas con `eas secret:create`
- [ ] `projectId` en `app.json` actualizado (después de `eas init`)
- [ ] `versionCode` en `app.json` incrementado para cada release Android
- [ ] `buildNumber` en `app.json` incrementado para cada release iOS
- [ ] Probado en dispositivo físico con build `preview`
- [ ] Supabase RLS policies activas en producción
- [ ] `JWT_SECRET` del servidor generado con `openssl rand -base64 64`
- [ ] `CORS_ORIGINS` en Render restringido al dominio de la app

---

## Comandos de referencia rápida

```bash
# ── Desarrollo ──────────────────────────────────────────────
npx expo start --clear

# ── EAS ─────────────────────────────────────────────────────
eas login
eas init
eas secret:list
eas secret:create --scope project --name CLAVE --value "valor"

# ── Builds ──────────────────────────────────────────────────
eas build --profile preview --platform android      # APK de prueba
eas build --profile production --platform android   # AAB para Play Store
eas build --profile production --platform ios       # IPA para App Store
eas build --profile production --platform all       # Ambas plataformas

# ── Submit ──────────────────────────────────────────────────
eas submit --profile production --platform android
eas submit --profile production --platform ios

# ── Updates OTA ─────────────────────────────────────────────
eas update --branch production --message "descripción"

# ── Monitoreo ───────────────────────────────────────────────
eas build:list
eas update:list
```
