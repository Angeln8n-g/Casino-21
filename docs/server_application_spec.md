# Especificación de la Capa de Aplicación del Servidor (server/src/application)

Este documento sirve como especificación técnica para la capa de aplicación ubicada en el directorio [server/src/application](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application). Su principal responsabilidad es orquestar la lógica del juego de cartas Casino 21, validar las jugadas de acuerdo a las reglas oficiales y mantener la consistencia del estado.

---

## 1. Estructura de Componentes

La capa de aplicación está compuesta por cinco módulos principales:

```
server/src/application/
├── action-validator.ts   # Validación estricta de jugadas del juego.
├── game-engine.ts        # Orquestador del flujo y transiciones de estado.
├── persistence.ts        # Serialización y deserialización del estado.
├── score-calculator.ts   # Cálculo de puntuación por ronda y victorias tempranas.
└── turn-manager.ts       # Control de orden de turnos y repartos de cartas.
```

---

## 2. Descripción Detallada de Módulos

### 2.1 [game-engine.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts)
El motor de juego principal está implementado en la clase [DefaultGameEngine](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts#L79), la cual implementa la interfaz [GameEngine](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts#L20).

* **Responsabilidades**:
  * **Inicializar Partidas**: A través de [startNewGame](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts#L95), baraja y reparte 4 cartas a cada jugador y 4 al tablero, configurando el modo (`1v1` o `2v2`).
  * **Procesar Jugadas**: El método [playCard](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts#L152) valida y aplica las acciones de los jugadores (`colocar`, `llevar`, `formar`, `formarPar`, `aumentarFormacion`, `cantar`).
  * **Gestión de Turnos Expirados**: El método [getTimeoutAction](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/game-engine.ts#L636) implementa la lógica de descarte automático de turnos por tiempo (prioriza recoger la propia formación del jugador; si no es posible, bota la carta de menor valor que no sea un As).
  * **Manejo de Transiciones**: Avanza a la siguiente mano de reparto cuando los jugadores agotan sus manos y finaliza la ronda cuando se agota el mazo principal.

### 2.2 [action-validator.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/action-validator.ts)
Este módulo se encarga de hacer cumplir las reglas del juego de Casino 21 mediante la clase [DefaultActionValidator](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/action-validator.ts#L127).

* **Reglas Validadas**:
  * **Verificación de Turno**: Bloquea acciones de jugadores fuera de su turno asignado.
  * **Mapeo de Combinaciones / Sumas**: La función [canPartitionIntoSum](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/action-validator.ts#L62) calcula recursivamente (backtracking) si un subconjunto de cartas puede agruparse en sumas equivalentes al valor objetivo.
  * **Obligación de Llevar Formaciones Propias**: Si un jugador tiene una formación pendiente en el tablero que él mismo creó, está obligado a llevársela en su turno si decide llevar cartas de ese valor (evita dejar formaciones inactivas indefinidamente).
  * **Protección de Cartas Cantadas**: Las cartas cantadas (generalmente Ases) están protegidas y solo pueden ser capturadas por otro As (valores `1` o `14`).
  * **Acciones Admitidas**: [ActionType](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/action-validator.ts#L4) (`llevar`, `formar`, `formarPar`, `cantar`, `colocar`, `aumentarFormacion`, `botar`).

### 2.3 [score-calculator.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/score-calculator.ts)
Calcula las puntuaciones en Casino 21, implementado en [DefaultScoreCalculator](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/score-calculator.ts#L15).

* **Reglas de Puntuación**:
  * **Mayoría de Cartas**: El jugador/equipo con 27 o más cartas recibe `3 puntos`.
  * **Mayoría de Picas**: El jugador/equipo con 7 o más picas recibe `1 punto`.
  * **10 de Diamantes (Diez de Brillo)**: Otorga `2 puntos`.
  * **2 de Picas (Dos de Negrito)**: Otorga `1 punto`.
  * **Ases**: Cada As recolectado otorga `1 punto`.
  * **Virados**: Cada virado neto (tablero limpio) otorga `1 punto`. (Se restan virados acumulados al rival si el jugador realiza un nuevo virado).
* **Restricciones de Puntuación según el Marcador**:
  * Si el marcador del jugador es **17 puntos**: No puede sumar virados, ases, 10 de diamantes ni 2 de picas. Solo califica para la mayoría de cartas y mayoría de picas.
  * Si el marcador es **18 o 19 puntos**: Solo puede sumar si asegura la mayoría de cartas (+3 puntos).
  * Si el marcador es **20 puntos**: Solo puede sumar si asegura la mayoría de picas (+1 punto).
* **Victoria Temprana ([checkEarlyWin](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/score-calculator.ts#L16))**:
  Evalúa a mitad de ronda si un jugador ha asegurado matemáticamente la cantidad de puntos necesarios para alcanzar o superar los 21 puntos (por ejemplo, al tener ya más de 27 cartas o 7 picas recolectadas que aseguran los puntos de mayoría).

### 2.4 [turn-manager.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/turn-manager.ts)
Controla el orden secuencial del juego mediante [DefaultTurnManager](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/turn-manager.ts#L11).

* **Métodos**:
  * [getNextPlayer](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/turn-manager.ts#L12): Retorna el índice del próximo jugador activo en base a un incremento circular.
  * [isRoundComplete](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/turn-manager.ts#L16): Retorna verdadero si todos los jugadores en la ronda se han quedado sin cartas en la mano.
  * [startNewRound](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/turn-manager.ts#L20): Inicia una nueva mano de reparto, entregando 4 cartas a cada jugador desde el mazo remanente e incrementando el contador de manos.

### 2.5 [persistence.ts](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/persistence.ts)
Facilita la serialización del estado del juego a formato JSON para guardar y reanudar partidas.

* **Métodos**:
  * [serializeGameState](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/persistence.ts#L10): Convierte un objeto [GameState](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/domain/game-state.ts) a un string JSON formateado con metadatos de versión.
  * [deserializeGameState](file:///c:/Users/angel/Desktop/Develop/Web%20all%20projects/casino-21-card-game/server/src/application/persistence.ts#L18): Carga un string JSON en un objeto de estado del juego, validando la versión (`CURRENT_VERSION = 1`) y aplicando validaciones de integridad estructural.
