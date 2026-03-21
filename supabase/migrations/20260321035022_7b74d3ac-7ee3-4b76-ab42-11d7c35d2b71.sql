
DROP POLICY "Group members can create roasts" ON public.roasts;

CREATE POLICY "Group members can create roasts"
ON public.roasts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = from_user
  AND group_id IN (
    SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
  )
);
