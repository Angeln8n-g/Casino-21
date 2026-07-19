-- database-migration-security-cleanup.sql
-- Fase 3: Cierre y Restricción (Revocación de Permisos de RPC en producción)

SET search_path TO public;

-- Revocar privilegios de ejecución a public, anon y authenticated en funciones críticas del sistema

-- 1. process_match_results
REVOKE EXECUTE ON FUNCTION public.process_match_results(TEXT, TEXT, UUID, BOOLEAN, JSONB) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_match_results(TEXT, TEXT, UUID, BOOLEAN, JSONB) TO service_role;

-- 2. update_player_stats
REVOKE EXECUTE ON FUNCTION public.update_player_stats(UUID, BOOLEAN, INTEGER) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_player_stats(UUID, BOOLEAN, INTEGER) TO service_role;

-- 3. award_tournament_prize
REVOKE EXECUTE ON FUNCTION public.award_tournament_prize(UUID, UUID, INTEGER) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_tournament_prize(UUID, UUID, INTEGER) TO service_role;

-- 4. apply_seasonal_elo_reset
REVOKE EXECUTE ON FUNCTION public.apply_seasonal_elo_reset() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_seasonal_elo_reset() TO service_role;

-- 5. add_player_xp
REVOKE EXECUTE ON FUNCTION public.add_player_xp(UUID, INTEGER) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_player_xp(UUID, INTEGER) TO service_role;

-- 6. atomic_charge_coins
REVOKE EXECUTE ON FUNCTION public.atomic_charge_coins(UUID, INTEGER, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_charge_coins(UUID, INTEGER, TEXT, UUID) TO service_role;

-- 7. atomic_refund_coins
REVOKE EXECUTE ON FUNCTION public.atomic_refund_coins(UUID, INTEGER, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_refund_coins(UUID, INTEGER, TEXT) TO service_role;
