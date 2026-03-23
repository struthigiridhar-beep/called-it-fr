

## Fix: Split-brain market state + verdict-aware UI

### Problem
"Will it rain tomorrow?" has `verdict_status = committed` but `market_status = closed`. The `resolve_market` RPC exists but was never called for this market (the code change to call it was added after this verdict was already committed). Result: no "Pass verdict" (verdict isn't pending), no "View result" (market isn't resolved), just a useless "Reveal →".

### Plan

#### 1. Fix the existing stuck market via migration
Run a one-time migration to resolve any markets that have committed verdicts but are still closed:
```sql
UPDATE markets SET status = 'resolved'
WHERE status = 'closed'
  AND id IN (SELECT market_id FROM verdicts WHERE status = 'committed');
```

#### 2. Make Group.tsx CTA logic verdict-aware (defensive)
Currently line 398-426 only checks `pendingVerdicts` (pending status) and falls through to a generic "Reveal →" for everything else closed. Add a check: if a committed verdict exists for the market, show "View result" even if market status is still `closed` (defensive against future split-brain).

In `renderMarketCard`, after the `isClosed && !isResolved` block:
- Query all verdicts for group markets (not just pending ones) — add a `committedVerdicts` lookup
- If market is closed AND has a committed verdict → show "View result" button (same as resolved)
- If market is closed AND has a pending verdict assigned to user → show "Pass verdict" + "Reveal →"
- If market is closed AND no verdict → show "Reveal →"

#### 3. Files modified
- **Migration**: Fix stuck data + prevent future occurrences
- **`src/pages/Group.tsx`**: Add `committedVerdicts` query; update CTA logic to handle committed-but-not-resolved state

