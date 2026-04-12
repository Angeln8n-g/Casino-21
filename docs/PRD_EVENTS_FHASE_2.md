# PRD - Fase 2: Sistema de Torneos (Brackets)

## 1. Visión y Objetivos
Basándonos en la Fase 1 (Eventos informativos), la Fase 2 introduce la **mecánica real de competición**. El objetivo es permitir que los jugadores se inscriban en un evento tipo "Torneo", el cual generará automáticamente un árbol de eliminación directa (Bracket) al comenzar.

## 2. Flujo del Usuario
1. **Inscripción**: El jugador entra a `EventsPage`, ve un evento "Próximo" y presiona "Inscribirse" (se deduce el `entry_fee`).
2. **Generación del Bracket**: Cuando el admin cambia el estado a `live` (o automáticamente por fecha), el sistema toma a los inscritos (ej. 8, 16 o 32 jugadores), los mezcla aleatoriamente y genera los emparejamientos de Cuartos, Semifinal, etc.
3. **Visualización del Árbol (Bracket)**: El jugador puede ver un diagrama interactivo estilo campeonato deportivo:
   - Bloques conectando ganadores hacia el centro (la Copa).
   - Estados de partida: Pendiente, En Juego, Finalizada.
4. **Jugar la Partida**: Si es el turno del jugador, el bloque muestra un botón "Unirse a la Partida". Esto crea una sala privada en el motor de juego.
5. **Avance Automático**: Al terminar la partida, el ganador avanza al siguiente bloque del bracket y espera a su siguiente rival.
6. **Finalización**: El ganador de la final recibe el premio (monedas/ELO/logro).

## 3. Especificaciones Visuales (El Árbol)
Como en la referencia proporcionada (esquema de "Soccer Championship"):
- **Estructura**: Dos lados (Izquierda y Derecha) que convergen en el centro, o un árbol clásico de izquierda a derecha. Para Casino 21, el árbol simétrico que converge al centro con una copa/trofeo dorado es el ideal para finales épicas.
- **Bloques de Partido (Match Nodes)**:
  - Nombre del Jugador 1 vs Nombre del Jugador 2.
  - Avatar o borde de color según estado (Gris=Pendiente, Rojo=En vivo, Verde/Dorado=Ganador).
- **Conectores**: Líneas de neón sólidas que trazan el camino del ganador.
- **Trofeo Central**: Icono brillante en el centro que se ilumina cuando se corona al campeón.

## 4. Modelo de Datos Adicional (Backend)
Necesitamos expandir Supabase para soportar la estructura del árbol.

```sql
-- TABLA: tournament_matches (Partidas del árbol)
CREATE TABLE public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  round_number INTEGER NOT NULL, -- Ej: 1 (Cuartos), 2 (Semi), 3 (Final)
  match_order INTEGER NOT NULL, -- Posición en el árbol (arriba hacia abajo)
  player1_id UUID REFERENCES profiles(id), -- Puede ser NULL si aún no se decide
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  game_room_id TEXT, -- ID de la sala del motor de juego de Casino 21
  status TEXT NOT NULL DEFAULT 'pending' -- 'pending', 'ready', 'playing', 'completed'
);
```

## 5. Recomendación Técnica: ¿Por qué esta fase es la ideal ahora?
Implementar la lógica del torneo (el bracket) es el **corazón competitivo** de la aplicación. 
Antes de agregar ELO complejo o una tienda con dinero, los jugadores necesitan una razón para competir. El árbol de torneo genera urgencia ("Tengo que ganar esta ronda para pasar a la semi") y retención inmediata.

## 6. Siguientes Pasos (Roadmap Fase 2)
1. **Paso 2.1**: Script SQL para crear la tabla `tournament_matches` y lógica de inscripción (deducción de saldo/entry_fee básico).
2. **Paso 2.2**: UI del Bracket en Frontend (Componente visual simétrico).
3. **Paso 2.3**: Lógica de generación automática de brackets (emparejar a los 8/16 inscritos).
4. **Paso 2.4**: Integrar los "Nodos" del bracket con la creación de salas de juego real.
