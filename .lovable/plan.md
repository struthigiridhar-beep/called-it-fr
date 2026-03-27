

## Enhanced Leaderboard with Crew Roles and Dispute Card

### Overview
Rebuild the Board tab to match the reference screenshots: rich member rows with crew role badges, streak indicators, accuracy stats, expandable streak history, "most overconfident" tag, active dispute card, and a crew roles explainer accordion.

### 1. Edge Function: `recompute-crew-roles`

**New file**: `supabase/functions/recompute-crew-roles/index.ts`

Accepts `{ group_id }` (or runs for all groups if none provided). Uses service role key. For each group:

1. Fetch all `group_members` with their `user_id`, `judge_integrity`
2. For each member, compute:
   - **Prophetic** (🔮): Query `bets` joined with `verdicts` (committed) — accuracy = wins/total. Min 5 settled bets.
   - **Wildcard** (🎲): For each bet, check if the member bet against the majority odds (>70% pool on other side). Highest % of such bets.
   - **HypedUp** (🔥): Count `reactions` where `user_id` = member and `target_type` = 'event' for events in this group.
   - **Judge** (⚖️): Highest `judge_integrity` with min 2 judge assignments (count from `verdicts`).
   - **Creator** (🏗️): Count `markets` where `created_by` = member and `group_id` = group.
3. Assign roles greedily: rank all candidates per role, assign best-fit member to each role (no duplicates). Update `group_members.crew_role`.

### 2. Trigger recompute from existing flows

- In `assign-judge/index.ts`: after assigning judge (verdict committed path), call `recompute-crew-roles` via fetch for that group.
- Client-side: after creating a market, invoke `recompute-crew-roles` for the group.
- Cron: add daily cron job calling the function for all groups.

### 3. Hook: `useGroupLeaderboard` updates

Add to the query:
- `crew_role` from `group_members`
- Compute **accuracy** per member: fetch all bets for group markets, join with committed verdicts, calculate win%.
- Compute **bet count** per member
- Compute **"most overconfident"**: member with most coins bet on losing side across resolved markets
- Return all in `LeaderboardEntry`

### 4. Board Tab UI rebuild (`Group.tsx` board section)

**Header**: "Week [N]" (compute week number from ISO week) + "XP standings · [Group Name]"

**Each row** (replace current simple rows):
- Rank number — gold color (`text-coin`) for #1, muted for rest
- Avatar circle with initials
- Name + "(you)" if current user
- Crew role pill next to name: colored per role (purple/amber/red/green/blue)
- 🔥 streak badge if streak > 1 (e.g., "🔥 5")
- Accuracy % as subtitle (e.g., "74% accuracy")
- XP right-aligned, monospace
- "Most overconfident" amber pill on qualifying member
- Tap to expand: show streak history as small pills (gold for active/peak, muted for broken)

**Dispute card** at bottom (if active dispute exists for this group):
- Red dot + "Verdict disputed" header
- Market question + judge name
- Flag progress bar (X / threshold flags)
- "Coins locked: X c · released on resolution"
- Countdown timer

**Crew roles info card**: Collapsible accordion at very bottom, "Crew roles · what do they mean?" — lists all 5 roles with emoji and description in muted text.

### 5. No database migration needed
`crew_role` column already exists on `group_members`. The edge function writes to it with service role key.

### Files Modified/Created
- `supabase/functions/recompute-crew-roles/index.ts` — new edge function
- `supabase/functions/assign-judge/index.ts` — add recompute trigger call
- `src/hooks/useGroupLeaderboard.ts` — add crew_role, accuracy, bet counts, overconfident detection
- `src/pages/Group.tsx` — rebuild board tab section with all UI elements
- Cron job SQL (via Supabase SQL editor, not migration)

