

## Group Feed — Rich Event Rendering + Live Reactions

### Current State
- `useGroupFeed` fetches from `events` table with realtime subscription — good foundation
- `events` table has `event_type`, `payload` (jsonb), `user_id`, `group_id`, `created_at`
- `reactions` table exists with `target_id`, `target_type`, `emoji`, `user_id` — already has RLS for insert/select/delete
- Feed tab in Group.tsx currently renders raw JSON payload — needs full redesign
- `ReactionPills.tsx` exists but uses hardcoded data — needs to be wired to Supabase

### Approach

The feed doesn't need to query multiple tables. The `events` table already stores denormalized data in `payload`. We render each `event_type` with a distinct card layout. Reactions are fetched per-group-feed and matched by `target_id = event.id`.

### Hook Changes

**Update `src/hooks/useGroupFeed.ts`:**
- Add a second query fetching all `reactions` where `target_type = 'event'` and `target_id` is in the fetched event IDs
- Add realtime subscription on `reactions` table too (for live counts)
- Fetch `users` for the group (name, avatar_color) to resolve user_ids in events
- Return `{ events, reactions, users, loading }`

### New Component: `src/components/FeedCard.tsx`

Renders a single feed event based on `event_type`. Each type gets a distinct layout:

| event_type | Layout |
|---|---|
| `bet_placed` | Avatar + "[Name] placed a bet" + YES/NO pill with amount + market question |
| `coins_sent` | Avatar + "[Name] sent coins to [Name]" + transfer row (from→to avatars, amount, italic message) |
| `roast_sent` | Avatar + "[From] roasted [To]" + dark bubble with italic roast text + "replied ↗" link |
| `market_created` | "NEW MARKET" label in yes color + embedded market card with YES/NO buttons |
| `streak_milestone` | Avatar + "[Name] hit a win streak" + gold streak card (5× Win streak / highest in group) |
| `market_settled` | Green checkmark avatar + "Market settled" in yes color + verdict + payout rows per user |
| `coins_reset` | Full-width subtle row with coin icon + "New week · everyone starts with 500 c" in muted text |

### New Component: `src/components/FeedReactions.tsx`

Replaces the hardcoded `ReactionPills.tsx` with a live version:
- Props: `eventId`, `groupId`, `reactions` (filtered for this event), `userId`
- Aggregates reactions by emoji, shows count + toggleable pill
- "+ react" button opens a small picker popover with 😂🔥👀💀👎
- Toggle inserts/deletes `reactions` row via Supabase client
- Realtime updates handled by parent hook invalidation

### Update `src/pages/Group.tsx` — Feed tab section (lines 490-504)

Replace the raw JSON dump with:
- Date separators (TODAY, YESTERDAY, older dates)
- `FeedCard` for each event with `FeedReactions` below
- Compose bar pinned at bottom: text input placeholder "New market or roast." + "+ Market" button that opens CreateMarketSheet

### Files

**Modified:**
- `src/hooks/useGroupFeed.ts` — add reactions query, users lookup, reactions realtime channel
- `src/pages/Group.tsx` — replace feed tab with rich rendering + compose bar

**Created:**
- `src/components/FeedCard.tsx` — event type renderer
- `src/components/FeedReactions.tsx` — live reaction pills wired to Supabase

No database changes needed — `events` and `reactions` tables already exist with correct schema and RLS.

