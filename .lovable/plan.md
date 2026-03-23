

## Diagnosis

### Why the judge wasn't assigned "the minute" the market closed
The `assign-judge` edge function runs on a **cron schedule** (every ~5 minutes). It polls for markets with `status = 'open'` past their deadline, closes them, and assigns a judge. There is no database trigger that fires instantly on deadline expiry. So there's always a delay of up to 5 minutes. In this case, the edge function DID eventually run and assign you — but the status it wrote was `'pending'` in its JS code, which Supabase stored correctly as lowercase `pending`.

### Why "Pass verdict" still doesn't show
The gym market (`4f97de1b`) has **two verdict rows** — a duplicate:
1. `a67334f2` — status: `PENDING` (uppercase, from the original edge function run or manual insert)
2. `750fb77b` — status: `pending` (lowercase, the one you manually added)

The UI query for `pendingVerdicts` filters `.eq("status", "pending")` and finds row #2, then cross-references with markets `.eq("status", "closed")`. This should work. **However**, the `hasCommittedVerdict` check runs FIRST (line 400), and `marketVerdicts` fetches ALL verdicts for closed markets. Neither duplicate has status `committed`, so that check passes correctly.

The likely remaining issue: the `pendingVerdicts` query returns market rows with `id = market.id`. The banner check `pendingVerdicts[0]?.id` and the CTA check `pendingVerdicts.some((v) => v.id === m.id)` should match. **But the assign-judge edge function also checks for existing verdicts before inserting** — it checks `SELECT id FROM verdicts WHERE market_id = X LIMIT 1`. The original PENDING row existed, so the cron would have skipped creating a second one. The second `pending` row was likely your manual insert. The UI should actually work now — this may just need a page refresh.

**BUT** — the real systemic issues are:
1. No uniqueness constraint on `(market_id)` for verdicts — allows duplicates
2. Verdict status is free-text, not an enum — allows casing bugs
3. The edge function inserts `status: "pending"` but there's no guarantee other paths won't use different casing

### Plan

#### 1. Database cleanup migration
- Delete the duplicate PENDING (uppercase) verdict row
- Normalize all verdict statuses to lowercase
- Add a CHECK constraint on `verdicts.status` to only allow `pending`, `committed`, `overturned`
- Add a UNIQUE constraint on `verdicts(market_id)` to prevent duplicate judge assignments
- Also fix any closed markets with committed verdicts (backfill to resolved)

```sql
-- Remove the uppercase duplicate
DELETE FROM verdicts WHERE id = 'a67334f2-94eb-4cbe-b2a4-72e1cfc14857';

-- Normalize all statuses to lowercase
UPDATE verdicts SET status = lower(status) WHERE status != lower(status);

-- Prevent future casing issues
ALTER TABLE verdicts ADD CONSTRAINT verdicts_status_check
  CHECK (status IN ('pending', 'committed', 'overturned'));

-- Prevent duplicate judge assignments per market
ALTER TABLE verdicts ADD CONSTRAINT verdicts_market_id_unique UNIQUE (market_id);

-- Backfill: resolve any closed markets with committed verdicts
UPDATE markets SET status = 'resolved'
WHERE status = 'closed'
  AND id IN (SELECT market_id FROM verdicts WHERE status = 'committed');
```

#### 2. Sort markets: open first, closed/resolved at bottom
In `Group.tsx`:
- **Group markets**: Sort open markets first, then closed/resolved at the bottom, each sub-sorted by `created_at` desc
- **Public markets**: Remove the `.eq("status", "open")` filter so closed public markets are included; apply the same status-aware sort (open on top, closed at bottom)

```text
Sort order within each section:
  1. open (newest first)
  2. closed (newest first)  
  3. resolved (newest first)
```

#### 3. Files modified
- **Migration**: Clean duplicates, add constraints, normalize data
- **`src/pages/Group.tsx`**: Status-aware sorting for both group and public market lists; remove `status=open` filter from public markets query

