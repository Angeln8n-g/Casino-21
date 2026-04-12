# PRD - Fase 1: Plataforma de Eventos (Casino 21)

## 1. Visión y Objetivos
Convertir a Casino 21 en una plataforma altamente competitiva y atractiva, mediante la introducción de eventos dinámicos (torneos, ligas, especiales) que incentiven la participación regular.

## 2. Alcance (Fase 1)
- **Página Principal de Eventos (Frontend)**: Interfaz futurista/casino moderno con carrusel, hero banner, y tarjetas de estado (LIVE, PRÓXIMO, FINALIZADO).
- **Navegación**: Inclusión de pestaña "Eventos" en la barra superior (Desktop) y menú inferior (Móvil).
- **Mocks Iniciales**: Presentación visual completa con datos simulados, lista para conectarse al backend en la Fase 2.

## 3. Especificaciones Visuales (Futurista / Cyber-Casino)
- **Hero Banner**: Imagen/Fondo destacado con overlay oscuro, tipografía display (fuente gruesa), botón de llamada a la acción primario brillante (dorado/neón), contador de tiempo en monoespacio.
- **Tarjetas de Eventos**:
  - Efecto "Glassmorphism" (fondos semi-transparentes, bordes de luz).
  - Etiquetas de estado con *glow* (Resplandor rojo para LIVE, azul/cian para PRÓXIMO, gris para FINALIZADO).
  - Íconos y micro-gradientes para representar recompensas (Monedas, XP, ELO).
- **Interacciones**: Efectos de *hover* que eleven la tarjeta y aumenten el resplandor de los bordes.

## 4. Modelo de Datos (Backend - Fase 2)
Para referencia, cuando conectemos la BD, un Evento tendrá:
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  type: 'torneo' | 'liga' | 'especial';
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  start_date: string;
  end_date: string;
  entry_fee: number; // Costo en monedas
  prize_pool: string; // Ej: "10,000 Monedas + Skin Exclusiva"
  min_elo: number; // Requisito competitivo
  image_url: string; // Banner asociado
  participants_count: number;
}
```

## 5. Endpoints Planeados (Backend - Fase 2)
- `GET /api/events`: Listar eventos (filtrado por estado/tipo).
- `GET /api/events/:id`: Detalle completo, leaderboard del evento.
- `POST /api/events/:id/join`: Inscribirse pagando el `entry_fee`.

## 6. Siguientes Pasos (Roadmap)
1. **Hoy**: UI de Eventos (React/Tailwind) con Mocks. *(En curso)*
2. **Semana 2**: Backend CRUD de eventos (Tablas, Endpoints).
3. **Semana 3**: Panel de Administración (Gestión de eventos para staff).
4. **Semana 4**: Sistema ELO y Monedas reales (Wallet).
