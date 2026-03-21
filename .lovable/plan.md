

## Fix Infinite Recursion in RLS Policies

### Root Cause
The `group_members` table has a SELECT policy for authenticated users that references itself:
```sql
group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid())
```
This causes **infinite recursion** (error `42P17`), which cascades to every other table whose RLS policies reference `group_members` (markets, bets, roasts, verdicts, disputes).

### Fix — 2 Steps

**Step 1: Create a SECURITY DEFINER function** to check group membership without triggering RLS:

```sql
CREATE OR REPLACE FUNCTION public.user_group_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id;
$$;
```

**Step 2: Replace all self-referencing policies** that query `group_members` in their USING/WITH CHECK expressions. Replace the subquery `(SELECT group_id FROM group_members WHERE user_id = auth.uid())` with `public.user_group_ids(auth.uid())` everywhere:

Tables affected:
- **group_members** — "Members can view group members" SELECT → `group_id IN (SELECT public.user_group_ids(auth.uid()))`
- **groups** — "Members can view their groups" SELECT → use `user_group_ids`
- **markets** — "Group members can view markets" SELECT → use `user_group_ids` AND add `OR is_public = true`
- **markets** — "Group members can create markets" INSERT → use `user_group_ids`
- **bets** — "Users can view bets in their groups" SELECT → use `user_group_ids`
- **roasts** — both SELECT and INSERT policies → use `user_group_ids`
- **verdicts** — SELECT policy → use `user_group_ids`
- **disputes** — both SELECT and INSERT policies → use `user_group_ids`

This also fixes the public markets issue: the markets SELECT policy will become `is_public = true OR group_id IN (SELECT public.user_group_ids(auth.uid()))`.

### No code changes needed
The frontend queries are correct. Once RLS stops returning 500 errors, everything will work.

