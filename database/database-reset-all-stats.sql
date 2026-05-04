-- ========================================================================================
-- SCRIPT DE REINICIO DE ESTADÍSTICAS Y PROGRESIÓN (HARD RESET)
-- ¡ADVERTENCIA! Este script eliminará todo el progreso, historial, misiones y monedas
-- de TODOS los usuarios. Úsalo solo en entornos de desarrollo o para reiniciar temporadas.
-- ========================================================================================

BEGIN;

-- 1. Limpiar el Historial de Partidas
-- Esto vaciará todas las tarjetas del ProfileHistory
TRUNCATE TABLE public.match_history RESTART IDENTITY CASCADE;

-- 2. Limpiar las Transacciones de la Billetera
-- Borra el registro contable de monedas ganadas/gastadas
TRUNCATE TABLE public.wallet_transactions RESTART IDENTITY CASCADE;

-- 3. Limpiar el Progreso de las Misiones Diarias
-- Permite que los usuarios reciban misiones nuevas desde cero al iniciar sesión
TRUNCATE TABLE public.player_daily_quests RESTART IDENTITY CASCADE;

-- 4. Reiniciar los Perfiles a los valores por defecto de un jugador nuevo
UPDATE public.profiles
SET 
    elo = 10,
    wins = 0,
    losses = 0,
    coins = 0,
    xp = 0,
    level = 1,
    tournaments_won = 0,
    -- (Opcional) Si también deseas quitar los cosméticos equipados, descomenta estas líneas:
    -- equipped_avatar = NULL,
    -- equipped_card_back = NULL,
    -- equipped_title = NULL,
    -- equipped_emotics = NULL,
    updated_at = NOW();

COMMIT;

-- Mensaje de confirmación (solo visible en logs de consola SQL si lo soporta)
DO $$
BEGIN
    RAISE NOTICE 'Estadísticas reiniciadas con éxito para todos los usuarios.';
END $$;
