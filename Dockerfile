# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente necesario para compilar
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY index.html ./index.html
COPY vite.config.mts ./vite.config.mts
COPY tailwind.config.js ./tailwind.config.js
COPY postcss.config.js ./postcss.config.js
COPY tsconfig.json ./tsconfig.json

# Definir argumentos de compilación para Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SOCKET_URL
ARG VITE_SHOW_RULES_VERSION=false

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_SHOW_RULES_VERSION=$VITE_SHOW_RULES_VERSION
ENV NODE_ENV=production

# Compilar la aplicación y generar páginas SEO
RUN npm run build

# --- RUN STAGE ---
FROM nginx:alpine

# Copiar archivos compilados al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
