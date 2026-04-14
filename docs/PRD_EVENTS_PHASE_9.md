# PRD - Fase 9: Chat Integrado (Global y Espectadores)

## 1. Visión y Objetivos
Mejorar la interacción social en tiempo real dentro del juego. Implementar un sistema de chat en las salas de juego que permita a los jugadores comunicarse, y ofrecer un canal dedicado a los espectadores para comentar los torneos sin interrumpir a los competidores.

## 2. Alcance y Requerimientos

### 2.1. Canales de Chat
- **Canal de Jugadores**: Chat visible y utilizable por los jugadores activos en la sala. Los espectadores pueden leer este chat, pero (opcionalmente) no escribir en él.
- **Canal de Espectadores**: Chat exclusivo para espectadores. Los jugadores activos NO deben ver este chat para evitar distracciones o ayudas externas.

### 2.2. Interfaz de Usuario (UI)
- **Panel Lateral Retráctil**: En `GameScreen.tsx`, añadir un panel lateral (drawer) o una ventana sobrepuesta en una esquina para el chat.
- **Pestañas (Tabs)**: Si eres espectador, verás dos pestañas: "Partida" y "Espectadores".
- **Diseño**: Mantener el estilo Glassmorphism, mensajes con el nombre del usuario, timestamp y un color distintivo según el rol (jugador, espectador, admin).

### 2.3. Lógica del Servidor (Node.js / Socket.io)
- Nuevos eventos de Socket: `send_message`, `receive_message`.
- Validar el origen del mensaje. Si un espectador envía al canal de jugadores, bloquearlo o enviarlo solo al canal de espectadores.

## 3. Plan de Implementación
1. **Backend**: Agregar eventos de chat en `index.ts` que enruten los mensajes a los clientes correspondientes (usando `io.to(roomId).emit` y filtrando en el cliente, o emitiendo a listas específicas de sockets).
2. **Componente UI**: Crear `GameChat.tsx` que se superponga en la `GameScreen`.
3. **Integración**: Conectar el estado del chat al `useGame` hook.