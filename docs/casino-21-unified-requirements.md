# Casino 21 — Documento de Requisitos Unificado

> Versión consolidada de: `requirements.md` (reglas del juego), `plan-multijugador.md` (arquitectura online) y `.trae/requirements.md` (funcionalidades sociales y competitivas).

---

## 1. Introducción

Casino 21 es un juego de cartas tradicional basado en naipes españoles o franceses donde los jugadores compiten para alcanzar 21 puntos mediante la recolección estratégica de cartas del tablero. El sistema soporta:

- **Modo local**: 1 vs 1 y 2 vs 2 en el mismo dispositivo.
- **Modo online multijugador**: partidas en tiempo real vía WebSockets con arquitectura Cliente-Servidor.
- **Funcionalidades sociales y competitivas**: torneos, ligas, amistades, chat, logros y estadísticas.

La arquitectura objetivo es una app móvil React Native (Expo) conectada a un servidor Node.js con Socket.io y persistencia en Supabase/PostgreSQL.

---

## 2. Glosario

| Término | Definición |
|---|---|
| **Game_Engine** | Sistema principal que coordina todas las mecánicas del juego (reside en el servidor) |
| **Deck** | Mazo de 52 cartas tradicionales |
| **Board** | Tablero donde se colocan las cartas descubiertas |
| **Player** | Participante individual en el juego |
| **Team** | Equipo de dos jugadores en modo 2 vs 2 |
| **Hand** | Cartas ocultas que posee cada jugador |
| **Formation** | Combinación de cartas en el Board que suman un valor específico |
| **Llevar** | Acción de recoger cartas del Board que coinciden en valor con una carta de la Hand |
| **Virado** | Bonus otorgado cuando un jugador recoge la última carta del Board antes de finalizar la partida |
| **Round** | Serie de jugadas donde cada jugador recibe 4 cartas |
| **Match** | Partida completa que termina cuando un jugador o equipo alcanza 21 puntos |
| **Score_Calculator** | Componente que calcula los puntos al final de cada Round |
| **Card_Value** | Valor numérico de una carta (As=1, 2-10=valor nominal, J=11, Q=12, K=13) |
| **Backend** | Servidor Node.js con Socket.io que gestiona la lógica del juego |
| **Cliente** | Aplicación React Native que ejecuta el jugador |
| **Sala_Privada** | Sala de juego creada por un jugador para jugar con un amigo específico |
| **Torneo** | Competición estructurada con múltiples jugadores y rondas eliminatorias |
| **Liga** | Sistema de clasificación por temporadas con divisiones basadas en Elo |
| **Amistad** | Relación bidireccional entre dos jugadores que se han aceptado mutuamente |
| **Logro** | Reconocimiento otorgado al cumplir un objetivo específico |
| **Temporada** | Período de tiempo definido para el sistema de ligas |
| **División** | Nivel dentro de una liga basado en el rango Elo del jugador |

---

## 3. Módulo A — Mecánicas del Juego

### A.1 Inicialización del Juego

**User Story:** Como jugador, quiero iniciar una nueva partida seleccionando el modo de juego.

#### Acceptance Criteria

1. THE Game_Engine SHALL permitir seleccionar entre modo 1 vs 1 y modo 2 vs 2.
2. WHEN se inicia una partida, THE Game_Engine SHALL barajar el Deck completo de 52 cartas.
3. WHEN se inicia una partida, THE Game_Engine SHALL repartir 4 cartas ocultas a cada Player.
4. WHEN se inicia una partida, THE Game_Engine SHALL colocar 4 cartas descubiertas en el Board.
5. WHEN se inicia una partida, THE Game_Engine SHALL seleccionar aleatoriamente el primer Player.
6. THE Game_Engine SHALL asignar el turno final al Player que repartió las cartas.

### A.2 Gestión de Turnos

**User Story:** Como jugador, quiero que el sistema gestione los turnos correctamente.

#### Acceptance Criteria

1. THE Game_Engine SHALL mantener un orden secuencial de turnos entre los Players.
2. WHEN un Player completa su jugada, THE Game_Engine SHALL pasar el turno al siguiente Player.
3. WHILE es el turno de un Player, THE Game_Engine SHALL permitir solo a ese Player realizar acciones.
4. WHERE modo 2 vs 2, THE Game_Engine SHALL alternar turnos entre Players de equipos diferentes.
5. WHEN todos los Players han jugado sus 4 cartas, THE Game_Engine SHALL iniciar una nueva Round si quedan cartas en el Deck.

### A.3 Acción de Llevar Cartas

**User Story:** Como jugador, quiero llevar cartas del tablero que coincidan con el valor de mis cartas.

#### Acceptance Criteria

1. WHEN un Player selecciona una carta de su Hand, THE Game_Engine SHALL identificar todas las cartas en el Board con el mismo Card_Value.
2. WHEN un Player lleva cartas, THE Game_Engine SHALL remover las cartas coincidentes del Board y agregarlas a la colección del Player.
3. WHEN un Player lleva cartas, THE Game_Engine SHALL remover la carta jugada de la Hand del Player.
4. IF no hay cartas coincidentes en el Board, THEN THE Game_Engine SHALL colocar la carta del Player en el Board.
5. THE Game_Engine SHALL permitir llevar múltiples cartas del Board con una sola carta de la Hand si tienen el mismo Card_Value.

### A.4 Formación de Sumatorias

**User Story:** Como jugador, quiero formar sumatorias combinando cartas del tablero.

#### Acceptance Criteria

1. WHEN un Player selecciona cartas del Board cuya suma de Card_Value es igual a una carta en su Hand, THE Game_Engine SHALL permitir crear una Formation.
2. WHEN se crea una Formation, THE Game_Engine SHALL agrupar visualmente las cartas involucradas en el Board.
3. WHEN se crea una Formation, THE Game_Engine SHALL registrar el Player que la creó.
4. WHEN un Player lleva una Formation, THE Game_Engine SHALL remover todas las cartas de la Formation del Board.
5. THE Game_Engine SHALL permitir a cualquier Player llevar una Formation creada por otro Player si tiene una carta con el Card_Value correspondiente.

### A.5 Formar Pares sobre Formaciones

**User Story:** Como jugador, quiero colocar una carta sobre una formación existente del mismo valor.

#### Acceptance Criteria

1. WHEN existe una Formation en el Board, THE Game_Engine SHALL permitir a un Player colocar una carta con el mismo Card_Value sobre ella.
2. WHEN se forma un par sobre una Formation, THE Game_Engine SHALL actualizar la Formation para incluir la nueva carta.
3. WHEN se lleva una Formation con pares, THE Game_Engine SHALL entregar todas las cartas de la Formation al Player.
4. THE Game_Engine SHALL mantener visible el Card_Value total de cada Formation en el Board.

### A.6 Cantar una Carta (Ases)

**User Story:** Como jugador, quiero cantar una carta cuando tengo dos Ases y no puedo hacer formaciones.

#### Acceptance Criteria

1. WHEN un Player tiene dos Ases en su Hand, THE Game_Engine SHALL permitir la acción de cantar.
2. WHEN un Player canta un As, THE Game_Engine SHALL colocar el As en el Board de forma especial.
3. WHEN un Player canta un As, THE Game_Engine SHALL prevenir que otros Players lleven ese As hasta el próximo turno del Player que lo cantó.
4. THE Game_Engine SHALL permitir cantar solo cuando el Player tiene al menos dos Ases en su Hand.
5. IF un Player intenta cantar sin tener dos Ases, THEN THE Game_Engine SHALL rechazar la acción.

### A.7 Sistema de Virado

**User Story:** Como jugador, quiero obtener un virado cuando recojo la última carta del tablero.

#### Acceptance Criteria

1. WHEN un Player lleva la última carta del Board antes de finalizar la Match, THE Game_Engine SHALL otorgar un Virado al Player.
2. WHEN se otorga un Virado, THE Game_Engine SHALL registrarlo para el cálculo de puntos.
3. THE Game_Engine SHALL permitir múltiples Virados por Player durante una Match.
4. WHEN finaliza una Round, THE Score_Calculator SHALL sumar 1 punto por cada Virado obtenido.
5. THE Game_Engine SHALL mostrar visualmente cuando un Player obtiene un Virado.

### A.8 Cálculo de Puntuación por Ronda

**User Story:** Como jugador, quiero que el sistema calcule automáticamente los puntos al final de cada ronda.

#### Acceptance Criteria

1. WHEN finaliza una Round, THE Score_Calculator SHALL contar las cartas recolectadas por cada Player o Team.
2. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 3 puntos al Player o Team con la mayoría de cartas.
3. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto al Player o Team con la mayoría de picas.
4. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 2 puntos al Player o Team que tenga el 10 de diamantes.
5. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto al Player o Team que tenga el 2 de picas.
6. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto por cada As recolectado.
7. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto por cada Virado obtenido.
8. THE Score_Calculator SHALL sumar los puntos de la Round al total acumulado de cada Player o Team.

### A.9 Reglas Especiales al Acercarse a 21 Puntos

**User Story:** Como jugador, quiero que el sistema aplique reglas especiales cuando me acerco a 21 puntos.

#### Acceptance Criteria

1. WHEN un Player o Team tiene 17 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas y mayoría de picas.
2. WHEN un Player o Team tiene 18 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas.
3. WHEN un Player o Team tiene 19 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas.
4. WHEN un Player o Team tiene 20 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de picas.
5. THE Score_Calculator SHALL aplicar estas restricciones automáticamente basándose en el puntaje actual.

### A.10 Condición de Victoria

**User Story:** Como jugador, quiero que el juego termine cuando alguien alcance 21 puntos.

#### Acceptance Criteria

1. WHEN un Player o Team alcanza exactamente 21 puntos, THE Game_Engine SHALL declarar al Player o Team como ganador.
2. WHEN un Player o Team alcanza más de 21 puntos, THE Game_Engine SHALL declarar al Player o Team como ganador.
3. WHEN se declara un ganador, THE Game_Engine SHALL finalizar la Match.
4. THE Game_Engine SHALL mostrar el puntaje final y el ganador al finalizar la Match.

### A.11 Gestión de Rondas

**User Story:** Como jugador, quiero que el sistema gestione correctamente las rondas del juego.

#### Acceptance Criteria

1. WHERE modo 1 vs 1, THE Game_Engine SHALL permitir 6 jugadas por Player por Round.
2. WHERE modo 2 vs 2, THE Game_Engine SHALL permitir 3 jugadas por Player por Round.
3. WHEN todos los Players han jugado todas sus cartas de la Round, THE Game_Engine SHALL calcular los puntos.
4. WHEN quedan cartas en el Deck y ningún Player ha alcanzado 21 puntos, THE Game_Engine SHALL iniciar una nueva Round.
5. WHEN se inicia una nueva Round, THE Game_Engine SHALL repartir 4 cartas nuevas a cada Player.
6. IF el Deck no tiene suficientes cartas para una nueva Round, THEN THE Game_Engine SHALL finalizar la Match y declarar ganador al Player o Team con más puntos.

### A.12 Restricciones de Juego

**User Story:** Como jugador, quiero que el sistema impida acciones prohibidas.

#### Acceptance Criteria

1. WHEN una partida ha iniciado, THE Game_Engine SHALL prevenir que los Players vean las cartas ocultas de otros Players.
2. WHERE modo 2 vs 2, THE Game_Engine SHALL prevenir comunicación o señales entre compañeros de Team.
3. THE Game_Engine SHALL prevenir que un Player realice acciones fuera de su turno.
4. THE Game_Engine SHALL validar cada acción antes de ejecutarla.
5. IF un Player intenta una acción inválida, THEN THE Game_Engine SHALL mostrar un mensaje de error y permitir seleccionar otra acción.

### A.13 Validación de Acciones

**User Story:** Como jugador, quiero que el sistema valide mis acciones antes de ejecutarlas.

#### Acceptance Criteria

1. WHEN un Player intenta llevar cartas, THE Game_Engine SHALL verificar que el Card_Value coincida.
2. WHEN un Player intenta crear una Formation, THE Game_Engine SHALL verificar que la suma de Card_Values sea correcta.
3. WHEN un Player intenta cantar un As, THE Game_Engine SHALL verificar que el Player tenga al menos dos Ases.
4. IF una acción es inválida, THEN THE Game_Engine SHALL mostrar un mensaje explicativo y permitir otra acción.
5. THE Game_Engine SHALL prevenir que un Player termine su turno sin jugar una carta.

---

## 4. Módulo B — Arquitectura Multijugador Online

### B.1 Servidor Backend (Node.js + Socket.io)

#### Acceptance Criteria

1. THE Backend SHALL exponer un servidor Socket.io para comunicación en tiempo real.
2. THE Backend SHALL ser la única fuente de verdad (autoridad del servidor) para el estado del juego.
3. THE Backend SHALL gestionar salas (Rooms): un jugador crea una sala y otro se une mediante un código de 6 caracteres.
4. THE Backend SHALL emitir el evento `game_start` repartiendo cartas y notificando a los jugadores.
5. WHEN un Cliente envía el evento `play_action`, THE Backend SHALL validar la jugada y emitir `game_state_update` con el nuevo estado (ocultando cartas del rival).
6. THE Backend SHALL gestionar conexiones y desconexiones de clientes.

### B.2 Flujo de Eventos WebSocket

| Evento | Dirección | Descripción |
|---|---|---|
| `create_room` | Cliente → Servidor | Crear sala privada |
| `join_room` | Cliente → Servidor | Unirse a sala con código |
| `game_start` | Servidor → Clientes | Inicio de partida con estado inicial |
| `play_action` | Cliente → Servidor | Jugada del jugador |
| `game_state_update` | Servidor → Clientes | Nuevo estado del tablero |
| `turn_timer` | Servidor → Clientes | Contador regresivo del turno |
| `player_disconnected` | Servidor → Clientes | Notificación de desconexión |
| `player_reconnected` | Servidor → Clientes | Notificación de reconexión |

### B.3 Lobby y Emparejamiento

#### Acceptance Criteria

1. THE Cliente SHALL mostrar una pantalla de lobby con campo para nombre de jugador.
2. THE Cliente SHALL ofrecer botones para "Crear Sala Privada" y "Unirse a Sala" (con código).
3. THE Cliente SHALL mostrar una sala de espera hasta que el oponente se conecte.
4. THE Backend SHALL generar códigos de sala únicos de 6 caracteres alfanuméricos.

### B.4 Temporizador de Turno

#### Acceptance Criteria

1. THE Backend SHALL implementar un contador regresivo de 30 segundos por turno.
2. IF el tiempo expira, THE Backend SHALL forzar una jugada automática o pasar el turno.
3. THE Cliente SHALL mostrar el contador regresivo visualmente durante el turno activo.

### B.5 Reconexión y Manejo de Desconexiones

#### Acceptance Criteria

1. IF un jugador se desconecta, THE Backend SHALL mantener la sala activa durante 60 segundos.
2. THE Backend SHALL notificar al rival: "El oponente se ha desconectado, esperando reconexión...".
3. WHEN el jugador se reconecta dentro del margen de tiempo, THE Backend SHALL restaurar el estado de la partida.

---

## 5. Módulo C — Persistencia y Base de Datos

### C.1 Esquema de Base de Datos

#### Tablas principales

- `users`: id, nombre, elo, victorias, derrotas, xp, nivel, título_activo, created_at
- `matches`: id, player1_id, player2_id, ganador_id, fecha, cambio_elo_p1, cambio_elo_p2
- `friendships`: id, user1_id, user2_id, estado (pending/accepted), created_at
- `tournaments`: id, creador_id, código, max_participantes, estado, created_at
- `tournament_participants`: tournament_id, user_id, posición_final
- `achievements`: id, nombre, descripción, categoría, xp_reward
- `user_achievements`: user_id, achievement_id, desbloqueado_at
- `chat_messages`: id, match_id, autor_id, contenido, timestamp
- `notifications`: id, user_id, tipo, contenido, leída, created_at
- `league_seasons`: id, número, inicio, fin
- `league_standings`: season_id, user_id, elo_final, posición, división

#### Acceptance Criteria

1. THE Backend SHALL persistir todos los datos usando transacciones para garantizar consistencia.
2. WHEN ocurre un error de persistencia, THE Backend SHALL registrar el error y notificar al jugador.
3. THE Backend SHALL realizar backups automáticos cada 24 horas.
4. THE Backend SHALL sincronizar el estado del jugador entre dispositivos en menos de 2 segundos.

### C.2 Autenticación

#### Acceptance Criteria

1. THE Backend SHALL implementar registro y login con JWT o proveedor externo (Supabase Auth).
2. THE Backend SHALL proteger la conexión WebSocket con tokens de autenticación.
3. THE Backend SHALL validar todas las entradas de usuario para prevenir inyección de código.

---

## 6. Módulo D — Funcionalidades Sociales y Competitivas

### D.1 Sistema de Torneos

**User Story:** Como jugador competitivo, quiero participar en torneos estructurados.

#### Acceptance Criteria

1. THE Sistema SHALL permitir crear torneos con 4, 8, 16 o 32 participantes.
2. WHEN se crea un torneo, THE Backend SHALL generar un código único de 6 caracteres alfanuméricos.
3. WHEN el número de participantes alcanza el límite, THE Backend SHALL iniciar el torneo automáticamente.
4. THE Backend SHALL generar un bracket de eliminación simple con emparejamientos aleatorios.
5. WHEN una partida de torneo finaliza, THE Backend SHALL registrar el resultado y avanzar al ganador.
6. WHEN un jugador no se presenta en 5 minutos, THE Backend SHALL descalificarlo y avanzar a su oponente.
7. THE Sistema SHALL mostrar el bracket completo con resultados en tiempo real.
8. WHEN el torneo finaliza, THE Backend SHALL registrar al ganador y otorgar recompensas.

### D.2 Sistema de Ligas por Temporadas

**User Story:** Como jugador regular, quiero competir en ligas por temporadas.

#### Acceptance Criteria

1. THE Backend SHALL organizar jugadores en divisiones por Elo: Bronce (0-1199), Plata (1200-1499), Oro (1500-1799), Platino (1800-2099), Diamante (2100+).
2. THE Sistema SHALL definir temporadas de 30 días.
3. WHEN una temporada finaliza, THE Backend SHALL calcular posiciones finales y otorgar recompensas.
4. WHEN una nueva temporada comienza, THE Backend SHALL ajustar el Elo de todos los jugadores hacia 1500 en un 20%.
5. THE Sistema SHALL mostrar la tabla de clasificación con los top 100 jugadores de la división.
6. WHEN un jugador sube o baja de división, THE Sistema SHALL notificar al jugador.

### D.3 Chat en Tiempo Real

**User Story:** Como jugador social, quiero comunicarme con mi oponente durante la partida.

#### Acceptance Criteria

1. WHEN una partida comienza, THE Sistema SHALL habilitar un canal de chat entre los dos jugadores.
2. THE Backend SHALL validar que los mensajes tengan entre 1 y 200 caracteres.
3. THE Backend SHALL transmitir mensajes al oponente en menos de 100ms.
4. THE Backend SHALL registrar todos los mensajes con timestamp y autor durante 30 días.
5. THE Sistema SHALL mostrar los últimos 50 mensajes del chat.
6. WHEN un jugador envía más de 10 mensajes en 30 segundos, THE Backend SHALL aplicar rate limit de 5 segundos.
7. THE Sistema SHALL filtrar palabras ofensivas reemplazándolas con asteriscos.
8. THE Sistema SHALL permitir a los jugadores silenciar el chat o reportar mensajes.

### D.4 Sistema de Amistades e Invitaciones

**User Story:** Como jugador social, quiero agregar amigos y jugar partidas privadas con ellos.

#### Acceptance Criteria

1. THE Sistema SHALL permitir buscar jugadores por nombre de usuario.
2. THE Sistema SHALL permitir enviar, aceptar o rechazar solicitudes de amistad.
3. WHEN un jugador acepta una solicitud, THE Backend SHALL crear una relación bidireccional.
4. THE Sistema SHALL mostrar lista de amigos con estado: online, offline, en partida.
5. WHEN un amigo se conecta, THE Sistema SHALL notificar a sus amigos online.
6. THE Sistema SHALL permitir invitar a un amigo online a una partida privada.
7. WHEN un jugador acepta una invitación, THE Backend SHALL crear una Sala_Privada y conectar a ambos.
8. THE Sistema SHALL limitar el número máximo de amigos a 100 por jugador.

### D.5 Estadísticas Avanzadas

**User Story:** Como jugador analítico, quiero ver estadísticas detalladas de mi desempeño.

#### Acceptance Criteria

1. THE Backend SHALL calcular y almacenar: total de partidas, victorias, derrotas, racha actual, mejor racha, Elo actual, Elo máximo histórico.
2. THE Sistema SHALL mostrar un gráfico de evolución del Elo en los últimos 30 días.
3. THE Sistema SHALL mostrar las últimas 20 partidas con fecha, oponente, resultado y cambio de Elo.
4. THE Sistema SHALL permitir ver las estadísticas públicas de otros jugadores.
5. THE Backend SHALL actualizar todas las estadísticas inmediatamente después de cada partida.
6. THE Sistema SHALL mostrar comparativas de estadísticas entre el jugador y sus amigos.

### D.6 Sistema de Logros

**User Story:** Como jugador motivado por objetivos, quiero desbloquear logros.

#### Acceptance Criteria

1. THE Sistema SHALL definir al menos 20 logros con criterios específicos de desbloqueo.
2. THE Backend SHALL verificar automáticamente el progreso de logros después de cada partida.
3. WHEN un jugador cumple los criterios de un logro, THE Backend SHALL otorgarlo inmediatamente.
4. THE Sistema SHALL categorizar logros en: Principiante, Intermedio, Avanzado, Maestro.
5. THE Sistema SHALL mostrar el progreso hacia logros no completados.
6. THE Backend SHALL otorgar XP al desbloquear logros según su dificultad.

### D.7 Sistema de Recompensas y Niveles

**User Story:** Como jugador competitivo, quiero recibir recompensas por mis logros.

#### Acceptance Criteria

1. THE Backend SHALL otorgar XP por partida: 50 XP por victoria, 20 XP por derrota.
2. THE Backend SHALL calcular el nivel con la fórmula: `nivel = floor(sqrt(XP / 100))`.
3. WHEN un jugador sube de nivel, THE Sistema SHALL notificar al jugador.
4. THE Backend SHALL otorgar XP por torneos: 500 (1°), 300 (2°), 150 (3°).
5. THE Backend SHALL otorgar XP por posición en ligas: top 10 → 1000 XP, top 50 → 500 XP, top 100 → 200 XP.
6. THE Backend SHALL otorgar títulos especiales por logros específicos.
7. THE Sistema SHALL permitir seleccionar un título activo de los títulos desbloqueados.

### D.8 Notificaciones en Tiempo Real

**User Story:** Como jugador activo, quiero recibir notificaciones de eventos importantes.

#### Acceptance Criteria

1. THE Sistema SHALL notificar en tiempo real: solicitudes de amistad, invitaciones de partida, conexión de amigos, inicio de torneo (2 min antes), desbloqueo de logros, subida de nivel.
2. THE Sistema SHALL mantener un historial de notificaciones de las últimas 24 horas.
3. THE Sistema SHALL mostrar un contador de notificaciones no leídas en el menú principal.
4. THE Sistema SHALL permitir marcar notificaciones como leídas.

### D.9 Moderación y Seguridad

**User Story:** Como jugador, quiero un entorno seguro y respetuoso.

#### Acceptance Criteria

1. THE Sistema SHALL permitir reportar jugadores por comportamiento inapropiado.
2. THE Backend SHALL bloquear automáticamente a jugadores con 5 reportes en 24 horas.
3. THE Sistema SHALL permitir bloquear jugadores para no ser emparejado con ellos.
4. THE Backend SHALL aplicar rate limiting: máximo 100 acciones por minuto por jugador.
5. THE Backend SHALL detectar y prevenir intentos de manipulación de resultados.
6. THE Backend SHALL registrar todas las acciones sospechosas en un log de auditoría.

---

## 7. Módulo E — Interfaz de Usuario (App Móvil)

### E.1 Pantallas Principales

| Pantalla | Descripción |
|---|---|
| Splash / Onboarding | Presentación del juego y registro/login |
| Lobby / Menú Principal | Acceso a modos de juego, amigos, torneos, perfil |
| Sala de Espera | Espera de oponente con código de sala |
| Tablero de Juego | Vista principal del juego en tiempo real |
| Resultados de Ronda | Puntuación al finalizar cada ronda |
| Resultados de Partida | Ganador, cambio de Elo, XP ganado |
| Perfil de Jugador | Estadísticas, logros, historial |
| Amigos | Lista de amigos, búsqueda, solicitudes |
| Torneos | Crear/unirse, bracket en tiempo real |
| Ligas | Clasificación, temporada actual |
| Notificaciones | Historial de notificaciones |
| Configuración | Sonido, notificaciones, cuenta |

### E.2 Requisitos de UI del Tablero

#### Acceptance Criteria

1. THE Cliente SHALL mostrar las 4 cartas del Board de forma visible.
2. THE Cliente SHALL mostrar las cartas de la Hand del Player actual solo para ese Player.
3. THE Cliente SHALL mostrar el puntaje actual de cada Player o Team.
4. THE Cliente SHALL mostrar qué Player tiene el turno actual y el temporizador regresivo.
5. THE Cliente SHALL mostrar las Formations activas en el Board con sus Card_Values.
6. THE Cliente SHALL mostrar el número de cartas recolectadas por cada Player o Team.
7. THE Cliente SHALL mostrar los Virados obtenidos por cada Player o Team.
8. THE Cliente SHALL mostrar feedback visual de "Esperando el turno del oponente".

---

## 8. Hoja de Ruta de Implementación

### Fase 1 — Core del Juego (Backend)
- Migrar `domain` y `application` al servidor Node.js.
- Configurar Socket.io con gestión de salas.
- Implementar flujo completo de eventos del juego.

### Fase 2 — Frontend Móvil
- Conectar app React Native al servidor via `socket.io-client`.
- Implementar pantallas de Lobby, Sala de Espera y Tablero.
- Refactorizar `useGame.ts` para emitir eventos en lugar de mutar estado local.

### Fase 3 — Persistencia
- Configurar Supabase/PostgreSQL con el esquema definido.
- Implementar autenticación con Supabase Auth.
- Persistir partidas, estadísticas y usuarios.

### Fase 4 — Funcionalidades Sociales
- Sistema de amistades e invitaciones.
- Chat en tiempo real.
- Notificaciones push.

### Fase 5 — Competitivo
- Sistema de torneos con bracket.
- Ligas por temporadas.
- Logros, recompensas y niveles.

### Fase 6 — Pulido
- Temporizador de turno con jugada automática.
- Reconexión y manejo de desconexiones.
- Sonidos, animaciones y feedback visual.
- Moderación y seguridad.
