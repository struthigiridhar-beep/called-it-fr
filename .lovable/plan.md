

## Fix: Market not transitioning to "resolved" after verdict

### Root Cause
The markets table RLS policy only allows `creator` to update: `auth.uid() = created_by`. When the **judge** (who is not the creator) commits a verdict and tries to set `status = 'resolved'`, the update silently fails. The market stays `closed` forever.

### Plan

#### 1. Create a `resolve_market` database function (SECURITY DEFINER)
A server-side function that:
- Takes `_market_id` and `_judge_id` as params
- Verifies there's a committed verdict for this market by this judge
- Updates `markets.status` to `'resolved'`
- Bypasses RLS safely since it validates the judge relationship

```sql
CREATE OR REPLACE FUNCTION public.resolve_market(_market_id uuid, _judge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only resolve if this judge has a committed verdict for this market
  IF EXISTS (
    SELECT 1 FROM verdicts
    WHERE market_id = _market_id
      AND judge_id = _judge_id
      AND status = 'committed'
  ) THEN
    UPDATE markets SET status = 'resolved' WHERE id = _market_id;
  ELSE
    RAISE EXCEPTION 'No committed verdict found for this judge and market';
  END IF;
END;
$$;
```

#### 2. Update `JudgeVerdict.tsx` — use RPC instead of direct update
Replace the client-side `supabase.from("markets").update(...)` with `supabase.rpc("resolve_market", { _market_id: market.id, _judge_id: uid })`.

#### 3. Update `JudgeVerdict.tsx` — committed view improvements
- Change "Share your verdict card" button text to "View verdict"
- After ceremony close, auto-navigate back to group page

#### 4. Update `Group.tsx` — handle verdict-aware CTA
The current logic `isClosed && !isResolved` with `pendingVerdicts` check is correct once the market properly transitions to resolved. No additional changes needed here since the RPC fix will make the market go to `resolved` immediately.

### Files Modified
- **Migration**: Create `resolve_market` RPC function
- `src/pages/JudgeVerdict.tsx` — Use RPC for market resolution; fix committed view copy; auto-navigate on ceremony close

