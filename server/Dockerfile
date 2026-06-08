# --- BUILD STAGE ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar todas las dependencias (incluyendo devDependencies para poder compilar con tsc)
RUN npm install

# Copiar el código fuente y la configuración de TypeScript
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Compilar TypeScript a JavaScript (genera la carpeta dist/)
RUN npm run build

# --- RUN STAGE ---
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar solo las dependencias de producción
RUN npm install --only=production

# Copiar el código JavaScript compilado desde el builder
COPY --from=builder /app/dist ./dist

# Definir variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Exponer el puerto
EXPOSE 4000

# Ejecutar el servidor
CMD ["npm", "start"]
