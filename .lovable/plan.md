

## Judge Assignment & Verdict Screen

### Overview
When a market deadline passes, automatically assign a judge (group member who didn't bet, or smallest stake). Build a full judge verdict screen matching the design screens.

### Database Changes

**1. Alter `verdicts` table** — add `status` column:
```sql
ALTER TABLE public.verdicts ADD COLUMN status text NOT NULL DEFAULT 'pending';
-- Update RLS: allow judge to update their own verdict
CREATE POLICY "Judge can update verdict" ON public.verdicts
  FOR UPDATE TO authenticated USING (auth.uid() = judge_id);
```

**2. Alter `markets` table** — update status to `closed` needs to be allowed by the edge function (service role).

### Edge Function: `assign-judge`

**`supabase/functions/assign-judge/index.ts`** — called via cron or manually:
1. Query markets where `deadline < now()` AND `status = 'open'`
2. For each, set `status = 'closed'`
3. Find group members who did NOT bet on this market (exclude `created_by`). If all bet, pick the one with smallest total stake.
4. Insert verdict row: `{ judge_id, market_id, verdict: 'yes' (placeholder — won't matter since status=pending), status: 'pending' }`
5. Insert notification: `{ user_id: judge_id, type: 'judge_assigned', payload: { market_id, group_id, question } }`

Uses service role key to bypass RLS.

### Frontend Changes

**1. New route** — `src/App.tsx`: add `/group/:groupId/judge/:marketId`

**2. New page** — `src/pages/JudgeVerdict.tsx`:
- Fetch market data, verdict row, bets aggregate (count per side), user's own bet on this market
- Header: back button, "Judge assignment", group name, time remaining, integrity score pill
- "RANDOMLY ASSIGNED" badge + stake status ("you didn't bet" or "smallest stake")
- Market card: "MARKET CLOSED · AWAITING VERDICT", question, YES/NO percentages with bettor counts, odds bar
- Conflict status: green "No conflict" if user didn't bet, amber "Conflict noted" if user has a stake (with frozen notice)
- YES / NO verdict buttons with contextual labels (from market question)
- Confirm button: "Commit: YES — ..." / disabled until selection made
- "HOW JUDGING WORKS" section with 3 numbered rules
- On commit: update verdict `status='committed'`, `verdict=selected`, `committed_at=now()`, then show committed view

**3. Committed view** (same page, state change):
- "YOUR VERDICT" card with large YES/NO text
- Judge name + integrity score
- 12h flag window info: flags so far, stake status, integrity on the line
- "Share your verdict card" + "Back to markets" buttons

**4. Update `src/pages/Group.tsx`** — judge banner:
- Make the existing judge banner clickable, navigating to `/group/${groupId}/judge/${marketId}`
- Add "Commit verdict →" button text

### Cron Setup
Schedule the edge function to run every 5 minutes via `pg_cron` + `pg_net` to auto-close expired markets and assign judges.

### Files
- `supabase/migrations/` — add `status` to verdicts, update RLS
- `supabase/functions/assign-judge/index.ts` — edge function
- `src/pages/JudgeVerdict.tsx` — new judge screen
- `src/App.tsx` — add route
- `src/pages/Group.tsx` — make judge banner link to verdict page

