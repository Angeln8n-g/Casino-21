# Guía de Deploy — Casino 21

## Requisitos previos

- Node.js 18+
- Cuenta en [expo.dev](https://expo.dev) (gratis)
- EAS CLI: `npm install -g eas-cli`
- Para Android: cuenta en [Google Play Console](https://play.google.com/console)
- Para iOS: cuenta en [Apple Developer Program](https://developer.apple.com) ($99/año)

---

## Parte 1 — Preparar el proyecto

### 1.1 Configurar variables de entorno de producción

Crea un archivo `.env.production` en la raíz (nunca lo subas a git):

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-produccion
EXPO_PUBLIC_SOCKET_URL=https://tu-servidor-produccion.com
```

### 1.2 Actualizar el servidor Socket.IO para producción

El servidor debe estar desplegado en un host con HTTPS y WebSocket. Opciones recomendadas:
- **Railway** (más fácil): [railway.app](https://railway.app)
- **Render**: [render.com](https://render.com)
- **DigitalOcean App Platform**

En `server/.env` de producción:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
JWT_SECRET=tu-jwt-secret-seguro
PORT=4000
CORS_ORIGINS=https://tu-dominio.com
```

### 1.3 Actualizar app.json

En `app.json`, reemplaza los valores placeholder:
- `"projectId": "casino-21-project-id"` → el ID real de tu proyecto en expo.dev
- `"url": "https://u.expo.dev/casino-21-project-id"` → la URL real de updates

---

## Parte 2 — Configurar EAS

### 2.1 Login en Expo

```bash
eas login
```

### 2.2 Inicializar el proyecto en EAS

```bash
eas init
```

Esto actualiza automáticamente el `projectId` en `app.json`.

### 2.3 Configurar secretos de build en EAS

Las variables de entorno de producción se configuran en EAS (no en el repo):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tu-proyecto.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "tu-anon-key"
eas secret:create --scope project --name EXPO_PUBLIC_SOCKET_URL --value "https://tu-servidor.com"
```

---

## Parte 3 — Assets de producción

Antes de hacer el build, reemplaza los assets placeholder con los reales:

| Archivo | Tamaño requerido | Descripción |
|---------|-----------------|-------------|
| `src/mobile/assets/icon.png` | 1024×1024 px | Ícono de la app |
| `src/mobile/assets/adaptive-icon.png` | 1024×1024 px | Ícono adaptativo Android |
| `src/mobile/assets/splash.png` | 1284×2778 px | Splash screen |
| `src/mobile/assets/favicon.png` | 196×196 px | Favicon web |

Los archivos actuales son placeholders de 1×1 px.

---

## Parte 4 — Build para Android

### 4.1 Build de prueba interna (APK)

```bash
eas build --profile preview --platform android
```

Descarga el APK y pruébalo en dispositivos físicos antes del release.

### 4.2 Build de producción (AAB para Google Play)

```bash
eas build --profile production --platform android
```

Esto genera un `.aab` (Android App Bundle) listo para subir a Google Play.

### 4.3 Subir a Google Play automáticamente

1. Crea una cuenta de servicio en Google Play Console
2. Descarga el JSON de la cuenta de servicio
3. Guárdalo como `google-service-account.json` en la raíz del proyecto
4. Ejecuta:

```bash
eas submit --profile production --platform android
```

---

## Parte 5 — Build para iOS

### 5.1 Configurar credenciales

```bash
eas credentials
```

EAS puede gestionar automáticamente los certificados y provisioning profiles.

### 5.2 Build de producción

```bash
eas build --profile production --platform ios
```

### 5.3 Subir a App Store Connect

Actualiza `eas.json` con tus datos reales:
```json
"ios": {
  "appleId": "tu@email.com",
  "ascAppId": "TU_APP_STORE_CONNECT_APP_ID",
  "appleTeamId": "TU_TEAM_ID"
}
```

Luego:
```bash
eas submit --profile production --platform ios
```

---

## Parte 6 — Deploy del servidor

### 6.1 Deploy en Railway (recomendado)

```bash
# Instala Railway CLI
npm install -g @railway/cli

# Login
railway login

# Desde la carpeta server/
cd server
railway init
railway up
```

Configura las variables de entorno en el dashboard de Railway.

### 6.2 Verificar que el servidor acepta WebSockets

El servidor usa Socket.IO. Asegúrate de que tu hosting soporte WebSockets (Railway y Render sí lo hacen).

---

## Parte 7 — Updates OTA (Over The Air)

Para actualizar la app sin pasar por las tiendas (solo cambios de JS, no nativos):

```bash
eas update --branch production --message "Fix: descripción del cambio"
```

Los usuarios recibirán la actualización automáticamente al abrir la app.

---

## Checklist final antes del release

- [ ] Assets reales (icon, splash) en `src/mobile/assets/`
- [ ] Variables de entorno configuradas en EAS Secrets
- [ ] Servidor desplegado con HTTPS y WebSocket habilitado
- [ ] `EXPO_PUBLIC_SOCKET_URL` apunta al servidor de producción
- [ ] `projectId` en `app.json` actualizado con el ID real de expo.dev
- [ ] `versionCode` (Android) y `buildNumber` (iOS) incrementados para cada release
- [ ] Probado en dispositivo físico con el build de `preview`
- [ ] Supabase RLS policies revisadas para producción
- [ ] `JWT_SECRET` del servidor es diferente al de desarrollo

---

## Comandos de referencia rápida

```bash
# Desarrollo local
npx expo start --clear

# Build preview Android (APK para pruebas)
eas build --profile preview --platform android

# Build producción Android (AAB para Play Store)
eas build --profile production --platform android

# Build producción iOS
eas build --profile production --platform ios

# Subir a tiendas
eas submit --profile production --platform android
eas submit --profile production --platform ios

# Update OTA
eas update --branch production --message "descripción"

# Ver builds activos
eas build:list

# Ver secretos configurados
eas secret:list
```
