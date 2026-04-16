# PRD - Fase 5.1: Gestión de Misiones desde Admin + ELO por Dificultad

## 1. Visión y Objetivos
Extender la Fase 5 para que el equipo admin pueda crear, editar, activar/desactivar y balancear misiones diarias sin depender de cambios de código, añadiendo además una recompensa de ELO según dificultad para reforzar progresión competitiva.

Objetivos de negocio:
- Mejorar retención diaria con contenido ajustable en tiempo real.
- Dar herramientas de LiveOps al equipo admin.
- Alinear recompensas de misiones con progresión competitiva (ELO).

## 2. Alcance de la Fase 5.1
Incluye:
- CRUD de misiones en panel admin.
- Sistema de dificultad (`easy`, `medium`, `hard`, `elite`) por misión.
- Recompensa `reward_elo` definida por dificultad con override opcional.
- Validaciones de balance para evitar misiones rotas o abusables.
- Auditoría básica de cambios administrativos.

No incluye:
- Motor avanzado de experimentos A/B.
- Personalización por segmento de usuarios.

## 3. Requerimientos Funcionales

### 3.1 Gestión Admin de Misiones
- El admin puede:
  - Crear misión nueva.
  - Editar misión existente.
  - Activar/desactivar misión (`is_active`).
  - Duplicar misión para iteración rápida.
- Campos mínimos:
  - `code`, `title`, `description`, `quest_type`, `target_amount`.
  - `difficulty`, `reward_coins`, `reward_xp`, `reward_elo`.
  - `is_active`.

### 3.2 Dificultad y ELO
- Cada misión tendrá `difficulty`.
- Cada dificultad tendrá una recomendación de ELO base:
  - `easy`: +1
  - `medium`: +3
  - `hard`: +6
  - `elite`: +10
- `reward_elo` puede:
  - Tomar automáticamente el valor sugerido por dificultad.
  - Sobrescribirse manualmente por admin (con límites).

### 3.3 Reclamo de Recompensa
- `claim_quest_reward` ahora entrega:
  - Monedas.
  - XP.
  - ELO.
- Debe seguir siendo transaccional y atómico.

### 3.4 Seguridad y Permisos
- Solo admins pueden mutar catálogo de misiones.
- Jugadores solo pueden leer catálogo activo y sus propias misiones asignadas.
- Registrar quién cambió qué (auditoría mínima).

## 4. Modelo de Datos (Cambios SQL)

### 4.1 Cambios en `quest_catalog`
- Agregar columnas:
  - `difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','elite'))`
  - `reward_elo INTEGER NOT NULL DEFAULT 0`
  - `created_by UUID NULL REFERENCES public.profiles(id)`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### 4.2 Auditoría sugerida
- Tabla nueva `quest_catalog_audit`:
  - `id`, `quest_id`, `action`, `before_data`, `after_data`, `changed_by`, `changed_at`.

### 4.3 Índices recomendados
- `quest_catalog(is_active, difficulty, quest_type)`.
- `player_daily_quests(player_id, assigned_date, is_completed, is_claimed)`.

## 5. RPC y Lógica Backend

### 5.1 RPC nuevas para Admin
- `admin_create_quest(...)`
- `admin_update_quest(...)`
- `admin_toggle_quest(quest_id, is_active)`
- `admin_delete_quest(quest_id)` opcional, mejor soft delete.

Reglas:
- Validar rol admin en cada RPC.
- Validar límites:
  - `target_amount > 0`
  - `reward_coins >= 0`
  - `reward_xp >= 0`
  - `reward_elo` entre `0` y `20` (configurable).

### 5.2 RPC existente a actualizar
- `claim_quest_reward(player_quest_id UUID)`:
  - Incluir suma de `reward_elo` al perfil.
  - Mantener transacción única.

### 5.3 Backend Node.js
- Al finalizar partida:
  - Mantener incremento de progreso.
  - No entregar ELO aquí; ELO de misión se entrega solo al reclamar.

## 6. Frontend Admin (Panel)

### 6.1 Nueva sección en AdminPanel
- Pestaña: `Quest Manager`.
- Tabla con filtros:
  - `difficulty`, `quest_type`, `is_active`.
- Acciones:
  - Crear, editar, activar/desactivar, duplicar.

### 6.2 Formulario de misión
- Inputs:
  - Texto: `code`, `title`, `description`.
  - Select: `quest_type`, `difficulty`.
  - Numéricos: `target_amount`, `reward_coins`, `reward_xp`, `reward_elo`.
- UX:
  - Al cambiar dificultad, autocompletar `reward_elo` sugerido.
  - Permitir override manual con aviso de límites.

## 7. UX Jugador (Ajustes)
- En `DailyQuests.tsx` mostrar badge de dificultad.
- Mostrar recompensas con bloque:
  - `🪙`, `XP`, `ELO`.
- Mantener CTA de `Reclamar`.

## 8. Pasos de Implementación (Fase 5.1)

1. Diseñar migración SQL 5.1 con columnas nuevas + checks + índices.
2. Crear tabla de auditoría y trigger de `updated_at`.
3. Actualizar RPC `claim_quest_reward` para incluir `reward_elo`.
4. Implementar RPC admin de CRUD con validación de rol.
5. Aplicar políticas RLS para separación admin/jugador.
6. Crear `QuestManager` en panel admin con listado y filtros.
7. Construir modal/form de alta/edición de misiones.
8. Integrar acciones de activar/desactivar y duplicar.
9. Ajustar `DailyQuests.tsx` para mostrar dificultad y ELO.
10. Ejecutar seed inicial con variedad de dificultades.
11. Validar en entorno staging con casos de fraude y concurrencia.
12. Publicar con feature flag y monitorear métricas de reclamo.

## 9. Criterios de Aceptación
- Admin puede crear y editar misiones sin tocar código.
- Misión con dificultad se refleja correctamente en UI.
- Recompensa de ELO se acredita al reclamar, no antes.
- No hay escalación de permisos para usuarios no admin.
- Auditoría registra cambios de catálogo.

## 10. Riesgos y Mitigación
- Riesgo: inflación de ELO por mal balance.
  - Mitigación: límites por RPC + revisión semanal de configuración.
- Riesgo: abuso de reclamo concurrente.
  - Mitigación: transacción y condición `is_claimed = FALSE`.
- Riesgo: errores humanos en LiveOps.
  - Mitigación: auditoría + desactivar en lugar de borrar.
