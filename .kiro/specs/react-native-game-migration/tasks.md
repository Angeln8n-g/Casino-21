# Implementation Plan: React Native Game Migration

## Overview

Migración de Casino 21 de React web a React Native con Expo. La estrategia es preservar intacta la capa de dominio y aplicación (`src/domain/` y `src/application/`) y construir una nueva capa de presentación móvil bajo `src/mobile/`. Las tareas siguen un orden incremental: infraestructura base → servicios → estado → navegación → componentes → pantallas → integración final.

## Tasks

- [x] 1. Configurar infraestructura base del proyecto Expo
  - Inicializar proyecto Expo con TypeScript strict en `src/mobile/`
  - Crear `app.json` con nombre, versión, íconos, splash screen y orientación portrait bloqueada
  - Crear `eas.json` con perfiles `development`, `preview` y `production`
  - Instalar dependencias: `react-navigation`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `socket.io-client`, `@supabase/supabase-js`, `expo-av`, `expo-haptics`, `expo-asset`, `expo-font`, `fast-check`
  - Crear estructura de directorios `src/mobile/` con subdirectorios: `components/`, `screens/`, `navigation/`, `hooks/`, `store/`, `assets/`, `utils/`, `services/`
  - Verificar que `src/domain/` y `src/application/` compilan sin dependencias de APIs de navegador
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 14.3, 14.6_

- [x] 2. Implementar servicios de persistencia y haptics
  - [x] 2.1 Implementar `PersistenceService` en `src/mobile/services/persistenceService.ts`
    - Métodos: `saveRoomId`, `getRoomId`, `clearRoomId`, `savePreferences`, `getPreferences`
    - Usar `AsyncStorage` con clave `casino21_roomId` para el roomId
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 2.2 Escribir property test para PersistenceService (Property 5)
    - **Property 5: Round-trip de preferencias**
    - **Validates: Requirements 9.4**
    - Usar `fast-check` con `fc.record` para generar `UserPreferences` aleatorias
    - Mock de `AsyncStorage`, verificar que `savePreferences` → `getPreferences` retorna valores idénticos

  - [x] 2.3 Escribir unit tests para PersistenceService
    - Mock de `AsyncStorage`, verificar save/load de `roomId`
    - Verificar que `clearRoomId` elimina la clave correctamente
    - _Requirements: 9.1, 9.5_

  - [x] 2.4 Implementar `HapticsService` en `src/mobile/services/hapticsService.ts`
    - Métodos: `impactLight`, `notificationSuccess`
    - Leer preferencias del usuario antes de invocar `expo-haptics`
    - Omitir silenciosamente si `hapticsEnabled` es `false` o si `expo-haptics` no está disponible
    - _Requirements: 11.4, 11.5, 11.7_

  - [x] 2.5 Escribir property test para HapticsService (Property 11)
    - **Property 11: Respeto de preferencias de haptics**
    - **Validates: Requirements 11.7**
    - Generar `UserPreferences` con `hapticsEnabled: false`, verificar que `expo-haptics` nunca se invoca

- [x] 3. Implementar AuthService y AssetManager
  - [x] 3.1 Implementar `AuthService` en `src/mobile/services/authService.ts`
    - Usar `@supabase/supabase-js` con `AsyncStorage` como storage adapter
    - Métodos: `signIn`, `signUp`, `signOut`, `getSession`, `refreshSession`
    - Retornar mensajes de error en español para credenciales incorrectas
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [x] 3.2 Escribir property test para AuthService (Property 7)
    - **Property 7: Validación de entrada vacía en autenticación**
    - **Validates: Requirements 6.5**
    - Usar `fc.string().filter(s => s.trim() === '')` para generar strings de solo espacios
    - Verificar que `signIn` rechaza sin llamar al cliente de Supabase

  - [x] 3.3 Escribir unit tests para AuthService
    - Mock de `@supabase/supabase-js`, verificar flujo login/logout/refresh
    - Verificar persistencia de sesión en AsyncStorage
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 3.4 Implementar `AssetManager` en `src/mobile/services/assetManager.ts`
    - Precargar sprites de cartas con `expo-asset` durante splash screen
    - Cargar fuentes con `expo-font`
    - Reproducir efectos de sonido con `expo-av`, respetando `soundEnabled` de preferencias
    - Omitir silenciosamente si `expo-av` falla al cargar un sonido
    - _Requirements: 11.1, 11.2, 11.3, 11.6_

  - [x] 3.5 Escribir property test para AssetManager (Property 11 - sonido)
    - **Property 11: Respeto de preferencias de sonido**
    - **Validates: Requirements 11.6**
    - Generar `UserPreferences` con `soundEnabled: false`, verificar que `expo-av` nunca se invoca

- [x] 4. Implementar SocketService
  - [x] 4.1 Implementar `SocketService` en `src/mobile/services/socketService.ts`
    - Métodos: `connect`, `disconnect`, `emit`, `on`, `off`, `reconnect`
    - Autenticar con token JWT de Supabase al conectar
    - Reconexión automática con intervalo de 1500ms en `connect_error`
    - Manejar transición background/foreground: mantener conexión 30s en background, reconectar al volver al foreground
    - Al reconectar, emitir `join_room` con `roomId` de `PersistenceService`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.2 Escribir property test para SocketService (Property 4)
    - **Property 4: Reconexión restaura el estado de sala**
    - **Validates: Requirements 9.3, 5.5**
    - Mock de `AsyncStorage` con `roomId` arbitrario, simular inicio de app con sesión activa
    - Verificar que `SocketService` emite `join_room` con ese `roomId`

  - [x] 4.3 Escribir property test para SocketService (Property 10)
    - **Property 10: Limpieza de roomId ante fallo de reconexión**
    - **Validates: Requirements 9.5**
    - Simular respuesta de error del servidor en `join_room`
    - Verificar que `PersistenceService.clearRoomId` es invocado y AsyncStorage queda vacío

  - [x] 4.4 Escribir unit tests para SocketService
    - Mock de `socket.io-client`, verificar reconexión automática y emisión de eventos
    - Verificar manejo de `connect_error` y `player_disconnected`
    - _Requirements: 5.1, 5.3_

- [x] 5. Checkpoint — Verificar servicios base
  - Asegurar que todos los tests de servicios pasan. Consultar al usuario si hay dudas sobre la configuración de mocks o el comportamiento esperado de reconexión.

- [x] 6. Implementar Store (GameContext y AuthContext)
  - [x] 6.1 Implementar `gameReducer.ts` en `src/mobile/store/`
    - Definir `MobileGameState` con: `gameState`, `localPlayerId`, `error`, `timeRemaining`, `disconnectionMessage`
    - Implementar reducer con acciones: `SET_GAME_STATE`, `SET_LOCAL_PLAYER_ID`, `SET_ERROR`, `CLEAR_ERROR`, `SET_TIME_REMAINING`, `SET_DISCONNECTION_MESSAGE`
    - El estado solo se actualiza al recibir `game_state_update` del servidor (sin mutaciones optimistas)
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 6.2 Escribir property test para gameReducer (Property 8)
    - **Property 8: Actualización de estado sin mutación local**
    - **Validates: Requirements 8.2**
    - Generar secuencias arbitrarias de acciones que no sean `SET_GAME_STATE`
    - Verificar que `gameState` permanece `null` hasta recibir `SET_GAME_STATE`
    - Verificar inmutabilidad: el estado anterior no es mutado por el reducer

  - [x] 6.3 Escribir unit tests para gameReducer
    - Verificar que cada acción produce el estado esperado
    - Verificar que acciones desconocidas retornan el estado sin cambios
    - _Requirements: 8.1, 8.4_

  - [x] 6.4 Implementar `GameContext.tsx` en `src/mobile/store/`
    - Proveer `useReducer` con `gameReducer`
    - Exponer hook `useGame()` para acceso desde cualquier componente
    - Integrar `SocketService` para escuchar `game_state_update` y `timer_update`
    - _Requirements: 8.3, 8.5_

  - [x] 6.5 Implementar `AuthContext.tsx` en `src/mobile/store/`
    - Proveer estado de autenticación: `user`, `session`, `loading`
    - Integrar `AuthService` para login/logout/refresh automático
    - _Requirements: 6.3, 6.4_

- [x] 7. Implementar hooks personalizados
  - Implementar `useGame.ts`: acceso al `GameContext`, acciones del juego
  - Implementar `useAuth.ts`: acceso al `AuthContext`, métodos de autenticación
  - Implementar `useSocket.ts`: acceso al `SocketService`, emisión de eventos
  - Implementar `useSocial.ts`: equivalente al `useSocial.tsx` web, usando `SocialService`
  - Implementar `SocialService` en `src/mobile/services/socialService.ts` con las mismas funcionalidades que la versión web
  - _Requirements: 8.5, 10.1_

- [x] 8. Implementar navegación
  - [x] 8.1 Implementar `RootNavigator.tsx`, `AuthStack.tsx` y `AppStack.tsx` en `src/mobile/navigation/`
    - Stack navigator con React Navigation v6
    - Pantallas: `AuthScreen`, `MainMenu`, `GameScreen`, `TournamentScreen`, `SocialScreen`, `SettingsScreen`, `StatsScreen`
    - Definir `RootStackParamList` con tipos para cada ruta
    - _Requirements: 7.1_

  - [x] 8.2 Implementar lógica de redirección automática
    - Redirigir a `AuthScreen` si no hay sesión activa
    - Redirigir a `GameScreen` si el estado del juego tiene fase distinta a `setup`
    - Navegar a `MainMenu` y limpiar estado al terminar partida
    - Transiciones nativas: slide en iOS, fade en Android
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 9. Implementar componentes UI base
  - [x] 9.1 Implementar `CardView.tsx` en `src/mobile/components/`
    - Usar `Image` para el sprite de la carta y `Text` para valor/palo como fallback
    - Props: `card`, `selected`, `onPress`, `onLongPress`, `draggable`, `size`
    - Dimensiones mínimas 60x90 puntos, adaptables por `size`
    - Envolver con `React.memo`
    - _Requirements: 3.5, 12.2_

  - [x] 9.2 Escribir unit tests para CardView
    - Verificar renderizado con diferentes props
    - Verificar que `onPress` y `onLongPress` se disparan correctamente
    - _Requirements: 3.5_

  - [x] 9.3 Implementar `HandView.tsx` en `src/mobile/components/`
    - Usar `FlatList` horizontal con `keyExtractor` y `getItemLayout`
    - Props: `cards`, `selectedCardId`, `onCardSelect`, `onCardDrop`, `disabled`
    - Deshabilitar gestos cuando `disabled=true`
    - Envolver con `React.memo`, usar `useCallback` para callbacks
    - _Requirements: 3.4, 4.1, 4.7, 12.2, 12.3, 12.6_

  - [x] 9.4 Escribir property test para HandView (Property 6)
    - **Property 6: Gestos deshabilitados fuera del turno**
    - **Validates: Requirements 4.7**
    - Generar estados de juego donde `currentTurnPlayerIndex` no corresponde al jugador local
    - Renderizar `HandView` con `disabled=true`, simular taps, verificar que `onCardSelect` nunca se invoca

  - [x] 9.5 Implementar `BoardView.tsx` en `src/mobile/components/`
    - Mostrar cartas sueltas, formaciones y cartas cantadas con `View` y `Pressable`
    - Props: `board`, `selectedCardIds`, `onCardPress`, `isMyTurn`
    - Ajustar layout para pantallas < 375pt de ancho
    - Envolver con `React.memo`
    - _Requirements: 3.3, 3.6, 12.2_

  - [x] 9.6 Implementar `ActionPanel.tsx` en `src/mobile/components/`
    - Mostrar únicamente las acciones válidas recibidas como props
    - Props: `validActions`, `selectedHandCard`, `selectedBoardCards`, `onActionSelect`, `onCancel`
    - Envolver con `React.memo`, usar `useMemo` para lista de acciones
    - _Requirements: 4.3, 12.2, 12.4_

  - [x] 9.7 Implementar `Timer.tsx` y `NotificationCenter.tsx` en `src/mobile/components/`
    - `Timer`: barra de progreso que actualiza `timeRemaining` sin re-render de componentes no relacionados
    - `NotificationCenter`: bottom sheet modal nativo con invitaciones, DMs y notificaciones del sistema
    - _Requirements: 8.3, 10.3, 10.4, 10.5_

  - [x] 9.8 Implementar `EloChart.tsx` en `src/mobile/components/`
    - Usar `react-native-svg` con `victory-native` para el gráfico de historial de ELO
    - _Requirements: 16.2_

- [x] 10. Checkpoint — Verificar componentes base
  - Asegurar que todos los tests de componentes pasan. Consultar al usuario si hay dudas sobre el diseño visual o el comportamiento de gestos.

- [x] 11. Implementar gestos táctiles en GameScreen
  - [x] 11.1 Implementar gestos de tap y drag en `HandView` y `BoardView`
    - Usar `react-native-gesture-handler` para tap, long press (≥500ms) y drag
    - Usar `react-native-reanimated` worklets para animaciones en el hilo de UI nativo
    - Tap simple: seleccionar carta de la mano
    - Drag: arrastrar carta hacia la mesa o hacia carta/formación del tablero
    - Long press: mostrar vista ampliada de la carta
    - Tap en área vacía: limpiar selección
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.8, 12.5_

  - [x] 11.2 Implementar modal de selección de acción
    - Al soltar carta arrastrada sobre destino válido, mostrar modal con acciones posibles
    - Integrar con `ActionPanel` y `SocketService.emit('play_action', action)`
    - _Requirements: 4.3, 5.6_

- [x] 12. Implementar pantallas principales
  - [x] 12.1 Implementar `AuthScreen.tsx` en `src/mobile/screens/`
    - Campos email y contraseña, botones de iniciar sesión y registrarse
    - `KeyboardAvoidingView` con comportamiento por plataforma (`padding` iOS, `height` Android)
    - Mostrar errores en español
    - _Requirements: 6.2, 6.5, 13.5_

  - [x] 12.2 Implementar `MainMenu.tsx` en `src/mobile/screens/`
    - Mostrar nombre de usuario y ELO del jugador autenticado
    - Acceso a `SocialScreen`, `TournamentScreen`, `SettingsScreen`, `StatsScreen`
    - _Requirements: 6.6, 7.3_

  - [x] 12.3 Implementar `GameScreen.tsx` en `src/mobile/screens/`
    - Integrar `BoardView`, `HandView`, `ActionPanel`, `Timer`
    - Conectar con `GameContext` y `SocketService`
    - Manejar fases `scoring` y `completed` con componentes nativos equivalentes a la versión web
    - Mapear `ErrorCode` a mensajes en español usando `ERROR_MESSAGES`
    - Usar `react-native-safe-area-context` para safe area
    - _Requirements: 3.7, 5.7, 7.4, 7.5, 13.4_

  - [x] 12.4 Implementar `TournamentScreen.tsx` en `src/mobile/screens/`
    - Bracket del torneo con `View`/`Text` nativos y scroll vertical
    - Estado del torneo con actualizaciones en tiempo real via Socket.IO
    - Emitir mismos eventos que la versión web al crear/unirse a torneo
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 12.5 Implementar `SocialScreen.tsx` en `src/mobile/screens/`
    - Secciones: Amigos, Solicitudes, Chat
    - Integrar `NotificationCenter` y `useSocial` hook
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6_

  - [x] 12.6 Implementar `SettingsScreen.tsx` y `StatsScreen.tsx` en `src/mobile/screens/`
    - `SettingsScreen`: controles de volumen y vibración, persistir con `PersistenceService`
    - `StatsScreen`: integrar `EloChart`, leaderboard con `FlatList`, actualizar al completar partida
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ] 13. Implementar property tests del dominio y motor de juego
  - [x] 13.1 Escribir property test para conservación de cartas (Property 1)
    - **Property 1: Conservación de 52 cartas**
    - **Validates: Requirements 1.4**
    - Usar `fast-check` para generar estados de juego válidos y acciones aleatorias
    - Verificar que la suma de cartas en mazo + tablero + formaciones + manos + recogidas = 52

  - [x] 13.2 Escribir property test para round-trip de serialización (Property 2)
    - **Property 2: Round-trip de serialización del estado**
    - **Validates: Requirements 1.5**
    - Generar estados de juego válidos arbitrarios
    - Verificar que `saveGame` → `loadGame` produce estado estructuralmente equivalente

  - [x] 13.3 Escribir property test para determinismo del motor (Property 3)
    - **Property 3: Acciones del motor producen resultados deterministas**
    - **Validates: Requirements 1.2**
    - Generar pares (estado, acción válida) arbitrarios
    - Ejecutar la misma acción dos veces sobre el mismo estado, verificar resultados idénticos

  - [x] 13.4 Escribir property test para formato de mensajes (Property 9)
    - **Property 9: Formato de mensajes con timestamp y remitente**
    - **Validates: Requirements 10.2**
    - Generar mensajes de chat con `fc.record({ timestamp: fc.date(), sender: fc.string() })`
    - Verificar que la función de renderizado produce string con timestamp y nombre del remitente

- [x] 14. Implementar utilidades y compatibilidad multiplataforma
  - Implementar `cardUtils.ts` en `src/mobile/utils/`: helpers para mapear `Card` a ruta de asset
  - Implementar `platformUtils.ts` en `src/mobile/utils/`: helpers para sombras, `Platform.OS`, safe area
  - Aplicar `elevation` en Android y `shadow*` en iOS para sombras de cartas
  - Verificar `KeyboardAvoidingView` en ambas plataformas
  - _Requirements: 13.2, 13.3, 13.4, 13.5_

- [ ] 15. Integración final y wiring
  - [x] 15.1 Conectar todos los servicios con el Store y la navegación
    - `SocketService` → `GameContext` (escuchar `game_state_update`, `timer_update`, `player_disconnected`)
    - `AuthService` → `AuthContext` → `RootNavigator` (redirección automática)
    - `PersistenceService` → reconexión automática al iniciar app con `roomId` guardado
    - `HapticsService` y `AssetManager` → integrar en `GameScreen` y `HandView`
    - _Requirements: 5.7, 7.2, 7.4, 9.3, 11.3, 11.4, 11.5_

  - [x] 15.2 Aplicar optimizaciones de rendimiento
    - Verificar `React.memo` en `CardView`, `BoardView`, `HandView`, `ActionPanel`
    - Verificar `useCallback` en todos los callbacks pasados como props
    - Verificar `useMemo` para cálculos derivados del estado
    - Verificar `FlatList` con `keyExtractor` y `getItemLayout` en listas de cartas
    - _Requirements: 12.2, 12.3, 12.4, 12.6, 12.7_

  - [x] 15.3 Escribir integration tests de flujo completo
    - Test: autenticación → MainMenu → unirse a sala → GameScreen → jugar acción → actualización de estado
    - Mock de `SocketService` y `AuthService`
    - _Requirements: 5.1, 5.7, 7.4_

- [ ] 16. Checkpoint final — Verificar integración completa
  - Asegurar que todos los tests pasan (unit, property e integration). Verificar que `expo start` inicia sin errores de TypeScript. Consultar al usuario si hay dudas antes de considerar la migración completa.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los property tests usan `fast-check` con mínimo 100 iteraciones (`{ numRuns: 100 }`)
- Cada property test incluye comentario de trazabilidad: `// Feature: react-native-game-migration, Property N: ...`
- Los tests de dominio (Properties 1, 2, 3) verifican que la capa existente no fue modificada
- Los servicios móviles (Properties 4, 5, 7, 8, 9, 10, 11) verifican la nueva capa de presentación
