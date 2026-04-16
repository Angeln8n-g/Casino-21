# Despliegue a Producción en VPS

Esta guía deja `Casino 21` listo para correr en un VPS Ubuntu con:

- `Nginx` sirviendo el frontend estático y como Reverse Proxy para Sockets.
- `PM2` manteniendo vivo el backend Socket.IO.
- `Node.js 20`
- `Supabase` como proveedor de auth y base de datos.

## 1. Requisitos del VPS y DNS

- Ubuntu 22.04 o 24.04
- Dominio apuntando a la IP VPS **(Asegúrate de que haya propagado)**
- Node.js 20+
- `npm`
- `nginx`
- `pm2`

Instalación base y apertura de puertos (Firewall):

```bash
sudo apt update
sudo apt install -y nginx curl git

# Asegurar que el Firewall permita tráfico Web y SSH
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Verificación DNS esperada (No continúes al paso 8 de SSL si esto no cuadra):

```bash
dig +short casino21.hunykho.com
# Debe responder exactamente tu IP: 84.247.169.189
```

## 2. Clonar el proyecto

*Nota: Asegúrate de tener configurado un Deploy Key (SSH) o usar un Personal Access Token de Github/Gitlab si el repositorio es privado, de lo contrario esto fallará pidiendo credenciales.*

```bash
# Crea la carpeta con permisos para tu usuario actual
sudo mkdir -p /var/www/casino21
sudo chown -R $USER:$USER /var/www/casino21
cd /var/www/casino21

# Reemplaza <TU_REPOSITORIO> por tu URL SSH o HTTPS
git clone <TU_REPOSITORIO> current
cd current
```

## 3. Variables de entorno

> **¡CUIDADO!** Un error de tipeo en las variables evitará que la app conecte con Supabase de forma silenciosa.

### Frontend `.env`

Crear `./.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
# Si Nginx maneja el front y back bajo el mismo dominio, déjalo vacío
VITE_SOCKET_URL=
```

### Backend `server/.env`

Crear `./server/.env`:

```env
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# IMPORTANTE: Este JWT_SECRET debe coincidir EXACTAMENTE con el de las opciones de tu proyecto Supabase.
JWT_SECRET=tu_jwt_secret

# IMPORTANTE: Asegúrate de que lleve https:// y no termine en slash (/)
CORS_ORIGINS=https://casino21.hunykho.com
ALLOW_INSECURE_JWT_FALLBACK=false
EXPOSE_RULES_VERSION=false
```

## 4. Instalar dependencias

*Aviso OOM: Si tu VPS tiene 1GB de RAM o menos, procesos como `npm ci` o builds intensivos pueden matarse por falta de memoria ("Killed"). Considera añadir memoria Swap a Linux si ocurre.*

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

*Aviso: Este paso asume que tienes un `ecosystem.config.cjs` en la raíz de tu proyecto bien configurado.*

```bash
cd /var/www/casino21/current
pm2 start ecosystem.config.cjs
pm2 save

# Genera el script de auto-arranque. 
pm2 startup
```
> **⛔ ALTO:** El comando `pm2 startup` imprimirá una línea que empieza con `sudo env PATH=...`. **Debes copiar esa línea en tu terminal y ejecutarla** para que el servicio arranque con los reinicios del servidor.

Comandos útiles:
```bash
pm2 status
pm2 logs casino21-server
```

## 7. Configurar Nginx

Toma en cuenta que ya que usas Socket.IO, tu archivo de configuración de Nginx (`casino21.conf`) **debe** incluir cabeceras de actualización para WebSockets, por ejemplo:
`proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade";`

Copia la configuración y verifica que no tenga errores:

```bash
sudo cp /var/www/casino21/current/deploy/nginx/casino21.conf /etc/nginx/sites-available/casino21.conf
sudo ln -s /etc/nginx/sites-available/casino21.conf /etc/nginx/sites-enabled/casino21.conf

# Verificar sintaxis antes de reiniciar (vital para no tirar el servidor)
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d casino21.hunykho.com
```

## 9. Healthcheck

Backend (Local):
```bash
curl http://127.0.0.1:4000/health
```

Dominio público (Comprueba si Nginx enrutó bien):
```bash
curl https://casino21.hunykho.com/health
```

## 10. Flujo de actualización

Para cuando subas nuevos cambios.

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
- `pm2 status` muestra `casino21-server` online sin el status en "errored"
- `curl https://casino21.hunykho.com/health` responde `status: ok`
- el frontend carga por HTTPS
- el login funciona con Supabase
- el socket conecta sin errores de red o auth (revisa consola de DevTools)
