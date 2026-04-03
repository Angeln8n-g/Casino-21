# Requirements Document

## Introduction

Este documento define los requisitos para migrar **Casino 21** — un juego de cartas multijugador en tiempo real actualmente desarrollado en React (web) — hacia una aplicación móvil nativa usando React Native con Expo. El juego implementa las reglas del Casino 21 (juego de cartas de captura), soporta modos 1v1 y 2v2, multijugador en tiempo real vía Socket.IO, autenticación con Supabase, sistema social (amigos, chat, invitaciones), torneos, y un sistema de ELO/ligas.

La migración debe preservar toda la lógica de dominio existente (`src/domain/` y `src/application/`), que es pura TypeScript sin dependencias de plataforma, y reemplazar únicamente la capa de presentación web por componentes nativos de React Native optimizados para pantallas táctiles.

## Glossary

- **App**: La aplicación móvil Casino 21 en React Native/Expo.
- **Game_Engine**: El módulo `src/application/game-engine.ts` existente, reutilizado sin modificaciones.
- **Domain_Layer**: Los módulos en `src/domain/` (card, deck, board, game-state, player, team, types).
- **Socket_Service**: El servicio de comunicación en tiempo real con el servidor via Socket.IO.
- **Navigation**: El sistema de navegación entre pantallas implementado con React Navigation.
- **Game_Screen**: La pantalla principal donde se desarrolla la partida activa.
- **Board_View**: El componente visual que representa la mesa de juego con cartas sueltas, formaciones y cartas cantadas.
- **Hand_View**: El componente visual que muestra las cartas en la mano del jugador local.
- **Gesture_Handler**: El sistema de gestos táctiles implementado con react-native-gesture-handler y Reanimated.
- **Asset_Manager**: El sistema de carga y gestión de assets (imágenes, sonidos, fuentes) via expo-asset y expo-av.
- **Store**: El sistema de estado global del juego (Context API o Redux Toolkit).
- **Persistence_Service**: El servicio de almacenamiento local usando AsyncStorage o expo-sqlite.
- **Auth_Service**: El servicio de autenticación con Supabase, adaptado para React Native.
- **Social_Service**: El servicio de funcionalidades sociales (amigos, chat DM, invitaciones de juego).
- **Notification_Service**: El servicio de notificaciones push y en-app usando expo-notifications.
- **Haptics_Service**: El servicio de retroalimentación háptica usando expo-haptics.
- **ELO**: Sistema de puntuación de habilidad relativa entre jugadores.
- **Virado**: Término del juego Casino 21 que indica que un jugador dejó la mesa vacía al recoger cartas.
- **Formacion**: Agrupación de cartas en la mesa con un valor combinado específico en Casino 21.
- **Cantar**: Acción de colocar una carta en la mesa con protección temporal en Casino 21.

---

## Requirements

### Requirement 1: Reutilización del Motor de Juego y Dominio

**User Story:** Como desarrollador, quiero reutilizar la lógica de dominio y el motor de juego existentes sin modificaciones, para que la migración no introduzca regresiones en las reglas del juego.

#### Acceptance Criteria

1. THE App SHALL importar y utilizar los módulos `src/domain/` y `src/application/` sin ninguna modificación a su código fuente.
2. THE Game_Engine SHALL ejecutar todas las acciones del juego (colocar, llevar, formar, formarPar, aumentarFormacion, cantar) produciendo los mismos resultados que en la versión web.
3. THE Domain_Layer SHALL compilar y ejecutarse en el entorno React Native/Expo sin dependencias de APIs de navegador (DOM, window, document).
4. WHEN the Game_Engine ejecuta `validateGameState`, THE Domain_Layer SHALL garantizar que el total de cartas en juego sea siempre 52.
5. FOR ALL estados de juego válidos, serializar y deserializar el estado via `saveGame`/`loadGame` SHALL producir un estado equivalente (propiedad round-trip).

---

### Requirement 2: Arquitectura Mobile-First

**User Story:** Como desarrollador, quiero una estructura de proyecto clara y escalable para React Native, para que el código sea mantenible y siga las convenciones de la plataforma móvil.

#### Acceptance Criteria

1. THE App SHALL organizar su código fuente bajo `src/mobile/` con los subdirectorios: `components/`, `screens/`, `navigation/`, `hooks/`, `store/`, `assets/`, `utils/`.
2. THE App SHALL utilizar Expo SDK como base del proyecto, con soporte para Android e iOS desde un único codebase.
3. THE App SHALL definir un archivo `app.json` o `app.config.ts` con la configuración de Expo incluyendo nombre, versión, íconos y splash screen.
4. THE App SHALL utilizar TypeScript con configuración estricta (`strict: true`) en todo el código de la capa móvil.
5. WHERE el proyecto utiliza dependencias nativas, THE App SHALL utilizar únicamente librerías compatibles con Expo Managed Workflow o Expo Dev Client.

---

### Requirement 3: Migración de Componentes UI Web a Componentes Nativos

**User Story:** Como desarrollador, quiero reemplazar todos los componentes HTML/CSS por sus equivalentes nativos de React Native, para que la UI se renderice correctamente en dispositivos móviles.

#### Acceptance Criteria

1. THE App SHALL reemplazar todos los elementos `div` por `View`, `span`/`p` por `Text`, `img` por `Image`, y `button` por `Pressable` o `TouchableOpacity`.
2. THE App SHALL reemplazar todos los estilos CSS/Tailwind por `StyleSheet.create()` con Flexbox nativo de React Native.
3. THE App SHALL implementar el componente `Board_View` usando `View` y `Pressable` nativos, mostrando cartas sueltas, formaciones y cartas cantadas con el mismo layout visual que la versión web.
4. THE App SHALL implementar el componente `Hand_View` usando un `ScrollView` horizontal o `FlatList` para mostrar las cartas en la mano del jugador.
5. THE App SHALL implementar el componente `CardView` usando `Image` para el arte de la carta y `Text` para el valor y palo, con dimensiones adaptadas a pantallas móviles (mínimo 60x90 puntos).
6. WHEN la pantalla del dispositivo tiene un ancho menor a 375 puntos, THE App SHALL ajustar el tamaño de las cartas y el layout del tablero para que todos los elementos sean visibles sin scroll horizontal.
7. THE App SHALL implementar la pantalla de puntuación de ronda (`scoring` phase) y la pantalla de fin de partida (`completed` phase) como componentes nativos equivalentes a los de la versión web.

---

### Requirement 4: Controles Táctiles y Gestos

**User Story:** Como jugador, quiero interactuar con las cartas usando gestos táctiles naturales, para que la experiencia de juego sea intuitiva en dispositivos móviles.

#### Acceptance Criteria

1. THE Gesture_Handler SHALL permitir al jugador seleccionar una carta de su mano mediante un tap simple.
2. THE Gesture_Handler SHALL permitir al jugador arrastrar (drag) una carta desde su mano hacia la mesa o hacia una carta/formación del tablero.
3. WHEN el jugador suelta una carta arrastrada sobre un destino válido, THE Game_Screen SHALL mostrar un modal de selección de acción con las jugadas posibles (llevar, formar, formarPar, aumentarFormacion, colocar, cantar).
4. THE Gesture_Handler SHALL permitir al jugador seleccionar múltiples cartas del tablero mediante taps consecutivos antes de ejecutar una acción.
5. WHEN el jugador realiza un tap fuera de cualquier carta o en el área vacía del tablero, THE Game_Screen SHALL limpiar la selección actual.
6. THE Gesture_Handler SHALL implementar un long press (≥ 500ms) sobre una carta para mostrar una vista ampliada de la misma.
7. WHEN no es el turno del jugador local, THE Gesture_Handler SHALL ignorar todos los gestos de selección y arrastre sobre las cartas.
8. THE Gesture_Handler SHALL utilizar `react-native-gesture-handler` y `react-native-reanimated` para garantizar que las animaciones de arrastre se ejecuten en el hilo de UI nativo.

---

### Requirement 5: Migración del Sistema de Comunicación en Tiempo Real

**User Story:** Como jugador, quiero que el multijugador en tiempo real funcione en la app móvil igual que en la web, para que pueda jugar partidas contra otros jugadores.

#### Acceptance Criteria

1. THE Socket_Service SHALL conectarse al servidor Socket.IO usando el mismo protocolo y eventos que la versión web (`play_action`, `game_state_update`, `timer_update`, `player_disconnected`, `player_reconnected`, `continue_round`).
2. THE Socket_Service SHALL autenticarse con el token JWT de Supabase al establecer la conexión, igual que en la versión web.
3. WHEN la conexión Socket.IO se interrumpe, THE Socket_Service SHALL intentar reconectarse automáticamente con un intervalo de 1500ms.
4. WHEN la app pasa a segundo plano (background), THE Socket_Service SHALL mantener la conexión activa durante al menos 30 segundos antes de desconectarse.
5. WHEN la app regresa al primer plano (foreground) con una conexión interrumpida, THE Socket_Service SHALL reconectarse automáticamente y reemitir el evento `join_room` con el `roomId` guardado en `Persistence_Service`.
6. THE Socket_Service SHALL emitir el evento `play_action` con el objeto `Action` completo cuando el jugador ejecuta una jugada.
7. WHEN el servidor emite `game_state_update`, THE Store SHALL actualizar el estado del juego y THE Game_Screen SHALL re-renderizarse con el nuevo estado.

---

### Requirement 6: Autenticación Móvil con Supabase

**User Story:** Como jugador, quiero autenticarme en la app móvil con mi cuenta existente, para que mi progreso, ELO y amigos estén disponibles en el dispositivo.

#### Acceptance Criteria

1. THE Auth_Service SHALL implementar autenticación con email y contraseña usando el cliente de Supabase para React Native (`@supabase/supabase-js` con `AsyncStorage` como storage adapter).
2. THE App SHALL mostrar una pantalla de autenticación (`AuthScreen`) cuando no hay sesión activa, con campos para email y contraseña, y botones para iniciar sesión y registrarse.
3. WHEN el usuario inicia sesión exitosamente, THE Auth_Service SHALL persistir la sesión en `AsyncStorage` para que la app no requiera re-autenticación al reiniciarse.
4. WHEN el token de sesión expira, THE Auth_Service SHALL refrescarlo automáticamente usando el refresh token de Supabase sin interrumpir la experiencia del usuario.
5. IF la autenticación falla por credenciales incorrectas, THEN THE Auth_Service SHALL retornar un mensaje de error descriptivo en español.
6. THE App SHALL mostrar el nombre de usuario y ELO del jugador autenticado en la pantalla principal (MainMenu).

---

### Requirement 7: Navegación entre Pantallas

**User Story:** Como jugador, quiero navegar fluidamente entre las diferentes pantallas del juego, para que la experiencia sea coherente y predecible.

#### Acceptance Criteria

1. THE Navigation SHALL implementar un stack navigator con React Navigation v6 que incluya las pantallas: `AuthScreen`, `MainMenu`, `GameScreen`, `TournamentScreen`, `SocialScreen`, y `SettingsScreen`.
2. WHEN el usuario no está autenticado, THE Navigation SHALL redirigir automáticamente a `AuthScreen`.
3. WHEN el usuario está autenticado y no hay partida activa, THE Navigation SHALL mostrar `MainMenu` como pantalla raíz.
4. WHEN el estado del juego tiene una fase distinta a `setup`, THE Navigation SHALL navegar automáticamente a `GameScreen`.
5. WHEN la partida termina (fase `completed`) y el jugador presiona "Volver al Menú", THE Navigation SHALL navegar a `MainMenu` y limpiar el estado del juego.
6. THE Navigation SHALL preservar el estado de la pantalla anterior al navegar hacia atrás, excepto al salir de `GameScreen` que siempre limpia el estado del juego.
7. THE Navigation SHALL utilizar transiciones nativas de la plataforma (slide para iOS, fade para Android) entre pantallas.

---

### Requirement 8: Gestión de Estado del Juego

**User Story:** Como desarrollador, quiero un sistema de estado global predecible y eficiente, para que el estado del juego se sincronice correctamente entre componentes.

#### Acceptance Criteria

1. THE Store SHALL implementar el estado del juego usando Context API con `useReducer`, o Redux Toolkit, exponiendo: `gameState`, `localPlayerId`, `error`, `timeRemaining`, `disconnectionMessage`.
2. THE Store SHALL actualizar `gameState` únicamente cuando el servidor emite `game_state_update`, sin mutaciones locales optimistas.
3. WHEN `timeRemaining` cambia, THE Game_Screen SHALL actualizar la barra de progreso del temporizador sin re-renderizar componentes no relacionados.
4. THE Store SHALL exponer las acciones: `setGameState`, `setLocalPlayerId`, `setError`, `clearError`, `setTimeRemaining`, `setDisconnectionMessage`.
5. THE Store SHALL ser accesible desde cualquier componente de la app mediante un hook personalizado `useGame()`.

---

### Requirement 9: Persistencia Local

**User Story:** Como jugador, quiero que la app recuerde mi sesión y sala de juego activa, para que pueda reconectarme si la app se cierra inesperadamente.

#### Acceptance Criteria

1. THE Persistence_Service SHALL almacenar y recuperar el `roomId` de la sala activa usando `AsyncStorage` con la clave `casino21_roomId`.
2. THE Persistence_Service SHALL almacenar y recuperar la sesión de autenticación de Supabase usando `AsyncStorage`.
3. WHEN la app se inicia con un `roomId` guardado y el usuario está autenticado, THE App SHALL intentar reconectarse automáticamente a esa sala emitiendo `join_room`.
4. THE Persistence_Service SHALL almacenar las preferencias del usuario (volumen de sonido, vibración activada/desactivada) usando `AsyncStorage`.
5. IF la reconexión a la sala guardada falla con un error del servidor, THEN THE Persistence_Service SHALL eliminar el `roomId` guardado y THE Navigation SHALL mostrar `MainMenu`.

---

### Requirement 10: Sistema Social Móvil

**User Story:** Como jugador, quiero acceder a mis amigos, chat y notificaciones desde la app móvil, para que pueda interactuar con otros jugadores.

#### Acceptance Criteria

1. THE Social_Service SHALL implementar las mismas funcionalidades que `useSocial.tsx` de la versión web: lista de amigos, solicitudes de amistad, invitaciones de juego, mensajes directos y notificaciones.
2. THE App SHALL mostrar un panel social (`SocialScreen` o modal) accesible desde `MainMenu` con las secciones: Amigos, Solicitudes, y Chat.
3. WHEN el jugador recibe una invitación de juego, THE Notification_Service SHALL mostrar una notificación en-app con botones "Unirse" y "Rechazar".
4. WHEN el jugador recibe un mensaje directo, THE Notification_Service SHALL incrementar el badge de notificaciones en la navegación.
5. THE App SHALL implementar el componente `NotificationCenter` como un modal nativo (bottom sheet) en lugar del dropdown web, mostrando invitaciones, DMs y notificaciones del sistema.
6. WHEN el jugador acepta una invitación de juego, THE Socket_Service SHALL emitir `accept_game_invitation` y THE Navigation SHALL navegar a `GameScreen` cuando el servidor confirme.

---

### Requirement 11: Assets, Sonido y Haptics

**User Story:** Como jugador, quiero que el juego tenga efectos de sonido y retroalimentación háptica al interactuar con las cartas, para que la experiencia sea más inmersiva.

#### Acceptance Criteria

1. THE Asset_Manager SHALL cargar las imágenes de las cartas (sprites) usando `expo-asset` con precarga en el splash screen para evitar parpadeos durante el juego.
2. THE Asset_Manager SHALL cargar fuentes personalizadas usando `expo-font` antes de renderizar cualquier componente de texto del juego.
3. THE App SHALL reproducir un efecto de sonido al colocar una carta en la mesa, al recoger cartas (llevar), y al completar una ronda, usando `expo-av`.
4. WHEN el jugador arrastra y suelta una carta, THE Haptics_Service SHALL activar una vibración de tipo `impactLight` usando `expo-haptics`.
5. WHEN el jugador completa un virado (deja la mesa vacía), THE Haptics_Service SHALL activar una vibración de tipo `notificationSuccess`.
6. WHERE el usuario ha desactivado el sonido en las preferencias, THE Asset_Manager SHALL omitir la reproducción de efectos de sonido.
7. WHERE el usuario ha desactivado la vibración en las preferencias, THE Haptics_Service SHALL omitir todas las vibraciones.

---

### Requirement 12: Optimización de Rendimiento

**User Story:** Como jugador, quiero que el juego se ejecute a 60 FPS sin caídas de rendimiento, para que la experiencia de juego sea fluida en dispositivos móviles de gama media.

#### Acceptance Criteria

1. THE Game_Screen SHALL mantener una tasa de fotogramas de al menos 60 FPS durante el gameplay normal en dispositivos con SoC equivalente a Snapdragon 665 o superior.
2. THE App SHALL utilizar `React.memo` en los componentes `CardView`, `Board_View`, `Hand_View` y `ActionPanel` para evitar re-renders innecesarios.
3. THE App SHALL utilizar `useCallback` para todas las funciones de callback pasadas como props a componentes memorizados.
4. THE App SHALL utilizar `useMemo` para cálculos derivados del estado del juego que se usen en múltiples componentes (ej. lista de acciones válidas).
5. THE Gesture_Handler SHALL ejecutar las animaciones de arrastre de cartas en el hilo de UI nativo usando `react-native-reanimated` worklets, sin pasar por el hilo de JavaScript.
6. THE App SHALL utilizar `FlatList` con `keyExtractor` y `getItemLayout` para listas de cartas con más de 4 elementos.
7. WHEN el estado del juego se actualiza, THE Store SHALL utilizar comparación por referencia para evitar re-renders en componentes que consumen partes no modificadas del estado.

---

### Requirement 13: Compatibilidad Multiplataforma Android e iOS

**User Story:** Como jugador, quiero que la app funcione correctamente tanto en Android como en iOS, para que pueda jugar independientemente de mi dispositivo.

#### Acceptance Criteria

1. THE App SHALL compilar y ejecutarse sin errores en Android (API level 26+, Android 8.0+) e iOS (iOS 14+).
2. THE App SHALL adaptar los estilos de sombra usando `elevation` para Android y `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius` para iOS.
3. THE App SHALL utilizar `Platform.OS` para aplicar comportamientos específicos de plataforma únicamente cuando sea estrictamente necesario.
4. THE App SHALL manejar el área segura (safe area) en dispositivos con notch o Dynamic Island usando `react-native-safe-area-context`.
5. THE App SHALL manejar el teclado virtual en pantallas con campos de texto (AuthScreen, MainMenu) usando `KeyboardAvoidingView` con el comportamiento apropiado por plataforma (`padding` en iOS, `height` en Android).
6. THE App SHALL soportar orientación portrait únicamente, bloqueando la rotación en `app.json`.

---

### Requirement 14: Build y Distribución

**User Story:** Como desarrollador, quiero poder generar builds de la app para distribución en tiendas, para que los jugadores puedan instalarla en sus dispositivos.

#### Acceptance Criteria

1. THE App SHALL generar un APK de debug funcional mediante `eas build --profile development --platform android`.
2. THE App SHALL generar un APK/AAB de release firmado mediante `eas build --profile production --platform android`, listo para subir a Google Play Store.
3. THE App SHALL incluir un archivo `eas.json` con los perfiles `development`, `preview` y `production` correctamente configurados.
4. THE App SHALL incluir íconos de la app en todas las resoluciones requeridas por Android e iOS, definidos en `app.json`.
5. THE App SHALL incluir una splash screen con el logo de Casino 21, configurada en `app.json` con `expo-splash-screen`.
6. WHEN se ejecuta `expo start`, THE App SHALL iniciar el servidor de desarrollo de Expo sin errores de compilación de TypeScript.

---

### Requirement 15: Pantalla de Torneos Móvil

**User Story:** Como jugador, quiero acceder al sistema de torneos desde la app móvil, para que pueda participar en competencias organizadas.

#### Acceptance Criteria

1. THE App SHALL implementar una `TournamentScreen` equivalente a `TournamentPage.tsx` de la versión web, usando componentes nativos de React Native.
2. THE App SHALL mostrar el bracket del torneo usando `View` y `Text` nativos con scroll vertical, adaptado para pantallas móviles.
3. WHEN el jugador crea o se une a un torneo, THE Socket_Service SHALL emitir los mismos eventos que la versión web.
4. THE App SHALL mostrar el estado del torneo (lobby, en progreso, finalizado) con actualizaciones en tiempo real via Socket.IO.

---

### Requirement 16: Pantalla de Estadísticas y Liga

**User Story:** Como jugador, quiero ver mis estadísticas de ELO e historial de partidas en la app móvil, para que pueda seguir mi progreso.

#### Acceptance Criteria

1. THE App SHALL implementar una pantalla de estadísticas equivalente a `PlayerStats.tsx` y `EloHistoryChart.tsx` de la versión web.
2. THE App SHALL mostrar el historial de ELO usando una librería de gráficos compatible con React Native (ej. `react-native-svg` con `victory-native`).
3. THE App SHALL mostrar el leaderboard de la liga equivalente a `LeagueLeaderboard.tsx` usando una `FlatList` nativa.
4. WHEN el jugador completa una partida, THE App SHALL actualizar las estadísticas mostradas en la pantalla de estadísticas sin requerir reinicio de la app.
