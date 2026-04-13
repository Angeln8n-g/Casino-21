# PRD - Fase 4: Sistema de Economía y Recompensas (Wallet)

## 1. Visión y Objetivos
Basándonos en la Fase 3 (Control Administrativo del Torneo), la **Fase 4** introduce el núcleo económico de Casino 21: el **Sistema Wallet y Recompensas Reales**. El objetivo es incentivar la competencia mediante un ciclo de riesgo y recompensa (pagar entrada, ganar premios), sentando las bases para una futura tienda in-game.

## 2. Alcance (Fase 4)
Esta fase modifica la tabla `profiles` para soportar monedas y establece flujos transaccionales seguros:

### 2.1 Economía Base (Monedas)
- **Monedas de Usuario (Coins)**: Adición de la columna `coins` (moneda virtual) al modelo de datos de cada jugador.
- **Bono de Bienvenida/Diario (Opcional)**: Proveer una cantidad inicial para nuevos jugadores y mecanismos básicos para evitar que queden en 0.

### 2.2 Flujo de Inscripción (Riesgo)
- **Deducción de Entrada**: Al intentar inscribirse a un torneo desde la interfaz de eventos, el sistema debe:
  - Verificar si el jugador tiene saldo suficiente (`coins >= event.entry_fee`).
  - Deducir automáticamente las monedas.
  - Cancelar y alertar ("Saldo Insuficiente") en caso negativo.

### 2.3 Flujo de Recompensa (Beneficio)
- **Cálculo de Recompensa Automático**: Al finalizar el último encuentro (Ronda Final) y definir al campeón de todo el torneo, el sistema debe inyectar las monedas prometidas en `prize_pool` al saldo del ganador.
- **Registro Histórico (Opcional pero Recomendado)**: Crear una tabla sencilla `transaction_logs` o similar, o simplemente depender de la actualización atómica del saldo, para auditar los cambios de dinero.
- **Notificación de Recompensa**: Una alerta especial ("¡Ganaste el Torneo y X monedas!") en la UI del jugador.

## 3. Especificaciones Visuales (Frontend)
- **Indicador de Saldo (Wallet UI)**: Añadir en el Navbar Superior (junto al perfil) y en el Menú Móvil un contador brillante de 🪙 Monedas.
- **Modal de Inscripción**: En la ventana de "Entrar Ahora", mostrar explícitamente el costo de inscripción en rojo o dorado y el saldo actual antes de confirmar.
- **Alertas de Transacción**: Un "Toast" verde cuando se recibe dinero, y rojo si no hay fondos.

## 4. Cambios en el Modelo de Datos (Backend)

```sql
-- TABLA: profiles (Actualización)
ALTER TABLE public.profiles ADD COLUMN coins INTEGER NOT NULL DEFAULT 1000; -- Saldo inicial de prueba

-- TABLA: transactions (Opcional pero recomendada para evitar hacks)
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.profiles(id),
  amount INTEGER NOT NULL, -- Positivo (Ingreso) o Negativo (Gasto)
  reason TEXT NOT NULL, -- 'tournament_entry', 'tournament_prize', 'daily_bonus'
  reference_id UUID, -- Ej: ID del Evento
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 5. Flujos Transaccionales Seguros (RPC)
Es **altamente crítico** no permitir que el cliente modifique su propio saldo con un simple `UPDATE`. Se debe utilizar **Funciones RPC (Remote Procedure Calls) en PostgreSQL** para transacciones atómicas.

```sql
-- Ejemplo de RPC para inscripción segura
CREATE OR REPLACE FUNCTION join_event(event_id_param UUID, player_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_fee INTEGER;
  v_coins INTEGER;
BEGIN
  -- 1. Obtener costo
  SELECT entry_fee INTO v_fee FROM events WHERE id = event_id_param;
  -- 2. Obtener saldo actual
  SELECT coins INTO v_coins FROM profiles WHERE id = player_id_param;
  -- 3. Validar
  IF v_coins < v_fee THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;
  
  -- 4. Deducir saldo
  UPDATE profiles SET coins = coins - v_fee WHERE id = player_id_param;
  
  -- 5. Inscribir
  INSERT INTO event_entries (event_id, player_id) VALUES (event_id_param, player_id_param);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. Siguientes Pasos (Roadmap Fase 4)
1. **Paso 4.1**: Scripts SQL para actualizar `profiles`, crear transacciones y funciones RPC atómicas.
2. **Paso 4.2**: Implementar visualización de Wallet (Saldo) en Navbar y Perfil.
3. **Paso 4.3**: Integrar llamada RPC de inscripción en `EventsPage.tsx` (reemplazando el `insert` simple).
4. **Paso 4.4**: Implementar lógica de entrega de premios al ganar la Final del torneo en `index.ts` (Backend Socket).
