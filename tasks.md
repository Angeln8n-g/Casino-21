# Implementation Plan: Casino 21 Card Game

## Overview

Este plan implementa el MVP del juego Casino 21 en TypeScript con arquitectura de 3 capas (Dominio, Aplicación, Presentación). El enfoque es incremental: primero los modelos de dominio, luego la lógica del juego, después la puntuación, y finalmente la interfaz y persistencia.

## Tasks

- [x] 1. Configurar proyecto y estructura base
  - Inicializar proyecto TypeScript con tsconfig.json
  - Configurar Jest y fast-check para testing
  - Crear estructura de directorios (src/domain, src/application, src/presentation)
  - Configurar scripts de build y test en package.json
  - _Requirements: 15.1_


- [x] 2. Implementar modelos de dominio básicos
  - [x] 2.1 Crear tipos y enums (Suit, Rank, GameMode, GamePhase, ErrorCode)
    - Definir todos los tipos enumerados del sistema
    - _Requirements: 1.1_
  
  - [x] 2.2 Implementar modelo Card con validación
    - Crear interfaz Card con id, suit, rank, value
    - Implementar función de creación de cartas con validación
    - _Requirements: 1.2_
  
  - [x]* 2.3 Escribir unit tests para Card
    - Probar creación de cartas válidas e inválidas
    - Probar valores correctos para cada rango
    - _Requirements: 1.2_
  
  - [x] 2.4 Implementar Deck con shuffle y draw
    - Crear interfaz Deck con 52 cartas únicas
    - Implementar shuffle usando algoritmo Fisher-Yates
    - Implementar draw para extraer N cartas
    - _Requirements: 1.2_
  
  - [x]* 2.5 Escribir property test para Deck
    - **Property 2: Card conservation invariant**
    - **Validates: Requirements 1.2**
    - Verificar que shuffle mantiene 52 cartas únicas
    - Verificar que draw reduce el mazo correctamente

- [x] 3. Implementar modelos de jugadores y equipos
  - [x] 3.1 Crear interfaces Player y Team
    - Definir Player con id, name, hand, collectedCards, virados, score, teamId
    - Definir Team con id, playerIds, score, collectedCards, virados
    - _Requirements: 1.3, 1.1_
  
  - [x] 3.2 Implementar funciones de creación de jugadores
    - Crear función para inicializar jugadores en modo 1v1
    - Crear función para inicializar jugadores y equipos en modo 2v2
    - _Requirements: 1.1, 1.3_
  
  - [x]* 3.3 Escribir unit tests para Player y Team
    - Probar creación de jugadores individuales
    - Probar asignación correcta de equipos en modo 2v2
    - _Requirements: 1.1, 1.3_


- [x] 4. Implementar Board y Formation
  - [x] 4.1 Crear interfaces Board, Formation, y CantedCard
    - Definir Board con cards, formations, cantedCards
    - Definir Formation con id, cards, value, createdBy, createdAt
    - Definir CantedCard con card, cantedBy, protectedUntilTurn
    - _Requirements: 1.4, 4.1, 6.2_
  
  - [x] 4.2 Implementar operaciones de Board (addCard, removeCards, addFormation, removeFormation, isEmpty)
    - Todas las operaciones deben ser inmutables (retornar nuevo Board)
    - _Requirements: 1.4, 3.2, 4.2, 4.4_
  
  - [x]* 4.3 Escribir unit tests para Board
    - Probar todas las operaciones de Board
    - Verificar inmutabilidad
    - _Requirements: 1.4, 3.2, 4.2, 4.4_

- [x] 5. Implementar GameState
  - [x] 5.1 Crear interfaz GameState completa
    - Definir todos los campos del estado del juego
    - Asegurar que todos los campos sean readonly
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [x] 5.2 Implementar función de validación de invariantes
    - Validar conservación de 52 cartas
    - Validar unicidad de cartas
    - Validar índice de jugador actual
    - Validar sumas de formaciones
    - Validar puntuaciones no negativas
    - _Requirements: 15.1_
  
  - [x]* 5.3 Escribir property test para validación de invariantes
    - **Property 2: Card conservation invariant**
    - **Validates: Requirements 1.2, 3.2, 3.3, 4.4**
    - Generar estados de juego aleatorios y verificar invariantes

- [x] 6. Checkpoint - Verificar modelos de dominio
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.


- [x] 7. Implementar ActionValidator
  - [x] 7.1 Crear interfaz ActionValidator y tipos de Action
    - Definir tipos de Action (llevar, formar, formarPar, cantar, colocar)
    - Definir ValidationResult
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 7.2 Implementar validación de acción "llevar"
    - Verificar que la carta está en la mano del jugador
    - Verificar que las cartas del tablero coinciden en valor
    - _Requirements: 3.1, 14.1_
  
  - [x] 7.3 Implementar validación de acción "formar"
    - Verificar que la suma de cartas del tablero es correcta
    - Verificar que la carta jugada coincide con el valor de la formación
    - _Requirements: 4.1, 14.2_
  
  - [x] 7.4 Implementar validación de acción "formarPar"
    - Verificar que la formación existe
    - Verificar que el valor de la carta coincide con el valor de la formación
    - _Requirements: 5.1_
  
  - [x] 7.5 Implementar validación de acción "cantar"
    - Verificar que el jugador tiene al menos 2 ases en la mano
    - _Requirements: 6.1, 6.4, 6.5, 14.3_
  
  - [x] 7.6 Implementar getValidActions para sugerir acciones válidas
    - Dado un estado y jugador, retornar todas las acciones válidas posibles
    - _Requirements: 14.4_
  
  - [x]* 7.7 Escribir unit tests para ActionValidator
    - Probar cada tipo de validación con casos válidos e inválidos
    - Probar casos edge (tablero vacío, sin cartas en mano, etc.)
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 7.8 Escribir property test para validación de acciones
    - **Property 21: Invalid actions return appropriate errors**
    - **Validates: Requirements 12.5, 14.4**
    - Generar acciones inválidas y verificar que se rechazan correctamente


- [x] 8. Implementar TurnManager
  - [x] 8.1 Crear interfaz TurnManager
    - Definir métodos getNextPlayer, isRoundComplete, startNewRound, getTurnOrder
    - _Requirements: 2.1, 2.2, 2.5, 11.3_
  
  - [x] 8.2 Implementar lógica de progresión de turnos
    - Implementar getNextPlayer con rotación secuencial
    - En modo 2v2, asegurar alternancia entre equipos
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 8.3 Implementar detección de fin de ronda
    - Verificar si todos los jugadores han jugado todas sus cartas
    - _Requirements: 2.5, 11.3_
  
  - [x] 8.4 Implementar inicio de nueva ronda
    - Repartir 4 cartas nuevas a cada jugador
    - Verificar que el mazo tiene suficientes cartas
    - _Requirements: 2.5, 11.4, 11.5_
  
  - [x]* 8.5 Escribir unit tests para TurnManager
    - Probar progresión de turnos en modo 1v1 y 2v2
    - Probar detección de fin de ronda
    - Probar inicio de nueva ronda
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 11.3, 11.4, 11.5_
  
  - [ ]* 8.6 Escribir property test para progresión de turnos
    - **Property 3: Turn progression maintains sequential order**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    - Verificar que los turnos siempre avanzan correctamente


- [x] 9. Implementar ScoreCalculator
  - [x] 9.1 Crear interfaz ScoreCalculator y tipos de puntuación
    - Definir Points con todas las categorías de puntos
    - Definir ScoreResult y ScoreBreakdown
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 9.2 Implementar cálculo de mayoría de cartas (3 puntos)
    - Contar cartas recolectadas por cada jugador/equipo
    - Otorgar 3 puntos al que tenga más cartas
    - _Requirements: 8.2_
  
  - [x] 9.3 Implementar cálculo de mayoría de picas (1 punto)
    - Contar picas recolectadas por cada jugador/equipo
    - Otorgar 1 punto al que tenga más picas
    - _Requirements: 8.3_
  
  - [x] 9.4 Implementar puntos por cartas especiales
    - 2 puntos por 10 de diamantes
    - 1 punto por 2 de picas
    - 1 punto por cada As recolectado
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [x] 9.5 Implementar puntos por virados
    - 1 punto por cada virado obtenido
    - _Requirements: 8.7_
  
  - [x] 9.6 Implementar reglas especiales de puntuación (17-20 puntos)
    - A 17 puntos: solo mayoría de cartas y picas
    - A 18-19 puntos: solo mayoría de cartas
    - A 20 puntos: solo mayoría de picas
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 9.7 Implementar acumulación de puntos
    - Sumar puntos de la ronda al total acumulado
    - _Requirements: 8.8, 15.2_
  
  - [x]* 9.8 Escribir unit tests para ScoreCalculator
    - Probar cada categoría de puntos individualmente
    - Probar reglas especiales a 17, 18, 19, 20 puntos
    - Probar casos de empate
    - _Requirements: 8.1-8.8, 9.1-9.4_
  
  - [ ]* 9.9 Escribir property test para cálculo de puntuación
    - **Property 14: Score calculation follows all rules**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
    - Verificar que todas las reglas se aplican correctamente
  
  - [ ]* 9.10 Escribir property test para acumulación de puntos
    - **Property 15: Score accumulation is additive**
    - **Validates: Requirements 8.8, 15.2**
    - Verificar que los puntos se suman correctamente a través de rondas


- [x] 10. Checkpoint - Verificar componentes de aplicación
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 11. Implementar GameEngine - Inicialización
  - [x] 11.1 Crear interfaz GameEngine
    - Definir métodos startNewGame, loadGame, playCard, getCurrentState, getValidActions, saveGame
    - Definir tipo Result<T> para manejo de errores
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [x] 11.2 Implementar startNewGame
    - Crear mazo completo de 52 cartas
    - Barajar el mazo
    - Repartir 4 cartas a cada jugador
    - Colocar 4 cartas en el tablero
    - Seleccionar jugador inicial aleatorio
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x]* 11.3 Escribir unit tests para startNewGame
    - Probar inicialización en modo 1v1 y 2v2
    - Verificar que se reparten las cartas correctamente
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x]* 11.4 Escribir property test para inicialización
    - **Property 1: Game initialization creates valid state**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Verificar que el estado inicial siempre es válido


- [x] 12. Implementar GameEngine - Acciones de juego
  - [x] 12.1 Implementar playCard con validación de turno
    - Verificar que es el turno del jugador
    - Validar la acción usando ActionValidator
    - _Requirements: 2.3, 12.3, 14.4_
  
  - [x] 12.2 Implementar acción "llevar"
    - Remover cartas coincidentes del tablero
    - Agregar cartas a la colección del jugador
    - Remover carta jugada de la mano
    - Detectar y otorgar virado si el tablero queda vacío
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 7.1, 7.2_
  
  - [x] 12.3 Implementar acción "colocar"
    - Colocar carta en el tablero cuando no hay coincidencias
    - _Requirements: 3.4_
  
  - [x] 12.4 Implementar acción "formar"
    - Crear formación con las cartas seleccionadas
    - Registrar el jugador que creó la formación
    - Remover carta jugada de la mano
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 12.5 Implementar acción "formarPar"
    - Agregar carta a formación existente
    - Actualizar la formación en el tablero
    - _Requirements: 5.1, 5.2_
  
  - [x] 12.6 Implementar acción "cantar"
    - Colocar As en cantedCards con protección
    - Registrar turno de protección
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 12.7 Implementar lógica de llevar formaciones
    - Permitir llevar formaciones con carta del valor correspondiente
    - Transferir todas las cartas de la formación al jugador
    - _Requirements: 4.4, 4.5, 5.3_
  
  - [x]* 12.8 Escribir unit tests para acciones de juego
    - Probar cada tipo de acción con casos válidos
    - Probar detección de virado
    - Probar protección de cartas cantadas
    - _Requirements: 3.1-3.5, 4.1-4.5, 5.1-5.3, 6.1-6.3, 7.1-7.2_
  
  - [x]* 12.9 Escribir property test para acción llevar
    - **Property 6: Llevar action transfers matching cards correctly**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5, 14.1**
    - Verificar que las cartas se transfieren correctamente
  
  - [x]* 12.10 Escribir property test para colocación de cartas
    - **Property 7: Card placement when no matches exist**
    - **Validates: Requirements 3.4**
    - Verificar que las cartas se colocan en el tablero correctamente
  
  - [x]* 12.11 Escribir property test para formaciones
    - **Property 8: Formation creation requires valid sum**
    - **Validates: Requirements 4.1, 4.3, 14.2**
    - Verificar que solo se crean formaciones con sumas válidas
  
  - [x]* 12.12 Escribir property test para llevar formaciones
    - **Property 9: Formations can be taken by any player**
    - **Validates: Requirements 4.4, 4.5, 5.3**
    - Verificar que cualquier jugador puede llevar formaciones
  
  - [x]* 12.13 Escribir property test para virado
    - **Property 13: Virado awarded for clearing board**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Verificar que se otorga virado al limpiar el tablero


- [x] 13. Implementar GameEngine - Gestión de rondas y victoria
  - [x] 13.1 Integrar TurnManager en playCard
    - Avanzar al siguiente turno después de cada jugada
    - Detectar fin de ronda cuando todos los jugadores han jugado sus cartas
    - _Requirements: 2.2, 11.3_
  
  - [x] 13.2 Implementar transición entre rondas
    - Calcular puntos al final de cada ronda usando ScoreCalculator
    - Iniciar nueva ronda si quedan cartas y nadie ha ganado
    - _Requirements: 11.3, 11.4, 11.5_
  
  - [x] 13.3 Implementar detección de victoria
    - Declarar ganador cuando un jugador/equipo alcanza 21+ puntos
    - Declarar ganador por puntos si el mazo se agota
    - _Requirements: 10.1, 10.2, 10.3, 11.6_
  
  - [x]* 13.4 Escribir unit tests para gestión de rondas
    - Probar transición entre rondas
    - Probar detección de victoria por 21 puntos
    - Probar detección de victoria por mazo agotado
    - _Requirements: 10.1, 10.2, 10.3, 11.3, 11.4, 11.5, 11.6_
  
  - [x]* 13.5 Escribir property test para transición de rondas
    - **Property 5: Round transitions when hands are empty**
    - **Validates: Requirements 2.5, 11.3, 11.4, 11.5**
    - Verificar que las rondas se inician correctamente
  
  - [x]* 13.6 Escribir property test para victoria
    - **Property 19: Victory at 21 or more points**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - Verificar que el juego termina correctamente al alcanzar 21 puntos


- [x] 14. Checkpoint - Verificar GameEngine completo
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 15. Implementar persistencia (serialización/deserialización)
  - [x] 15.1 Crear interfaces de serialización
    - Definir SerializedGameState y tipos relacionados
    - _Requirements: 15.6, 15.7_
  
  - [x] 15.2 Implementar serialización de GameState a JSON
    - Convertir GameState a SerializedGameState
    - Incluir versión del formato para compatibilidad futura
    - _Requirements: 15.6_
  
  - [x] 15.3 Implementar deserialización de JSON a GameState
    - Reconstruir GameState desde SerializedGameState
    - Validar integridad del estado cargado
    - _Requirements: 15.7_
  
  - [x] 15.4 Implementar saveGame y loadGame en GameEngine
    - saveGame retorna JSON serializado
    - loadGame reconstruye el estado desde JSON
    - _Requirements: 15.6, 15.7_
  
  - [x]* 15.5 Escribir unit tests para serialización
    - Probar serialización y deserialización de estados completos
    - Probar manejo de versiones
    - _Requirements: 15.6, 15.7_
  
  - [x]* 15.6 Escribir property test para round trip
    - **Property 23: Game state serialization round trip**
    - **Validates: Requirements 15.6, 15.7**
    - Verificar que serializar y deserializar preserva el estado


- [x] 16. Implementar interfaz de usuario (CLI básica)
  - [x] 16.1 Crear módulo de presentación con funciones de display
    - Función para mostrar el tablero con cartas visibles
    - Función para mostrar la mano del jugador actual
    - Función para mostrar puntuaciones
    - Función para mostrar formaciones activas
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [x] 16.2 Implementar input del jugador
    - Solicitar selección de carta de la mano
    - Solicitar selección de acción (llevar, formar, cantar, colocar)
    - Solicitar selección de cartas del tablero para formar
    - _Requirements: 13.1, 13.2_
  
  - [x] 16.3 Implementar loop principal del juego
    - Mostrar estado actual
    - Solicitar acción del jugador
    - Ejecutar acción y mostrar resultado
    - Mostrar mensajes de error si la acción es inválida
    - Continuar hasta que el juego termine
    - _Requirements: 12.5, 14.4_
  
  - [x] 16.4 Implementar menú inicial
    - Selección de modo de juego (1v1 o 2v2)
    - Ingreso de nombres de jugadores
    - Opción de cargar partida guardada
    - _Requirements: 1.1, 15.7_
  
  - [x] 16.5 Implementar pantalla de fin de juego
    - Mostrar ganador
    - Mostrar puntuación final
    - Mostrar estadísticas de la partida
    - _Requirements: 10.3, 10.4_
  
  - [x]* 16.6 Escribir tests de integración para flujo completo
    - Simular una partida completa de principio a fin
    - Verificar que todas las mecánicas funcionan juntas
    - _Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.3, 6.1-6.5, 7.1-7.5, 8.1-8.8, 9.1-9.5, 10.1-10.4, 11.1-11.6_


- [x] 17. Implementar funcionalidad de guardar/cargar partida
  - [x] 17.1 Agregar opción de guardar durante el juego
    - Permitir al jugador guardar en cualquier momento
    - Guardar estado en archivo JSON
    - _Requirements: 15.6_
  
  - [x] 17.2 Agregar opción de cargar partida desde menú inicial
    - Listar partidas guardadas disponibles
    - Cargar y validar estado guardado
    - Continuar partida desde el punto guardado
    - _Requirements: 15.7_
  
  - [x]* 17.3 Escribir unit tests para guardar/cargar
    - Probar guardado de partida en progreso
    - Probar carga de partida guardada
    - Probar manejo de archivos corruptos
    - _Requirements: 15.6, 15.7_

- [x] 18. Pulir y documentar
  - [x] 18.1 Agregar README con instrucciones de uso
    - Explicar cómo instalar dependencias
    - Explicar cómo ejecutar el juego
    - Explicar cómo ejecutar los tests
    - Documentar las reglas del juego
  
  - [x] 18.2 Agregar comentarios y documentación en el código
    - Documentar interfaces públicas con JSDoc
    - Agregar comentarios explicativos en lógica compleja
  
  - [x] 18.3 Revisar y mejorar mensajes de error
    - Asegurar que todos los mensajes de error son claros y en español
    - Agregar sugerencias de corrección cuando sea posible
    - _Requirements: 12.5, 14.4_

- [x] 19. Checkpoint final - Verificar MVP completo
  - Ejecutar todos los tests (unit + property)
  - Jugar una partida completa manualmente
  - Verificar que todas las mecánicas funcionan correctamente
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.



## Notes

- Las tareas marcadas con `*` son opcionales (tests) y pueden omitirse para un MVP más rápido, aunque se recomienda implementarlas para asegurar corrección
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad
- Los checkpoints permiten validación incremental y oportunidad de hacer ajustes
- Los property tests validan propiedades universales de corrección del sistema
- Los unit tests validan ejemplos específicos y casos edge
- La implementación es incremental: dominio → aplicación → presentación
- El enfoque de testing dual (unit + property) asegura tanto corrección específica como general
- La arquitectura de 3 capas permite separación clara de responsabilidades y facilita testing
- La persistencia en JSON es simple pero suficiente para el MVP
- La interfaz CLI permite jugar en modo hotseat (mismo dispositivo, turnos alternados)

