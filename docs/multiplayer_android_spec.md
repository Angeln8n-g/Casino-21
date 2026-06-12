# Especificación de Migración Multijugador a Android (React Native + Expo)

Esta especificación detalla el plan técnico para migrar la funcionalidad multijugador en tiempo real de **Kasino21** a Android utilizando **React Native y Expo 51**, garantizando la reutilización de la lógica del backend y la paridad de características con la web.

---

## 1. Arquitectura y Conexión en Redes Móviles

Para el cliente móvil Android se reutilizará la conexión basada en WebSockets a través de la librería oficial de cliente de Socket.io.

### 1.1 Configuración de Socket.io Client en Android
* **Paquete**: Usar `socket.io-client` nativo compatible con React Native. No se requieren polyfills adicionales de red.
* **Manejo del Ciclo de Vida del App**:
  * Cuando la app entra en segundo plano (background), se debe desconectar o pausar el socket para evitar drenar la batería y usar datos innecesarios.
  * Al regresar al primer plano (foreground), se debe gatillar la reconexión y emitir `join_room` para reanudar el estado de la partida automáticamente.
  * Utilizar `AppState` de React Native para monitorear el ciclo de vida:
    ```typescript
    import { AppState } from 'react-native';
    // Suscribirse a cambios en AppState y conectar/desconectar socket.
    ```

### 1.2 Flujo de Autenticación y Token Supabase
* **Inyección de AsyncStorage**: La persistencia de la sesión de Supabase debe usar `@react-native-async-storage/async-storage` en lugar de `localStorage`.
  ```typescript
  import AsyncStorage from '@react-native-async-storage/async-storage';
  // Configuración del cliente Supabase:
  // auth: { storage: AsyncStorage, ... }
  ```
* **Handshake con el Socket**:
  El token JWT (`session.access_token`) debe enviarse en la inicialización del socket en la propiedad `auth.token`, idéntico a la web:
  ```typescript
  const socket = io(process.env.EXPO_PUBLIC_SOCKET_URL, {
    auth: { token: session?.access_token }
  });
  ```

---

## 2. Flujo de Matchmaking en Dispositivos Móviles

El matchmaking es gestionado en el servidor mediante [MatchmakingStore](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/matchmaking-store.ts). En la app Android:

1. **Cola de Matchmaking**:
   * El cliente emite la solicitud para entrar en la cola.
   * Se muestra una vista de espera (Lobby) en orientación vertical (**Portrait**) que incluye un contador visual y opción para cancelar la búsqueda.
2. **Evento `match_found`**:
   * El cliente recibe el evento `match_found` con el `roomId` y los datos del rival.
   * Se inicia una cuenta regresiva visual de 3 segundos para preparar al usuario.
3. **Cambio de Orientación (Crítico)**:
   * Al recibir `match_found` y antes de montar la pantalla del juego, la app debe forzar la orientación a horizontal (**Landscape**) usando `expo-screen-orientation`.
   ```typescript
   import * as ScreenOrientation from 'expo-screen-orientation';
   await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
   ```

---

## 3. Gestión de Salas y Reconexión

### 3.1 Reconexión Resiliente
* Si un jugador pierde la conexión móvil (cambio de Wi-Fi a 4G/5G, túneles, etc.), el cliente Socket.io intentará reconectarse automáticamente.
* Al reconectarse con el mismo `userId` de Supabase, la sala en el backend localiza al usuario y responde enviando el estado actual sanitizado mediante el evento `game_state_update`.
* **Manejo en la UI**: Mientras ocurre la reconexión, se debe mostrar un overlay translúcido bloqueante con un Spinner de carga que indique: *"Reconectando a la partida..."* para evitar acciones fuera de sincronía.

### 3.2 Escrow y Apuestas
* Antes de iniciar la partida, el backend verifica el balance del jugador en Supabase y deduce la apuesta (`betAmount`).
* La UI debe validar localmente el saldo del jugador antes de permitirle unirse a salas con apuestas altas, advirtiendo en caso de balance insuficiente.

---

## 4. Sincronización del Estado de Juego y Turnos

### 4.1 Sanitización de Datos
* Las cartas de la mano del rival se reciben codificadas como `{ rank: '?', suit: 'hidden', value: 0 }`.
* La UI móvil debe renderizar estas cartas con un diseño genérico de reverso de carta de Kasino21.

### 4.2 Temporizador de Turno
* El tiempo límite por turno es de 30 segundos (`TURN_TIME_LIMIT_MS = 30000`).
* En Android, se debe implementar una barra de progreso animada o un dial circular en el avatar del jugador activo usando `react-native-reanimated`.
* Si el temporizador llega a cero, el backend ejecuta automáticamente una acción de descarte (botar/colocar la carta de menor valor) mediante `getTimeoutAction`. La UI móvil simplemente procesará el estado de juego actualizado que el servidor emita.

---

## 5. Diseño de Interfaz Móvil y UX Premium

Siguiendo las reglas de `kasino21.md` y `ui-ux-pro-max`, se adaptará la interfaz táctil con animaciones y micro-interacciones:

| Componente Web | Equivalente React Native (Expo) | Librerías / Técnicas Sugeridas |
| :--- | :--- | :--- |
| Contenedores `div` | `<View>` o `<SafeAreaView>` | NativeWind v4 (`className`) |
| Textos (`p`, `span`, `h1`) | `<Text>` | Fuentes modernas (e.g., *Inter* o *Outfit* vía Google Fonts / Expo Font) |
| Imágenes (`img`) | `<Image>` de `expo-image` | Ofrece mejor caché de imágenes y carga progresiva |
| Botones y Clicks | `<Pressable>` o `<TouchableOpacity>` | Efecto de escala al presionar usando Animated |
| Drag & Drop de Cartas | `<PanGestureHandler>` + Reanimated | `react-native-gesture-handler` + `react-native-reanimated` |
| Lista de Salas (CSS Grid) | `<FlashList>` o `<View className="flex-row flex-wrap">` | `@shopify/flash-list` para renderizado fluido de listas |
| Efectos de Sonido | API de `expo-av` | Precarga de sonidos (repartir, colocar carta, virado) |

### 5.1 Mecánica de Drag & Drop para Android
* Reemplazar `@dnd-kit` (exclusivo de web) por una solución nativa basada en gestos.
* Al arrastrar una carta hacia el tablero, se deben usar colisiones de coordenadas `x, y` para determinar sobre qué carta o formación del tablero se suelta la carta.
* Proporcionar feedback háptico ligero (`expo-haptics`) cuando la carta se arrastra sobre un objetivo válido del tablero.

### 5.2 Orientación de Pantalla según Sección
* **Lobby / Social / Tienda / Perfil**: Orientación vertical obligatoria (**Portrait**).
* **Partida de Juego (`/game` route)**: Orientación horizontal obligatoria (**Landscape**).

---

## 6. Canal de Chat en Tiempo Real

* El chat se sincroniza mediante el evento `chat_message` y el historial se almacena en el RingBuffer del servidor.
* En Android (Landscape), el chat no puede ocupar toda la pantalla. Se debe implementar como un panel lateral colapsable (drawer) o un overlay translúcido animado que se desliza desde un borde de la pantalla usando `react-native-reanimated`.
* El input de chat debe estar envuelto en un `KeyboardAvoidingView` nativo para que el teclado virtual de Android no cubra el campo de entrada.
