-- ══════════════════════════════════════════════════════════════════════════════
-- Migración: Función de baja definitiva de usuario (GDPR / Derecho al Olvido)
-- Permite a un jugador autenticado darse de baja eliminando su cuenta y datos
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actualmente autenticado
  target_user_id := auth.uid();
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 1. Desvincular de tournament_matches (campos nullable)
  UPDATE public.tournament_matches 
  SET player1_id = NULL 
  WHERE player1_id = target_user_id;

  UPDATE public.tournament_matches 
  SET player2_id = NULL 
  WHERE player2_id = target_user_id;

  UPDATE public.tournament_matches 
  SET winner_id = NULL 
  WHERE winner_id = target_user_id;

  UPDATE public.tournament_matches 
  SET waiting_player_id = NULL 
  WHERE waiting_player_id = target_user_id;

  -- 2. Desvincular de match_history (campo nullable)
  UPDATE public.match_history 
  SET winner_id = NULL 
  WHERE winner_id = target_user_id;

  -- 3. Eliminar partidas 1v1 donde participaba (matches)
  DELETE FROM public.matches 
  WHERE player1_id = target_user_id OR player2_id = target_user_id;

  -- 4. Desvincular de referencias administrativas/auditoría
  UPDATE public.quest_catalog SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.quest_catalog_audit SET changed_by = NULL WHERE changed_by = target_user_id;
  UPDATE public.championship_admin_audit_log SET target_user_id = NULL WHERE target_user_id = target_user_id;
  UPDATE public.championship_admin_audit_log SET admin_user_id = NULL WHERE admin_user_id = target_user_id;
  UPDATE public.championship_participants SET kyc_reviewer_id = NULL WHERE kyc_reviewer_id = target_user_id;

  -- 5. Eliminar perfil de jugador (activa CASCADE en amistades, inventario, quests, elo_history, etc.)
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 6. Eliminar usuario de Supabase Auth (borra credenciales, tokens y cuenta base)
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- Restricción de permisos: solo usuarios autenticados pueden invocar su propia baja
REVOKE ALL ON FUNCTION public.delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
