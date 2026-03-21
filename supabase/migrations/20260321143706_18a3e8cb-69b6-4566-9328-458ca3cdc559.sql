
-- Step 1: Create SECURITY DEFINER function to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.user_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id;
$$;

-- Step 2: Fix group_members SELECT policy
DROP POLICY "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (group_id IN (SELECT public.user_group_ids(auth.uid())));

-- Step 3: Fix groups SELECT policy
DROP POLICY "Members can view their groups" ON public.groups;
CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_group_ids(auth.uid())) OR is_public = true);

-- Step 4: Fix markets SELECT policy (add public markets support)
DROP POLICY "Group members can view markets" ON public.markets;
CREATE POLICY "Group members can view markets" ON public.markets
  FOR SELECT TO authenticated
  USING (is_public = true OR group_id IN (SELECT public.user_group_ids(auth.uid())));

-- Step 5: Fix markets INSERT policy
DROP POLICY "Group members can create markets" ON public.markets;
CREATE POLICY "Group members can create markets" ON public.markets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND group_id IN (SELECT public.user_group_ids(auth.uid())));

-- Step 6: Fix bets SELECT policy
DROP POLICY "Users can view bets in their groups" ON public.bets;
CREATE POLICY "Users can view bets in their groups" ON public.bets
  FOR SELECT TO authenticated
  USING (market_id IN (
    SELECT id FROM public.markets
    WHERE is_public = true OR group_id IN (SELECT public.user_group_ids(auth.uid()))
  ));

-- Step 7: Fix roasts policies
DROP POLICY "Group members can view roasts" ON public.roasts;
CREATE POLICY "Group members can view roasts" ON public.roasts
  FOR SELECT TO authenticated
  USING (group_id IN (SELECT public.user_group_ids(auth.uid())));

DROP POLICY "Group members can create roasts" ON public.roasts;
CREATE POLICY "Group members can create roasts" ON public.roasts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND group_id IN (SELECT public.user_group_ids(auth.uid())));

-- Step 8: Fix verdicts SELECT policy
DROP POLICY "Group members can view verdicts" ON public.verdicts;
CREATE POLICY "Group members can view verdicts" ON public.verdicts
  FOR SELECT TO authenticated
  USING (market_id IN (
    SELECT id FROM public.markets
    WHERE group_id IN (SELECT public.user_group_ids(auth.uid()))
  ));

-- Step 9: Fix disputes policies
DROP POLICY "Group members can view disputes" ON public.disputes;
CREATE POLICY "Group members can view disputes" ON public.disputes
  FOR SELECT TO authenticated
  USING (verdict_id IN (
    SELECT v.id FROM public.verdicts v
    JOIN public.markets m ON m.id = v.market_id
    WHERE m.group_id IN (SELECT public.user_group_ids(auth.uid()))
  ));

DROP POLICY "Group members can create disputes" ON public.disputes;
CREATE POLICY "Group members can create disputes" ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (verdict_id IN (
    SELECT v.id FROM public.verdicts v
    JOIN public.markets m ON m.id = v.market_id
    WHERE m.group_id IN (SELECT public.user_group_ids(auth.uid()))
  ));
