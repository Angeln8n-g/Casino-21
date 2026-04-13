# PRD - Fase 3: Panel de Administración Avanzado (Gestión de Eventos)

## 1. Visión y Objetivos
Basándonos en la Fase 2 (Sistema de Torneos y Brackets automáticos), la **Fase 3** se centra en dotar al equipo de administración (Staff) de herramientas robustas para gestionar incidencias, moderar torneos y controlar el flujo de los eventos en tiempo real. Un sistema automatizado requiere supervisión manual para casos excepcionales (desconexiones, jugadores tóxicos, abandonos).

## 2. Alcance (Fase 3)
Esta fase expande el componente `AdminPanel.tsx` existente, añadiendo las siguientes capacidades:

### 2.1 Gestión de Participantes (Pre-Torneo)
- **Vista de Inscritos**: Un modal o sección expandible en la tabla de eventos que permita al administrador ver la lista completa de jugadores inscritos en un evento en estado `upcoming`.
- **Expulsión Manual**: Capacidad de remover a un jugador inscrito (ej. por comportamiento indebido previo) antes de generar las llaves.
- **Inscripción Forzada (Opcional)**: Añadir a un jugador manualmente saltando el pago de inscripción (útil para streamers, invitados VIP o compensaciones).

### 2.2 Modificación Manual de Llaves (Durante el Torneo)
- **Vista de Brackets Admin**: Una versión interactiva del `TournamentBracket` exclusiva para administradores.
- **Declarar "No Show" (W.O.)**: Si un jugador no se presenta a la sala de juego, el admin puede marcar su nodo como `no_show`.
- **Avance Forzado**: Relacionado con el punto anterior, si hay un "No Show", el administrador debe poder seleccionar manualmente al oponente para que avance a la siguiente ronda sin jugar la partida.
- **Reiniciar Encuentro**: Capacidad de devolver un encuentro de `completed` a `pending` y borrar el `winner_id` en caso de disputas o fallos del servidor.

### 2.3 Control Global del Evento
- **Finalización Manual**: Botón para cambiar el estado del evento de `live` a `completed`.
- **Cierre Forzado**: Capacidad de cancelar un torneo en curso (cambiar a `draft` o `cancelled` - *requeriría nuevo estado*) si ocurre un error crítico.

## 3. Especificaciones Visuales (Admin Panel)
- **Botones de Acción**: Añadir botones de iconos (ej. 👥 para ver participantes, 🏆 para gestionar llaves) en la columna de "Acciones" de la tabla de eventos en `AdminPanel.tsx`.
- **Modales de Gestión**:
  - Modal "Participantes": Lista limpia con Avatar, Nombre y botón rojo de "Expulsar".
  - Modal "Gestión de Llaves": Renderiza el árbol, pero al hacer clic en un nodo, abre un menú contextual (Dropdown) con opciones: "Forzar Victoria P1", "Forzar Victoria P2", "Marcar No Show P1/P2".

## 4. Cambios en el Modelo de Datos (Backend)
No se requieren migraciones estructurales masivas, ya que las tablas `events`, `event_entries` y `tournament_matches` ya soportan estos estados.
- Asegurarse de que el estado `no_show` esté soportado en el `CHECK` constraint de `tournament_matches.status` (Ya fue añadido en la migración de la Fase 2).

## 5. Endpoints / Acciones Supabase
Se requerirán las siguientes interacciones desde el cliente frontend hacia Supabase:
- `DELETE FROM event_entries WHERE event_id = X AND player_id = Y`
- `UPDATE tournament_matches SET winner_id = X, status = 'completed' WHERE id = Y` (Y ejecutar la lógica RPC o de cliente para avanzar el nodo, similar a lo que hace el servidor).

## 6. Siguientes Pasos (Roadmap Fase 3)
1. **Paso 3.1**: Implementar UI de Modal de Participantes en `AdminPanel.tsx`.
2. **Paso 3.2**: Lógica de eliminación de `event_entries`.
3. **Paso 3.3**: Implementar vista y control de modificación de llaves (Brackets Admin).
4. **Paso 3.4**: Integrar avance manual en el árbol (replicando la lógica de avance del servidor).
