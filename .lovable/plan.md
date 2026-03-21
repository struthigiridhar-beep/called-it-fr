

## Build /group/:groupId — Markets, Feed, Board Tabs

### Overview
Replace the placeholder `Group.tsx` with a full tabbed layout. The Markets tab is the primary deliverable with two sections (group markets + public markets), a redesigned bet sheet with slider/presets/potential-return, position display, and judge banner. Feed and Board remain stubs.

### Files to modify/create

**1. `src/pages/Group.tsx`** — Full rewrite
- Fetch group info, user membership (coins), all markets for this group, user's bets, verdicts where user is judge
- Tab bar: Markets | Feed | Board (styled like screenshot — underline active tab)
- Default to Markets tab, render content inline (not via Outlet/child routes)
- Bottom nav bar (same as Home)

**2. `src/components/BetSheet.tsx`** — Major rewrite
- New props: `minBet`, `userCoins`, `groupName`, `totalPool`, `sidePool`
- Presets: `[minBet, minBet*2, minBet*4, "all in"]` — hide any preset > userCoins
- Slider: range input from minBet to userCoins
- Large centered amount display (like screenshot: "480 coins")
- Potential return row: `~${Math.round(amount / sidePool * totalPool)} c est.`
- Min bet warning: if amount < minBet, show amber warning + "Snap to minimum" button
- Confirm button: "Confirm YES · 480 c"
- Footer: "[X] coins in the bank"
- `onConfirm` callback receives side + amount

**3. `src/pages/GroupMarkets.tsx`** — Full rewrite (rendered inside Group.tsx, not as route)
- Actually this logic lives directly in Group.tsx Markets tab content

### Markets Tab Data Flow

```
Queries (all via useQuery):
1. group: groups.select("id, name").eq("id", groupId)
2. membership: group_members.select("coins, xp").eq("group_id", groupId).eq("user_id", uid)
3. markets: markets.select("*").eq("group_id", groupId).eq("status", "open") + markets.select("*").eq("is_public", true).eq("status", "open")
4. userBets: bets.select("*").eq("user_id", uid)
5. verdicts: verdicts.select("*, markets!inner(group_id, status)").eq("judge_id", uid) — for judge banner
6. userData: users.select("first_bet_at").eq("id", uid)
```

### Markets Tab Layout

**Judge Banner** (if user has pending verdict on a closed market in this group):
- Amber card with initials avatar, "You're the judge", "Tap to commit verdict · Xh left", market question

**Section: YOUR GROUP**
- Header: "YOUR GROUP"
- List markets where `is_public = false`, ordered by `created_at desc`
- Each card:
  - Capsule row: group name pill (`bg-[#272220] border-[#38302A] text-[#9A8E84]` + neutral dot)
  - Question text
  - Deadline inline as muted text: "closes Jun 30"
  - OddsBar
  - Stats row: YES% left, pool + deadline center, NO% right
  - YES / NO buttons
  - If user has bet on this market: position row "Your position: YES · 200 c" + estimated return

**Section: PUBLIC · EVERYONE CAN BET**
- Header row: "PUBLIC · EVERYONE CAN BET" + "Global" pill
- Pin user's first-bet market at top if `first_bet_at` is set and they bet on a public market
  - That card gets extra pill: "Your first bet" in yes-blue style
- List remaining public markets ordered by `(yes_pool + no_pool) desc`
- Each card: "Public bet" pill (blue style `bg-[#0E1820] border-[#1E3048] text-[#7B9EC8]`)
- Same card structure as group markets

### Bet Confirmation Logic (on confirm)
1. Insert into `bets` table (market_id, user_id, side, amount)
2. Update market: increment `yes_pool` or `no_pool` by amount
3. Update `group_members`: deduct coins — `newBalance = Math.max(0, currentBalance - amount)`
4. Insert notification for other group members
5. Invalidate queries, close sheet
6. Toast confirmation

### Coin Safety (enforced in BetSheet)
- Slider max = userCoins (never hardcoded)
- Presets filtered: only show if `preset <= userCoins`
- "all in" always shown, sets amount to userCoins
- Confirm handler clamps: `Math.max(0, coins - amount)`

### Routing Change in `App.tsx`
- Keep `/group/:groupId` route pointing to `Group` component
- Remove child routes for markets/feed/board (tabs are handled internally now)

### Technical Details
- No new DB migrations needed
- No new components — MarketCard will not be reused; cards are rendered inline in Group.tsx for the custom capsule/position rows
- OddsBar component reused as-is
- Existing BetSheet rewritten with new props interface (backward-compatible by making new props optional with defaults for referral flow usage)

