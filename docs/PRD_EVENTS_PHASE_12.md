# PRD - Fase 12: Rediseño del Menú Principal (Lobby UI/UX Lift)

## 1. Visión y Objetivos
Evolucionar la interfaz del Menú Principal de un estilo "Dashboard Web" a una **Experiencia Inmersiva de Videojuego Competitivo** (estilo eSports / Web3). El objetivo es que el jugador sienta la tensión, el dinamismo y la calidad premium desde el primer segundo que entra al Lobby.

## 2. Alcance y Requerimientos

### 2.1. Atmósfera y Fondo (Game Feel)
- **Grid Animado / Patrón de Fondo**: Reemplazar el fondo gris oscuro plano por un fondo que sugiera profundidad (un grid cyberpunk o un patrón hexagonal muy tenue).
- **Orbes Dinámicos**: Hacer que las luces ambientales (`ambient-orb`) respiren y se muevan lentamente (animaciones CSS de traslación sutil).

### 2.2. Navegación Superior (`TopNavbar.tsx`)
- **Limpieza de Pestañas**: Agrupar o rediseñar los botones de navegación (`TODO`, `LOBBY`, `EVENTOS`, etc.) para que parezcan pestañas de un cliente de juego (ej. Valorant o League of Legends), no botones de un panel de administración.
- **Perfil Integrado**: Mejorar la visualización del rango (Bronce/Plata/Oro), Nivel y Monedas para que se vean como insignias holográficas o de neón.

### 2.3. Centro de Acción (Selección de Modos de Juego)
- **Eliminación del Input de Nombre**: Eliminar el campo de texto "Tu Nombre" del Lobby principal. El sistema debe forzar el uso del `username` del perfil (GamerTag). Si el jugador no tiene, se le debe pedir en un modal inicial una sola vez.
- **Tarjetas de Modo de Juego (Game Mode Cards)**: Reemplazar el rectángulo aburrido de "Crear Sala" y "Buscar Partida" por dos o tres grandes **Tarjetas Interactivas** que ocupen el centro:
  1. **Partida Clasificatoria (Ranked)**: Tarjeta destacada (brillo dorado/púrpura), grande. Jugar 1v1 por ELO.
  2. **Sala Privada (Amigos)**: Tarjeta secundaria. Crear o unirse a una sala con código.
  3. **Torneos (Eventos)**: Acceso directo a los eventos en vivo.
- **Micro-interacciones**: Al hacer hover sobre estas tarjetas, deben inclinarse ligeramente (efecto 3D o `transform: perspective`), el borde debe iluminarse y el ícono central debe tener una animación sutil.

### 2.4. Paneles Laterales (Social y Estadísticas)
- **Glassmorphism Real**: Reducir la opacidad de los fondos sólidos (de `bg-slate-900` a `bg-black/20` o similar) y aumentar el `backdrop-blur` para que se funda con la atmósfera del juego.
- **Iconografía Vibrante**: Reemplazar textos planos de estadísticas (Monedas, ELO, Win Rate) por paneles con iconos coloridos (neón) y tipografía de números grande (ej. `font-display`).
- **Lista de Amigos**: Indicadores de "Online" / "En Partida" que brillen (glow) para dar sensación de actividad en tiempo real.

## 3. Plan de Implementación
1. **Refactorización CSS / Tailwind**: Actualizar `index.css` con nuevas utilidades de animación (`pulse-slow`, `float`, degradados holográficos).
2. **Actualización de Componentes**:
   - Modificar `MainMenu.tsx` para implementar el nuevo layout central (Tarjetas de Modos).
   - Modificar `TopNavbar.tsx` para estilizar la navegación y el perfil.
   - Actualizar `QuickStats.tsx` y `SocialPanel.tsx` para aplicar el verdadero efecto *Glassmorphism*.
3. **Flujo de Usuario**: Asegurar que si el jugador no tiene `username`, aparezca un modal de bienvenida obligando a setear un GamerTag, limpiando así el Lobby de inputs innecesarios.