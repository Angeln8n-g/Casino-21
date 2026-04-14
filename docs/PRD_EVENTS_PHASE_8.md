# PRD - Fase 8: Matchmaking y Temporadas Clasificatorias

## 1. Visión y Objetivos
Reemplazar la búsqueda manual y simple de partidas 1v1 por un verdadero **Matchmaking (Emparejamiento) Competitivo**. Crear un ciclo a largo plazo (Temporadas) para que el juego tenga un incentivo de progresión sostenido (Divisiones como Bronce, Plata, Oro, Diamante).

## 2. Alcance
- **Cola de Emparejamiento (Matchmaking Queue)**: Un sistema de backend en Node.js que agrupe a los jugadores en "colas" basándose en su ELO.
- **Tolerancia de Búsqueda**: Algoritmo de "Rango Expandible" que empieza buscando rivales muy cercanos en ELO (+/- 50 puntos), y a medida que pasa el tiempo (cada 10 segundos) amplía el rango (+/- 100, +/- 200).
- **Sistema de Temporadas**:
  - Un concepto global (ej. "Temporada 1: El Despertar").
  - Inicio y Fin programados (cada mes o trimestre).
  - Soft-Reset de ELO al inicio de cada temporada.
- **Recompensas de Fin de Temporada**: Distribución de Monedas y Títulos Exclusivos basados en el rango más alto alcanzado (Peak Rank).

## 3. Base de Datos
- Modificar la tabla `profiles` para almacenar `peak_elo` y `current_season_elo`.
- Tabla `seasons` (id, name, start_date, end_date, is_active).
- Historial de `season_rankings` por jugador.

## 4. UI/UX
- Reemplazar el botón "Unirse a una Sala" por un enorme botón "Buscar Partida Competitiva".
- Pantalla de carga animada "Buscando oponente..." con contador de tiempo estimado.
- Efectos especiales al ser emparejado ("¡PARTIDA ENCONTRADA!").
