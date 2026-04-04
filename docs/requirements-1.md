# Documento de Requisitos: Funcionalidades Sociales y Competitivas

## Introducción

Este documento define los requisitos para implementar funcionalidades sociales y competitivas en el juego multijugador Casino 21. El sistema base ya cuenta con autenticación, matchmaking mediante salas, motor de juego, y sistema de ranking Elo. Las nuevas funcionalidades incluyen: sistema de torneos/ligas, chat en tiempo real, sistema de amistades/invitaciones, estadísticas avanzadas, y sistema de recompensas/logros.

## Glosario

- **Sistema**: El sistema completo de Casino 21 (backend + frontend)
- **Backend**: El servidor Node.js con Socket.io que gestiona la lógica del juego
- **Cliente**: La aplicación React que ejecuta el jugador
- **Jugador**: Usuario autenticado que participa en partidas
- **Partida**: Una sesión de juego entre dos jugadores
- **Torneo**: Competición estructurada con múltiples jugadores y rondas eliminatorias
- **Liga**: Sistema de clasificación por temporadas con divisiones basadas en Elo
- **Amistad**: Relación bidireccional entre dos jugadores que se han aceptado mutuamente
- **Invitación**: Solicitud de un jugador a otro para establecer una amistad o jugar una partida
- **Logro**: Reconocimiento otorgado al cumplir un objetivo específico
- **Recompensa**: Beneficio otorgado al jugador por completar logros o ganar torneos
- **Sala_Privada**: Sala de juego creada por un jugador para jugar con un amigo específico
- **Mensaje_Chat**: Texto enviado por un jugador durante una partida
- **Estadística**: Métrica calculada sobre el desempeño del jugador
- **Temporada**: Período de tiempo definido para el sistema de ligas
- **División**: Nivel dentro de una liga basado en el rango Elo del jugador

## Requisitos

### Requisito 1: Sistema de Torneos

**User Story:** Como jugador competitivo, quiero participar en torneos estructurados, para poder competir por premios y demostrar mis habilidades.

#### Acceptance Criteria

1. THE Sistema SHALL permitir a los jugadores crear torneos con configuración de número de participantes (4, 8, 16, 32)
2. WHEN un jugador crea un torneo, THE Backend SHALL generar un código único de torneo de 6 caracteres alfanuméricos
3. THE Sistema SHALL permitir a los jugadores unirse a torneos mediante el código de torneo
4. WHEN el número de participantes alcanza el límite configurado, THE Backend SHALL iniciar el torneo automáticamente
5. THE Backend SHALL generar un bracket de eliminación simple con emparejamientos aleatorios
6. WHEN una partida de torneo finaliza, THE Backend SHALL registrar el resultado y avanzar al ganador a la siguiente ronda
7. THE Backend SHALL notificar a los jugadores cuando su próxima partida de torneo esté lista
8. WHEN un jugador no se presenta en 5 minutos, THE Backend SHALL descalificar al jugador y avanzar a su oponente
9. THE Sistema SHALL mostrar el bracket completo del torneo con resultados en tiempo real
10. WHEN el torneo finaliza, THE Backend SHALL registrar al ganador y otorgar recompensas según la posición final

### Requisito 2: Sistema de Ligas por Temporadas

**User Story:** Como jugador regular, quiero competir en ligas por temporadas, para tener objetivos a largo plazo y ver mi progreso.

#### Acceptance Criteria

1. THE Backend SHALL organizar a los jugadores en divisiones basadas en su Elo: Bronce (0-1199), Plata (1200-1499), Oro (1500-1799), Platino (1800-2099), Diamante (2100+)
2. THE Sistema SHALL definir temporadas con duración de 30 días
3. WHEN una temporada finaliza, THE Backend SHALL calcular las posiciones finales de cada jugador en su división
4. THE Backend SHALL otorgar recompensas a los jugadores según su posición final en la división
5. WHEN una nueva temporada comienza, THE Backend SHALL ajustar el Elo de todos los jugadores hacia 1500 en un 20%
6. THE Sistema SHALL mostrar la tabla de clasificación de la división del jugador con los top 100 jugadores
7. THE Sistema SHALL mostrar el tiempo restante de la temporada actual
8. THE Sistema SHALL permitir a los jugadores ver su historial de temporadas anteriores
9. WHEN un jugador sube o baja de división durante la temporada, THE Sistema SHALL notificar al jugador del cambio

### Requisito 3: Chat en Tiempo Real

**User Story:** Como jugador social, quiero comunicarme con mi oponente durante la partida, para hacer el juego más interactivo y divertido.

#### Acceptance Criteria

1. WHEN una partida comienza, THE Sistema SHALL habilitar un canal de chat entre los dos jugadores
2. WHEN un jugador envía un mensaje, THE Backend SHALL validar que el mensaje tenga entre 1 y 200 caracteres
3. WHEN un jugador envía un mensaje, THE Backend SHALL transmitir el mensaje al oponente en menos de 100ms
4. THE Backend SHALL registrar todos los mensajes de chat con timestamp y autor
5. THE Sistema SHALL mostrar los últimos 50 mensajes del chat de la partida actual
6. THE Sistema SHALL permitir a los jugadores reportar mensajes ofensivos
7. WHEN un jugador reporta un mensaje, THE Backend SHALL marcar el mensaje para revisión moderada
8. THE Sistema SHALL permitir a los jugadores silenciar el chat durante la partida
9. WHEN un jugador envía más de 10 mensajes en 30 segundos, THE Backend SHALL aplicar un rate limit de 5 segundos entre mensajes
10. THE Sistema SHALL filtrar palabras ofensivas predefinidas reemplazándolas con asteriscos

### Requisito 4: Sistema de Amistades e Invitaciones

**User Story:** Como jugador social, quiero agregar amigos y jugar partidas privadas con ellos, para disfrutar el juego con personas conocidas.

#### Acceptance Criteria

1. THE Sistema SHALL permitir a los jugadores buscar otros jugadores por nombre de usuario
2. WHEN un jugador encuentra otro jugador, THE Sistema SHALL permitir enviar una solicitud de amistad
3. WHEN un jugador recibe una solicitud de amistad, THE Sistema SHALL notificar al jugador en tiempo real
4. THE Sistema SHALL permitir al jugador aceptar o rechazar solicitudes de amistad
5. WHEN un jugador acepta una solicitud, THE Backend SHALL crear una relación de amistad bidireccional
6. THE Sistema SHALL mostrar una lista de amigos con su estado de conexión (online, offline, en partida)
7. WHEN un amigo se conecta, THE Sistema SHALL notificar a los amigos online del jugador
8. THE Sistema SHALL permitir a los jugadores invitar a un amigo online a una partida privada
9. WHEN un jugador recibe una invitación de partida, THE Sistema SHALL mostrar una notificación con opción de aceptar o rechazar
10. WHEN un jugador acepta una invitación, THE Backend SHALL crear una Sala_Privada y conectar a ambos jugadores
11. THE Sistema SHALL permitir a los jugadores eliminar amigos de su lista
12. THE Sistema SHALL limitar el número máximo de amigos a 100 por jugador

### Requisito 5: Estadísticas Avanzadas

**User Story:** Como jugador analítico, quiero ver estadísticas detalladas de mi desempeño, para identificar áreas de mejora y seguir mi progreso.

#### Acceptance Criteria

1. THE Backend SHALL calcular y almacenar las siguientes estadísticas por jugador: total de partidas, victorias, derrotas, racha actual, mejor racha, Elo actual, Elo máximo histórico
2. THE Backend SHALL calcular el porcentaje de victorias del jugador
3. THE Backend SHALL registrar el tiempo promedio por turno del jugador
4. THE Backend SHALL registrar el número de cartas jugadas por el jugador en cada posición del tablero
5. THE Sistema SHALL mostrar un gráfico de evolución del Elo del jugador en los últimos 30 días
6. THE Sistema SHALL mostrar las últimas 20 partidas del jugador con fecha, oponente, resultado y cambio de Elo
7. THE Sistema SHALL calcular y mostrar estadísticas de rendimiento por división (victorias/derrotas en cada división)
8. THE Sistema SHALL permitir a los jugadores ver las estadísticas públicas de otros jugadores
9. THE Backend SHALL actualizar todas las estadísticas inmediatamente después de finalizar cada partida
10. THE Sistema SHALL mostrar comparativas de estadísticas entre el jugador y sus amigos

### Requisito 6: Sistema de Logros

**User Story:** Como jugador motivado por objetivos, quiero desbloquear logros, para tener metas adicionales y sentir progreso constante.

#### Acceptance Criteria

1. THE Sistema SHALL definir al menos 20 logros diferentes con criterios específicos de desbloqueo
2. THE Backend SHALL verificar automáticamente el progreso de logros después de cada partida
3. WHEN un jugador cumple los criterios de un logro, THE Backend SHALL otorgar el logro al jugador
4. WHEN un jugador desbloquea un logro, THE Sistema SHALL mostrar una notificación visual con el nombre y descripción del logro
5. THE Sistema SHALL mostrar el progreso actual hacia logros no completados
6. THE Sistema SHALL categorizar logros en: Principiante, Intermedio, Avanzado, Maestro
7. THE Sistema SHALL mostrar el porcentaje de jugadores que han desbloqueado cada logro
8. THE Sistema SHALL permitir a los jugadores ver todos los logros disponibles y su progreso
9. THE Backend SHALL otorgar puntos de experiencia al desbloquear logros según su dificultad
10. THE Sistema SHALL mostrar los logros desbloqueados en el perfil público del jugador

### Requisito 7: Sistema de Recompensas

**User Story:** Como jugador competitivo, quiero recibir recompensas por mis logros, para sentir que mi esfuerzo es reconocido.

#### Acceptance Criteria

1. THE Backend SHALL otorgar puntos de experiencia (XP) por cada partida completada: 50 XP por victoria, 20 XP por derrota
2. THE Backend SHALL calcular el nivel del jugador basado en XP acumulado con fórmula: nivel = floor(sqrt(XP / 100))
3. WHEN un jugador sube de nivel, THE Sistema SHALL notificar al jugador y mostrar el nuevo nivel
4. THE Backend SHALL otorgar recompensas especiales por ganar torneos: 500 XP por primer lugar, 300 XP por segundo lugar, 150 XP por tercer lugar
5. THE Backend SHALL otorgar recompensas por posición final en ligas: top 10 recibe 1000 XP, top 50 recibe 500 XP, top 100 recibe 200 XP
6. THE Sistema SHALL mostrar el nivel y XP del jugador en su perfil
7. THE Sistema SHALL mostrar una barra de progreso hacia el siguiente nivel
8. THE Backend SHALL otorgar títulos especiales por logros específicos que los jugadores pueden mostrar en su perfil
9. THE Sistema SHALL permitir a los jugadores seleccionar un título activo de los títulos desbloqueados
10. THE Sistema SHALL mostrar el título activo del jugador en el lobby y durante las partidas

### Requisito 8: Notificaciones en Tiempo Real

**User Story:** Como jugador activo, quiero recibir notificaciones de eventos importantes, para estar informado sin necesidad de revisar constantemente.

#### Acceptance Criteria

1. WHEN un jugador recibe una solicitud de amistad, THE Sistema SHALL mostrar una notificación en tiempo real
2. WHEN un jugador recibe una invitación de partida, THE Sistema SHALL mostrar una notificación en tiempo real
3. WHEN un amigo se conecta, THE Sistema SHALL mostrar una notificación discreta
4. WHEN un torneo en el que el jugador está inscrito está por comenzar, THE Sistema SHALL notificar al jugador con 2 minutos de anticipación
5. WHEN la próxima ronda de un torneo está lista, THE Sistema SHALL notificar al jugador inmediatamente
6. WHEN un jugador desbloquea un logro, THE Sistema SHALL mostrar una notificación destacada
7. WHEN un jugador sube de nivel, THE Sistema SHALL mostrar una notificación destacada
8. THE Sistema SHALL mantener un historial de notificaciones de las últimas 24 horas
9. THE Sistema SHALL permitir a los jugadores marcar notificaciones como leídas
10. THE Sistema SHALL mostrar un contador de notificaciones no leídas en el menú principal

### Requisito 9: Persistencia y Sincronización de Datos

**User Story:** Como jugador, quiero que todos mis datos se guarden correctamente, para no perder mi progreso ni estadísticas.

#### Acceptance Criteria

1. THE Backend SHALL persistir todos los datos de torneos en la base de datos incluyendo participantes, bracket, y resultados
2. THE Backend SHALL persistir todas las relaciones de amistad en la base de datos
3. THE Backend SHALL persistir todos los mensajes de chat de partidas en la base de datos durante 30 días
4. THE Backend SHALL persistir todas las estadísticas de jugadores en la base de datos
5. THE Backend SHALL persistir todos los logros desbloqueados por jugador en la base de datos
6. THE Backend SHALL persistir el historial de temporadas de ligas en la base de datos
7. WHEN el Backend actualiza datos, THE Backend SHALL utilizar transacciones de base de datos para garantizar consistencia
8. WHEN ocurre un error de persistencia, THE Backend SHALL registrar el error y notificar al jugador
9. THE Backend SHALL realizar backups automáticos de la base de datos cada 24 horas
10. THE Backend SHALL sincronizar el estado del jugador entre múltiples dispositivos en menos de 2 segundos

### Requisito 10: Moderación y Seguridad

**User Story:** Como jugador, quiero un entorno seguro y respetuoso, para disfrutar del juego sin comportamientos tóxicos.

#### Acceptance Criteria

1. THE Sistema SHALL permitir a los jugadores reportar otros jugadores por comportamiento inapropiado
2. WHEN un jugador es reportado, THE Backend SHALL registrar el reporte con evidencia (mensajes de chat, timestamp)
3. THE Backend SHALL bloquear automáticamente a jugadores que reciban 5 reportes en 24 horas
4. WHEN un jugador es bloqueado, THE Backend SHALL notificar al jugador del bloqueo temporal y su duración
5. THE Sistema SHALL permitir a los jugadores bloquear a otros jugadores para no ser emparejados con ellos
6. THE Backend SHALL validar todas las entradas de usuario para prevenir inyección de código
7. THE Backend SHALL aplicar rate limiting a todas las acciones del jugador: máximo 100 acciones por minuto
8. WHEN un jugador excede el rate limit, THE Backend SHALL rechazar las acciones adicionales y notificar al jugador
9. THE Backend SHALL detectar y prevenir intentos de manipulación de resultados de partidas
10. THE Backend SHALL registrar todas las acciones sospechosas en un log de auditoría para revisión

