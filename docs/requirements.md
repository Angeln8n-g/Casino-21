# Requirements Document

## Introduction

Casino 21 es un juego de cartas tradicional basado en naipes españoles o franceses donde los jugadores compiten para alcanzar 21 puntos mediante la recolección estratégica de cartas del tablero. El juego soporta dos modos: 1 vs 1 (dos jugadores) y 2 vs 2 (cuatro jugadores en equipos). Los jugadores pueden llevar cartas, formar sumatorias, y utilizar estrategias avanzadas como el virado para maximizar su puntuación.

## Glossary

- **Game_Engine**: El sistema principal que coordina todas las mecánicas del juego
- **Deck**: El mazo de 52 cartas tradicionales
- **Board**: El tablero donde se colocan las cartas descubiertas
- **Player**: Un participante individual en el juego
- **Team**: Un equipo de dos jugadores en modo 2 vs 2
- **Hand**: Las cartas ocultas que posee cada jugador
- **Formation**: Una combinación de cartas en el tablero que suman un valor específico
- **Llevar**: Acción de recoger cartas del tablero que coinciden en valor con una carta de la mano
- **Virado**: Bonus otorgado cuando un jugador recoge la última carta del tablero antes de finalizar la partida
- **Round**: Una serie de jugadas donde cada jugador recibe 4 cartas
- **Match**: Una partida completa que termina cuando un jugador o equipo alcanza 21 puntos
- **Score_Calculator**: Componente que calcula los puntos al final de cada ronda
- **Card_Value**: El valor numérico de una carta (As=1, 2-10=valor nominal, J=11, Q=12, K=13)

## Requirements

### Requirement 1: Inicialización del Juego

**User Story:** Como jugador, quiero iniciar una nueva partida seleccionando el modo de juego, para que pueda jugar solo contra otro jugador o en equipos.

#### Acceptance Criteria

1. THE Game_Engine SHALL permitir seleccionar entre modo 1 vs 1 y modo 2 vs 2
2. WHEN se inicia una partida, THE Game_Engine SHALL barajar el Deck completo de 52 cartas
3. WHEN se inicia una partida, THE Game_Engine SHALL repartir 4 cartas ocultas a cada Player
4. WHEN se inicia una partida, THE Game_Engine SHALL colocar 4 cartas descubiertas en el Board
5. WHEN se inicia una partida, THE Game_Engine SHALL seleccionar aleatoriamente el primer Player
6. THE Game_Engine SHALL asignar el turno final al Player que repartió las cartas

### Requirement 2: Gestión de Turnos

**User Story:** Como jugador, quiero que el sistema gestione los turnos correctamente, para que cada jugador juegue en el orden apropiado.

#### Acceptance Criteria

1. THE Game_Engine SHALL mantener un orden secuencial de turnos entre los Players
2. WHEN un Player completa su jugada, THE Game_Engine SHALL pasar el turno al siguiente Player
3. WHILE es el turno de un Player, THE Game_Engine SHALL permitir solo a ese Player realizar acciones
4. WHERE modo 2 vs 2, THE Game_Engine SHALL alternar turnos entre Players de equipos diferentes
5. WHEN todos los Players han jugado sus 4 cartas, THE Game_Engine SHALL iniciar una nueva Round si quedan cartas en el Deck

### Requirement 3: Acción de Llevar Cartas

**User Story:** Como jugador, quiero llevar cartas del tablero que coincidan con el valor de mis cartas, para acumular cartas y ganar puntos.

#### Acceptance Criteria

1. WHEN un Player selecciona una carta de su Hand, THE Game_Engine SHALL identificar todas las cartas en el Board con el mismo Card_Value
2. WHEN un Player lleva cartas, THE Game_Engine SHALL remover las cartas coincidentes del Board y agregarlas a la colección del Player
3. WHEN un Player lleva cartas, THE Game_Engine SHALL remover la carta jugada de la Hand del Player
4. IF no hay cartas coincidentes en el Board, THEN THE Game_Engine SHALL colocar la carta del Player en el Board
5. THE Game_Engine SHALL permitir llevar múltiples cartas del Board con una sola carta de la Hand si tienen el mismo Card_Value

### Requirement 4: Formación de Sumatorias

**User Story:** Como jugador, quiero formar sumatorias combinando cartas del tablero, para crear oportunidades de recolección en turnos futuros.

#### Acceptance Criteria

1. WHEN un Player selecciona cartas del Board cuya suma de Card_Value es igual a una carta en su Hand, THE Game_Engine SHALL permitir crear una Formation
2. WHEN se crea una Formation, THE Game_Engine SHALL agrupar visualmente las cartas involucradas en el Board
3. WHEN se crea una Formation, THE Game_Engine SHALL registrar el Player que la creó
4. WHEN un Player lleva una Formation, THE Game_Engine SHALL remover todas las cartas de la Formation del Board
5. THE Game_Engine SHALL permitir a cualquier Player llevar una Formation creada por otro Player si tiene una carta con el Card_Value correspondiente

### Requirement 5: Formar Pares sobre Formaciones

**User Story:** Como jugador, quiero colocar una carta sobre una formación existente del mismo valor, para aumentar el valor de la formación.

#### Acceptance Criteria

1. WHEN existe una Formation en el Board, THE Game_Engine SHALL permitir a un Player colocar una carta con el mismo Card_Value sobre ella
2. WHEN se forma un par sobre una Formation, THE Game_Engine SHALL actualizar la Formation para incluir la nueva carta
3. WHEN se lleva una Formation con pares, THE Game_Engine SHALL entregar todas las cartas de la Formation al Player
4. THE Game_Engine SHALL mantener visible el Card_Value total de cada Formation en el Board

### Requirement 6: Cantar una Carta (Aces)

**User Story:** Como jugador, quiero cantar una carta cuando tengo dos Ases y no puedo hacer formaciones, para proteger mis cartas y continuar el juego.

#### Acceptance Criteria

1. WHEN un Player tiene dos Ases en su Hand, THE Game_Engine SHALL permitir la acción de cantar
2. WHEN un Player canta un As, THE Game_Engine SHALL colocar el As en el Board de forma especial
3. WHEN un Player canta un As, THE Game_Engine SHALL prevenir que otros Players lleven ese As hasta el próximo turno del Player que lo cantó
4. THE Game_Engine SHALL permitir cantar solo cuando el Player tiene al menos dos Ases en su Hand
5. IF un Player intenta cantar sin tener dos Ases, THEN THE Game_Engine SHALL rechazar la acción

### Requirement 7: Sistema de Virado

**User Story:** Como jugador, quiero obtener un virado cuando recojo la última carta del tablero, para ganar puntos adicionales.

#### Acceptance Criteria

1. WHEN un Player lleva la última carta del Board antes de finalizar la Match, THE Game_Engine SHALL otorgar un Virado al Player
2. WHEN se otorga un Virado, THE Game_Engine SHALL registrarlo para el cálculo de puntos
3. THE Game_Engine SHALL permitir múltiples Virados por Player durante una Match
4. WHEN finaliza una Round, THE Score_Calculator SHALL sumar 1 punto por cada Virado obtenido
5. THE Game_Engine SHALL mostrar visualmente cuando un Player obtiene un Virado

### Requirement 8: Cálculo de Puntuación por Ronda

**User Story:** Como jugador, quiero que el sistema calcule automáticamente los puntos al final de cada ronda, para saber mi progreso hacia los 21 puntos.

#### Acceptance Criteria

1. WHEN finaliza una Round, THE Score_Calculator SHALL contar las cartas recolectadas por cada Player o Team
2. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 3 puntos al Player o Team con la mayoría de cartas
3. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto al Player o Team con la mayoría de picas
4. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 2 puntos al Player o Team que tenga el 10 de diamantes
5. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto al Player o Team que tenga el 2 de picas
6. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto por cada As recolectado
7. WHEN finaliza una Round, THE Score_Calculator SHALL otorgar 1 punto por cada Virado obtenido
8. THE Score_Calculator SHALL sumar los puntos de la Round al total acumulado de cada Player o Team

### Requirement 9: Reglas Especiales al Acercarse a 21 Puntos

**User Story:** Como jugador, quiero que el sistema aplique reglas especiales cuando me acerco a 21 puntos, para mantener el balance competitivo del juego.

#### Acceptance Criteria

1. WHEN un Player o Team tiene 17 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas y mayoría de picas
2. WHEN un Player o Team tiene 18 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas
3. WHEN un Player o Team tiene 19 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de cartas
4. WHEN un Player o Team tiene 20 puntos, THE Score_Calculator SHALL otorgar puntos solo por mayoría de picas
5. THE Score_Calculator SHALL aplicar estas restricciones automáticamente basándose en el puntaje actual

### Requirement 10: Condición de Victoria

**User Story:** Como jugador, quiero que el juego termine cuando alguien alcance 21 puntos, para tener un objetivo claro de victoria.

#### Acceptance Criteria

1. WHEN un Player o Team alcanza exactamente 21 puntos, THE Game_Engine SHALL declarar al Player o Team como ganador
2. WHEN un Player o Team alcanza más de 21 puntos, THE Game_Engine SHALL declarar al Player o Team como ganador
3. WHEN se declara un ganador, THE Game_Engine SHALL finalizar la Match
4. THE Game_Engine SHALL mostrar el puntaje final y el ganador al finalizar la Match

### Requirement 11: Gestión de Rondas

**User Story:** Como jugador, quiero que el sistema gestione correctamente las rondas del juego, para que el flujo de juego sea coherente.

#### Acceptance Criteria

1. WHERE modo 1 vs 1, THE Game_Engine SHALL permitir 6 jugadas por Player por Round
2. WHERE modo 2 vs 2, THE Game_Engine SHALL permitir 3 jugadas por Player por Round
3. WHEN todos los Players han jugado todas sus cartas de la Round, THE Game_Engine SHALL calcular los puntos
4. WHEN quedan cartas en el Deck y ningún Player ha alcanzado 21 puntos, THE Game_Engine SHALL iniciar una nueva Round
5. WHEN se inicia una nueva Round, THE Game_Engine SHALL repartir 4 cartas nuevas a cada Player
6. IF el Deck no tiene suficientes cartas para una nueva Round, THEN THE Game_Engine SHALL finalizar la Match y declarar ganador al Player o Team con más puntos

### Requirement 12: Restricciones de Juego

**User Story:** Como jugador, quiero que el sistema impida acciones prohibidas, para mantener la integridad del juego.

#### Acceptance Criteria

1. WHEN una partida ha iniciado, THE Game_Engine SHALL prevenir que los Players vean las cartas ocultas de otros Players
2. WHERE modo 2 vs 2, THE Game_Engine SHALL prevenir comunicación o señales entre compañeros de Team
3. THE Game_Engine SHALL prevenir que un Player realice acciones fuera de su turno
4. THE Game_Engine SHALL validar cada acción antes de ejecutarla
5. IF un Player intenta una acción inválida, THEN THE Game_Engine SHALL mostrar un mensaje de error y permitir seleccionar otra acción

### Requirement 13: Interfaz de Usuario del Tablero

**User Story:** Como jugador, quiero ver claramente el estado del tablero y mis cartas, para tomar decisiones informadas durante mi turno.

#### Acceptance Criteria

1. THE Game_Engine SHALL mostrar las 4 cartas del Board de forma visible
2. THE Game_Engine SHALL mostrar las cartas de la Hand del Player actual de forma visible solo para ese Player
3. THE Game_Engine SHALL mostrar el puntaje actual de cada Player o Team
4. THE Game_Engine SHALL mostrar qué Player tiene el turno actual
5. THE Game_Engine SHALL mostrar las Formations activas en el Board con sus Card_Values
6. THE Game_Engine SHALL mostrar el número de cartas recolectadas por cada Player o Team
7. THE Game_Engine SHALL mostrar los Virados obtenidos por cada Player o Team

### Requirement 14: Validación de Acciones

**User Story:** Como jugador, quiero que el sistema valide mis acciones antes de ejecutarlas, para evitar movimientos ilegales.

#### Acceptance Criteria

1. WHEN un Player intenta llevar cartas, THE Game_Engine SHALL verificar que el Card_Value coincida
2. WHEN un Player intenta crear una Formation, THE Game_Engine SHALL verificar que la suma de Card_Values sea correcta
3. WHEN un Player intenta cantar un As, THE Game_Engine SHALL verificar que el Player tenga al menos dos Ases
4. IF una acción es inválida, THEN THE Game_Engine SHALL mostrar un mensaje explicativo y permitir otra acción
5. THE Game_Engine SHALL prevenir que un Player termine su turno sin jugar una carta

### Requirement 15: Persistencia del Estado del Juego

**User Story:** Como jugador, quiero que el sistema mantenga el estado completo del juego, para poder pausar y continuar partidas.

#### Acceptance Criteria

1. THE Game_Engine SHALL mantener el estado actual de todas las cartas en el Board, Hands, y colecciones de Players
2. THE Game_Engine SHALL mantener el puntaje acumulado de cada Player o Team
3. THE Game_Engine SHALL mantener el registro de Virados obtenidos
4. THE Game_Engine SHALL mantener el orden de turnos y el Player actual
5. THE Game_Engine SHALL mantener el número de Round actual
6. THE Game_Engine SHALL permitir guardar el estado completo de una Match en progreso
7. THE Game_Engine SHALL permitir cargar y continuar una Match guardada previamente
