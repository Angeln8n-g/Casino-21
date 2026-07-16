-- ============================================================
-- Migration: Allow users to update game invitations status (Accept/Reject/Cancel)
-- ============================================================

-- Create policy to allow sender (cancel) or receiver (accept/reject) to update status
DROP POLICY IF EXISTS "gi_update" ON public.game_invitations;
CREATE POLICY "gi_update" ON public.game_invitations
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Ensure authenticated users have update permission on the table
GRANT UPDATE ON TABLE public.game_invitations TO authenticated;
