
-- Tighten disputes INSERT to require the user is in the group
DROP POLICY "Authenticated users can create disputes" ON public.disputes;
CREATE POLICY "Group members can create disputes" ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (
    verdict_id IN (
      SELECT v.id FROM public.verdicts v
      JOIN public.markets m ON m.id = v.market_id
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE gm.user_id = auth.uid()
    )
  );
