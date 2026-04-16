# Despliegue a Produccion en VPS

Esta guia deja `Casino 21` listo para correr en un VPS Ubuntu con:

- `Nginx` sirviendo el frontend estatico
- `PM2` manteniendo vivo el backend Socket.IO
- `Node.js 20`
- `Supabase` como proveedor de auth y base de datos

## 1. Requisitos del VPS

- Ubuntu 22.04 o 24.04
- Dominio apuntando al VPS
- Node.js 20+
- `npm`
- `nginx`
- `pm2`

Instalacion base:

```bash
sudo apt update
sudo apt install -y nginx curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Datos de este despliegue:

- Dominio: `casino21.hunykho.com`
- IP VPS: `84.247.169.189`

Verificacion DNS esperada:

```bash
dig +short casino21.hunykho.com
```

Debe responder:

```text
84.247.169.189
```

## 2. Clonar el proyecto

```bash
sudo mkdir -p /var/www/casino21
sudo chown -R $USER:$USER /var/www/casino21
cd /var/www/casino21
git clone <TU_REPOSITORIO> current
cd current
```

## 3. Variables de entorno

### Frontend `.env`

Crear `./.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_SOCKET_URL=
```

Notas:

- Si frontend y backend comparten dominio via `Nginx`, deja `VITE_SOCKET_URL` vacio.
- Si el backend va en otro dominio o subdominio, usa `https://api.casino21.hunykho.com`.

### Backend `server/.env`

Crear `./server/.env`:

```env
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
JWT_SECRET=tu_jwt_secret
CORS_ORIGINS=https://casino21.hunykho.com
ALLOW_INSECURE_JWT_FALLBACK=false
EXPOSE_RULES_VERSION=false
```

Importante:

- `ALLOW_INSECURE_JWT_FALLBACK` debe permanecer en `false` en produccion.
- Si usas varios dominios, separalos por coma en `CORS_ORIGINS`.

## 4. Instalar dependencias

```bash
cd /var/www/casino21/current
npm ci
npm --prefix server ci
```

## 5. Generar builds

```bash
cd /var/www/casino21/current
npm run build:prod
```

Esto genera:

- frontend en `dist/`
- backend compilado en `server/dist/`

## 6. Levantar backend con PM2

```bash
cd /var/www/casino21/current
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Comandos utiles:

```bash
pm2 status
pm2 logs casino21-server
pm2 restart casino21-server
```

## 7. Configurar Nginx

Copiar la configuracion incluida:

```bash
sudo cp /var/www/casino21/current/deploy/nginx/casino21.conf /etc/nginx/sites-available/casino21.conf
sudo ln -s /etc/nginx/sites-available/casino21.conf /etc/nginx/sites-enabled/casino21.conf
sudo nginx -t
sudo systemctl reload nginx
```

Antes de recargar:

- verifica que el `server_name` sea `casino21.hunykho.com`
- verifica que `root /var/www/casino21/current/dist;` coincida con la ruta real

## 8. SSL con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d casino21.hunykho.com
```

## 9. Healthcheck

Backend:

```bash
curl http://127.0.0.1:4000/health
```

Dominio publico:

```bash
curl https://casino21.hunykho.com/health
```

## 10. Flujo de actualizacion

```bash
cd /var/www/casino21/current
git pull
npm ci
npm --prefix server ci
npm run build:prod
pm2 restart casino21-server
sudo systemctl reload nginx
```

## 11. Checklist final

- `npm run build:prod` termina sin errores
- `pm2 status` muestra `casino21-server` online
- `curl https://casino21.hunykho.com/health` responde `status: ok`
- el frontend carga por HTTPS
- el login funciona con Supabase
- el socket conecta sin errores
- `ALLOW_INSECURE_JWT_FALLBACK=false`

## 12. Observaciones

- El frontend se sirve como SPA estatica; `Nginx` resuelve rutas con `try_files`.
- El backend solo expone sockets y endpoints livianos (`/health` y opcionalmente `/rules_version`).
- Si necesitas cero downtime, el siguiente paso natural es agregar pipeline CI/CD y releases por carpeta versionada o contenedores.
