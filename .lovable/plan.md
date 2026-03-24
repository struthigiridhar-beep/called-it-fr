

## Custom Hooks Refactor

### Current State
- **Group.tsx** (760 lines) contains ~10 inline `useQuery` calls for markets, bets, verdicts, disputes, flags, membership, etc.
- **JudgeVerdict.tsx** has 6 inline queries (market, group, verdict, bets, membership, judge user)
- **Profile.tsx** has 3 inline queries (profile stats, transactions, win/loss record)
- **BottomNav.tsx** has 1 inline query (unread notifications)
- **Notifications.tsx**, **GroupMarkets.tsx**, **GroupFeed.tsx**, **GroupBoard.tsx** are stubs with no Supabase calls yet
- **BetSheet.tsx** has zero Supabase calls (pure props) — `useUserBalance` would be consumed by Group.tsx to pass `userCoins` prop
- **Home.tsx** has 1 large query (groups dashboard) — not listed in the 7 hooks but will remain as-is

### Plan

#### 1. Create `src/hooks/useGroupMarkets.ts`
- Accepts `groupId`, `userId`
- Combines the 6 queries currently in Group.tsx: group markets, public markets, verdicts, disputes, user flags, user bets, member count
- Returns `{ markets, publicMarkets, userBets, verdicts, disputes, userFlags, memberCount, loading, refetch }`
- Group markets query: `.eq("group_id", groupId)` with no inner join (current pattern is fine, just `from("markets").select("*")`)
- `userBets` as `Record<string, { side, amount }>` (the betsByMarket map logic)

#### 2. Create `src/hooks/useGroupFeed.ts`
- Accepts `groupId`
- Fetches from `events` table ordered by `created_at desc`
- Sets up `supabase.channel()` realtime subscription on `events` filtered by `group_id`, cleanup on unmount
- Returns `{ events, loading }`

#### 3. Create `src/hooks/useUserBalance.ts`
- Accepts `userId`, `groupId`
- Fetches `coins` from `group_members` (not `users` table — coins are per-group)
- Clamps with `Math.max(0, balance)`
- Returns `{ balance, loading, refetch }`
- Used in Group.tsx to get `userCoins`

#### 4. Create `src/hooks/useNotifications.ts`
- Accepts `userId`
- Fetches notifications ordered by `created_at desc`
- Derives `unreadCount` from `read === false`
- `markAllRead` updates all unread rows
- Returns `{ notifications, unreadCount, loading, markAllRead }`
- Used in Notifications.tsx (full list) and BottomNav.tsx (badge count)

#### 5. Create `src/hooks/useGroupLeaderboard.ts`
- Accepts `groupId`
- Fetches `group_members` joined with `users` (name, avatar_color), ordered by XP desc
- Returns `{ leaderboard, loading }`

#### 6. Create `src/hooks/useJudgeAssignment.ts`
- Accepts `groupId`, `userId`
- Fetches pending verdicts for this judge in this group (current `pendingVerdicts` query from Group.tsx)
- Returns `{ pendingMarkets, loading }`
- Used in Group.tsx (amber banner) and JudgeVerdict.tsx

#### 7. Create `src/hooks/useProfile.ts`
- Accepts `userId`
- Combines Profile.tsx's 3 queries: user stats (name, avatar_color, coins, xp, streak across groups), transactions (last 50), win/loss record
- Returns `{ profile, transactions, record, loading }`

#### 8. Update pages to consume hooks

**Group.tsx** — Replace inline queries with:
- `useGroupMarkets(groupId, uid)` for markets, bets, verdicts, disputes, flags
- `useUserBalance(uid, groupId)` for coin display
- `useJudgeAssignment(groupId, uid)` for judge banner
- Remove ~100 lines of query code

**Notifications.tsx** — Use `useNotifications(uid)` to render full notification list with mark-all-read button

**BottomNav.tsx** — Use `useNotifications(uid)` for `unreadCount` badge (replacing inline query)

**GroupBoard.tsx** — Use `useGroupLeaderboard(groupId)` to render leaderboard table (currently stub)

**GroupFeed.tsx** — Use `useGroupFeed(groupId)` to render events (currently stub)

**JudgeVerdict.tsx** — Use `useJudgeAssignment(groupId, uid)` for pending check; keep market/verdict-specific queries inline (they're page-specific, not reusable)

**Profile.tsx** — Use `useProfile(uid)` replacing inline queries

**BetSheet.tsx** — No change (pure props component). Balance comes from Group.tsx via `useUserBalance`.

### Files created (7)
- `src/hooks/useGroupMarkets.ts`
- `src/hooks/useGroupFeed.ts`
- `src/hooks/useUserBalance.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useGroupLeaderboard.ts`
- `src/hooks/useJudgeAssignment.ts`
- `src/hooks/useProfile.ts`

### Files modified (7)
- `src/pages/Group.tsx` — major refactor, ~100 lines removed
- `src/pages/Notifications.tsx` — fleshed out with hook
- `src/pages/Profile.tsx` — use useProfile hook
- `src/pages/GroupBoard.tsx` — fleshed out with leaderboard hook
- `src/pages/GroupFeed.tsx` — fleshed out with feed hook
- `src/pages/JudgeVerdict.tsx` — extract judge assignment check
- `src/components/BottomNav.tsx` — use useNotifications hook

