# PRD - Fase 13: Rediseño de Alta Fidelidad y Tapetes Dinámicos

## 1. Visión y Objetivos
Transformar la interfaz de juego de una apariencia funcional/neon a una de **Alta Fidelidad (Premium)**, inspirada en aplicaciones de casino de nivel profesional. El objetivo es mejorar la inmersión, la jerarquía visual y permitir la personalización de la mesa ("tapete") vinculada a eventos y misiones.

## 2. Alcance Visual (Basado en Referencia)

### 2.1 La Mesa (BoardView)
- **Texturas**: Fondo con textura de tela/tapete (azul profundo por defecto) con degradados radiales.
- **Bordes**: Marco de madera oscura con relieves dorados y efectos de iluminación (glow) perimetral.
- **Contenedores de Juego**:
    - **Cartas Sueltas**: Recuadro con bordes dorados finos y título superior.
    - **Formaciones**: Línea divisoria sutil y recuadros individuales dorados para cada grupo.
- **Marcas de Agua**: Logo de "Casino 21" integrado sutilmente en la textura del tapete.

### 2.2 Las Cartas (CardView)
- **Diseño**: Bordes más redondeados, sombras arrojadas realistas (drop shadows) para dar profundidad sobre el tapete.
- **Jerarquía**: Ranks y suits con tipografía más elegante y clara.
- **Animaciones**: Suavizar las transiciones de selección y drag-and-drop.

### 2.3 Layout Global (GameScreen)
- **Barra Superior**: 
    - Información de ronda y turno centralizada.
    - Barras de progreso de "Recogidas" para ambos jugadores.
    - Botón de "Abandonar Partida" estilizado.
- **Panel de Emoticonos**: Barra horizontal flotante sobre la mano del jugador para interacción rápida.
- **Mano del Jugador (HandView)**:
    - Integrada en un panel inferior unificado.
    - Muestra nombre, estado de turno y contador de "Virados".
    - **Mazo de Recogidas**: Visualización del mazo de cartas ganadas con el contador total a la derecha.

## 3. Requerimientos Técnicos

### 3.1 Tapetes Dinámicos (Backend/Admin)
- **Base de Datos**: 
    - Extender `public.events` con la columna `board_theme_url`.
    - Extender `public.quest_catalog` con la columna `board_theme_url`.
- **AdminPanel**:
    - Añadir capacidad de subir/seleccionar una textura de tapete al crear eventos o misiones.

### 3.2 Lógica de Temas (Frontend)
- Implementar un sistema que detecte si la partida pertenece a un evento o misión específica y cargue el `board_theme_url` correspondiente.
- Fallback a la textura azul clásica si no hay tema definido.

## 4. Archivos a Intervenir
- [board.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/domain/board.ts): Posibles ajustes en estructuras de datos para estados visuales.
- [card.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/domain/card.ts) / [deck.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/domain/deck.ts): Revisión de lógica si el rediseño requiere metadatos adicionales.
- [BoardView.tsx](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/web/components/BoardView.tsx): Transformación total del renderizado de la mesa y contenedores.
- [CardView.tsx](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/web/components/CardView.tsx): Actualización de estilos y props de diseño.
- [GameScreen.tsx](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/web/components/GameScreen.tsx): Reestructuración del layout principal (Header, Emoji Bar, Footer).
- [HandView.tsx](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/src/web/components/HandView.tsx): Integración de info de jugador y mazo de recogidas.

## 5. Plan de Ejecución (Pasos)

1.  **SQL**: Migración para añadir columnas de `board_theme_url`.
2.  **Admin**: Actualización de formularios de eventos y misiones con subida de tapetes.
3.  **Styles**: Definir nuevas variables CSS y clases de bordes dorados/madera en `index.css`.
4.  **Refactor Card**: Aplicar el nuevo diseño a `CardView`.
5.  **Refactor Board**: Implementar la mesa con contenedores y texturas dinámicas.
6.  **Layout Game**: Reorganizar `GameScreen` para incluir la barra de progreso y emojis.
7.  **Hand & Info**: Rediseñar la zona del jugador inferior.
