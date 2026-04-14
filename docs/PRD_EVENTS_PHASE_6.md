# PRD - Fase 6: Tienda In-Game (Cosméticos y Personalización)

## 1. Visión y Objetivos
Convertir las Monedas obtenidas en las fases 4 y 5 en una divisa útil para el jugador. La **Tienda In-Game** permite a los jugadores personalizar su experiencia visual, creando un ciclo económico sostenible (Ganar Monedas -> Gastar Monedas) y fomentando la individualidad.

## 2. Alcance
- **Catálogo de Artículos**: Creación de una tabla para almacenar artículos comprables.
- **Tipos de Artículos**:
  - **Avatares**: Imágenes de perfil exclusivas.
  - **Reversos de Cartas**: Diseños personalizados para el dorso de las cartas durante el juego.
  - **Títulos/Etiquetas**: Textos especiales que aparecen debajo del nombre del jugador (ej. "El Rey del Casino", "Estratega").
  - **Tapetes (Boards)**: Fondos de mesa personalizados para las partidas.
- **Inventario del Jugador**: Registro de qué artículos posee cada jugador.
- **Interfaz de Tienda**: Un componente UI visualmente atractivo donde se exhiban los artículos con sus precios.
- **Flujo de Compra**: Transacción segura (RPC) que descuente monedas y asigne el ítem.

## 3. Base de Datos
- Tabla `store_items` (id, name, type, price, image_url, is_active).
- Tabla `player_inventory` (player_id, item_id, acquired_at).
- Actualizar `profiles` para añadir campos como `equipped_card_back`, `equipped_title`.

## 4. UI/UX
- Nueva pestaña o modal en el menú principal llamado "Tienda".
- Sistema de previsualización antes de comprar.
- Panel en el perfil para "Equipar" los artículos comprados.
