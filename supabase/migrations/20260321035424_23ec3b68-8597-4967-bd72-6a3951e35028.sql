
-- Add is_public and is_pinned columns to markets
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Allow anon users to view public markets (cold landing page)
CREATE POLICY "Anon can view public markets"
ON public.markets FOR SELECT TO anon
USING (is_public = true);

-- Allow anon users to view groups (join page preview)
CREATE POLICY "Anon can view groups"
ON public.groups FOR SELECT TO anon
USING (true);

-- Allow anon users to view group members (join page member count/avatars)
CREATE POLICY "Anon can view group members"
ON public.group_members FOR SELECT TO anon
USING (true);

-- Allow anon users to view user profiles (names/avatars for join page)
CREATE POLICY "Anon can view users"
ON public.users FOR SELECT TO anon
USING (true);

-- Allow anon users to view invites (join page invite lookup)
CREATE POLICY "Anon can view invites"
ON public.invites FOR SELECT TO anon
USING (true);
