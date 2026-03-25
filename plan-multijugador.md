# Plan de Migración: Casino 21 a Multijugador Online

Este documento detalla la hoja de ruta para evolucionar el prototipo local de "Casino 21" hacia un juego competitivo multijugador online con arquitectura Cliente-Servidor utilizando WebSockets y persistencia en Base de Datos.

## FASE 1: Arquitectura Base y Servidor WebSocket (Backend)
**Objetivo:** Establecer el servidor Node.js y migrar la lógica del juego para que el backend sea la única fuente de la verdad (Autoridad del Servidor).

- [ ] **1.1. Inicialización del Servidor Backend**
  - Crear un directorio `/server` dentro del proyecto o un proyecto paralelo.
  - Inicializar proyecto Node.js con TypeScript.
  - Instalar dependencias base: `express`, `socket.io`, `cors`.

- [ ] **1.2. Migración del Core del Juego (Domain & Application)**
  - Mover las carpetas `domain` y `application` (modelos de cartas, validadores de acciones, motor del juego) al servidor.
  - Asegurar que la lógica no dependa de ninguna librería de frontend (React/DOM).

- [ ] **1.3. Implementación de WebSockets (Socket.io)**
  - Configurar el servidor de Socket.io.
  - Crear el gestor de conexiones y desconexiones de clientes.
  - Definir la estructura de salas (Rooms): un jugador crea una sala y otro se une mediante un código.

- [ ] **1.4. Flujo de Mensajes (Eventos)**
  - `join_room` / `create_room`: Para emparejamiento.
  - `game_start`: El servidor reparte las cartas y notifica a los jugadores.
  - `play_action`: El cliente envía su jugada al servidor.
  - `game_state_update`: El servidor valida la jugada y envía el nuevo estado de la mesa (ocultando las cartas del rival).

## FASE 2: Adaptación del Frontend (Cliente)
**Objetivo:** Conectar la interfaz de React existente al nuevo servidor WebSocket, eliminando el motor local.

- [ ] **2.1. Conexión del Cliente**
  - Instalar `socket.io-client` en el frontend.
  - Crear un contexto/hook `useSocket` para mantener la conexión global.

- [ ] **2.2. Nueva Pantalla de Lobby/Menú**
  - Interfaz para ingresar un "Nombre de Jugador".
  - Botones para "Crear Sala Privada" o "Unirse a Sala" (ingresando un código).
  - Sala de espera (Waiting Room) hasta que el oponente se conecte.

- [ ] **2.3. Refactorización de `useGame.ts`**
  - Eliminar el `GameEngine` local.
  - Ahora `playCard` emitirá un evento socket en lugar de mutar el estado local.
  - Escuchar el evento `game_state_update` para renderizar la mesa y la mano actual.

## FASE 3: Persistencia y Base de Datos
**Objetivo:** Guardar usuarios, historiales y estadísticas.

- [ ] **3.1. Elección y Configuración de DB**
  - Configurar base de datos (Ej: PostgreSQL con Prisma ORM o Supabase).
  - Diseñar el esquema de base de datos:
    - Tabla `Users` (ID, nombre, elo, victorias, derrotas).
    - Tabla `Matches` (ID, player1, player2, ganador, fecha).

- [ ] **3.2. Sistema de Autenticación**
  - Implementar registro y login (JWT o proveedor externo como Firebase/Supabase).
  - Proteger la conexión WebSocket con tokens de autenticación.

## FASE 4: Funcionalidades Competitivas y Pulido
**Objetivo:** Mejorar la experiencia del usuario y evitar comportamientos tóxicos o bloqueos.

- [ ] **4.1. Temporizador de Turno (Timer)**
  - Implementar un contador regresivo (ej. 30 segundos) manejado por el servidor.
  - Si el tiempo expira, forzar una jugada automática o pasar el turno.

- [ ] **4.2. Reconexión y Manejo de Desconexiones**
  - Si un jugador cierra la pestaña por error, permitirle reconectarse a la misma sala dentro de un margen de tiempo.
  - Notificar al rival: "El oponente se ha desconectado, esperando reconexión...".

- [ ] **4.3. Sistema de Rangos (Elo)**
  - Calcular y actualizar los puntos de los jugadores al finalizar la partida basándose en quién ganó.
  - Mostrar el Rango/Elo en el menú principal.

- [ ] **4.4. Pulido Visual y Feedback**
  - Añadir sonidos de cartas y notificaciones.
  - Feedback visual de "Esperando el turno del oponente".
