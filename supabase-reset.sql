-- ================================================================
-- CASINO 21 — RESET COMPLETO
-- Ejecutar PRIMERO en Supabase SQL Editor antes de la migración
-- ADVERTENCIA: Elimina todos los datos existentes
-- ================================================================

-- Desactivar triggers temporalmente para evitar errores de FK
SET session_replication_role = replica;

-- Eliminar tablas en orden inverso de dependencias
DROP TABLE IF EXISTS rate_limits              CASCADE;
DROP TABLE IF EXISTS temporary_bans           CASCADE;
DROP TABLE IF EXISTS player_blocks            CASCADE;
DROP TABLE IF EXISTS player_reports           CASCADE;
DROP TABLE IF EXISTS notifications            CASCADE;
DROP TABLE IF EXISTS player_titles            CASCADE;
DROP TABLE IF EXISTS player_achievements      CASCADE;
DROP TABLE IF EXISTS achievements             CASCADE;
DROP TABLE IF EXISTS elo_history              CASCADE;
DROP TABLE IF EXISTS game_invitations         CASCADE;
DROP TABLE IF EXISTS friend_requests          CASCADE;
DROP TABLE IF EXISTS friendships              CASCADE;
DROP TABLE IF EXISTS chat_messages            CASCADE;
DROP TABLE IF EXISTS season_rankings          CASCADE;
DROP TABLE IF EXISTS seasons                  CASCADE;
DROP TABLE IF EXISTS tournament_matches       CASCADE;
DROP TABLE IF EXISTS tournament_participants  CASCADE;
DROP TABLE IF EXISTS tournaments              CASCADE;
DROP TABLE IF EXISTS matches                  CASCADE;
DROP TABLE IF EXISTS titles                   CASCADE;
DROP TABLE IF EXISTS profiles                 CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.handle_new_user()          CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()                  CASCADE;
DROP FUNCTION IF EXISTS get_player_division(INTEGER)      CASCADE;
DROP FUNCTION IF EXISTS calculate_level_from_xp(INTEGER)  CASCADE;
DROP FUNCTION IF EXISTS add_player_xp(UUID, INTEGER)      CASCADE;
DROP FUNCTION IF EXISTS update_player_stats(UUID, BOOLEAN, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS apply_seasonal_elo_reset()        CASCADE;

-- Restaurar modo normal
SET session_replication_role = DEFAULT;
