

## Dispute & Re-vote System

### Overview
After a verdict is committed, group members can flag it within 12 hours. When flags exceed half the group size, a community re-vote is triggered. Members vote YES/NO, and when a majority is reached, the dispute resolves -- either upholding or overturning the original verdict, with coin redistribution and integrity score changes.

### Database Changes (1 migration)

**New tables:**

1. `dispute_flags` — tracks individual flags (prevents double-flagging)
   - `id UUID PK`
   - `dispute_id UUID FK -> disputes`
   - `user_id UUID FK -> users`  
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `UNIQUE(dispute_id, user_id)`
   - RLS: group members can view; authenticated users can insert (if in group)

2. `dispute_votes` — tracks re-vote ballots
   - `id UUID PK`
   - `dispute_id UUID FK -> disputes`
   - `user_id UUID FK -> users`
   - `vote verdict_outcome (yes/no)`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `UNIQUE(dispute_id, user_id)`
   - RLS: group members can view; authenticated users can insert (if in group)

**Alter `disputes` table:**
- Add `resolved_at TIMESTAMPTZ NULL`
- Add `resolution_verdict verdict_outcome NULL` (the final re-vote result)

**New RPCs (SECURITY DEFINER):**

1. `flag_verdict(_verdict_id, _user_id)`:
   - Validates user is in the group, hasn't already flagged, verdict is committed, within 12h window
   - Upserts dispute row (creates if first flag, increments `flags` count)
   - Inserts `dispute_flags` row
   - Checks if `flags > (group member count / 2)` → if so, sets `disputes.status = 'open'`, sets `markets.status = 'disputed'`, inserts notification to all group members

2. `cast_dispute_vote(_dispute_id, _user_id, _vote)`:
   - Validates user is in group, dispute is open, user hasn't voted
   - Inserts `dispute_votes` row
   - Counts votes; when > 50% of group members have voted with a majority:
     - If majority matches original verdict: set dispute status = `upheld`, judge integrity +5% (capped at 1.0), distribute coins as original
     - If majority differs: set dispute status = `overturned`, update verdict status to `overturned`, judge integrity -15%, reverse and redistribute coins
     - Set market status back to `resolved`
     - Insert resolution notification to all group members

**Enable Supabase Realtime** on `dispute_votes` and `dispute_flags` for live tally updates.

### New Pages & Components

1. **`src/pages/DisputeRevote.tsx`** — `/group/:groupId/dispute/:disputeId`
   - Route added to App.tsx
   - Shows: disputed verdict card (judge name, original YES/NO, integrity score), "What actually happened?" YES/NO buttons, live tally of group member votes (with avatars, names, and vote status), coins locked indicator
   - Uses Supabase realtime subscription on `dispute_votes` for live updates
   - Calls `cast_dispute_vote` RPC on vote

2. **Update `src/pages/Group.tsx` — settled market cards:**
   - For resolved markets with committed verdict within 12h: show "Flag this verdict" button
   - Query `dispute_flags` to show current flag count and whether user already flagged
   - For markets with status `disputed`: show "Disputed" badge and link to re-vote screen
   - Call `flag_verdict` RPC on flag button click

3. **Update `src/components/RevealCeremony.tsx`:**
   - In State 3 (verdict view), add flag section at bottom: judge info card, flag progress bar, "Flag this verdict" button
   - Show "You've flagged this verdict" if user already flagged
   - Show dispute status if threshold reached

### Files to create/modify
- **New migration**: `dispute_flags` table, `dispute_votes` table, alter `disputes`, two RPCs, realtime enablement
- **New file**: `src/pages/DisputeRevote.tsx`
- **Modified**: `src/App.tsx` (add route)
- **Modified**: `src/pages/Group.tsx` (flag button on settled cards, disputed badge, link to re-vote)
- **Modified**: `src/components/RevealCeremony.tsx` (flag section in verdict view)

### UI Design (matching uploaded mockups)
- Settled market card: verdict badge (YES WON / NO WON or Disputed), judge info with integrity score, flag progress bar (`X / Y flags`), "Flag this verdict" / "You've flagged" button
- Re-vote screen: header "Community re-vote triggered", original verdict card with judge name + integrity, YES/NO vote buttons, live member vote tally list (avatar + name + vote/waiting), coins locked banner, "Cast your vote" CTA
- Color scheme: dispute/flag elements use the existing `coin` (amber/orange) color tokens for warnings, `no` (red) for disputed state

