

## Reveal Ceremony — 4-State Fullscreen Modal

### Overview

Create a `RevealCeremony` component — a fullscreen overlay with 4 sequential states triggered when a market closes and awaits/receives a verdict. Also update `MarketCard` rendering in `Group.tsx` to show resolved markets with their verdict result instead of YES/NO bet buttons.

### New Files

**`src/components/RevealCeremony.tsx`** — The main component. Props: `open`, `onClose`, `marketId`, `groupId`, `groupName`. Internally fetches all needed data (market, bets with user names, verdict, judge info).

### State Machine

1. **Market Locked** — Shown when market is `closed` and verdict `status = 'pending'`
   - "BETTING CLOSED" uppercase label (text-t-2)
   - "All bets are in." bold title
   - Market question in muted italic
   - Floating avatar circles for each bettor with YES/NO label below, each with CSS bob animation at different rates using `animation-delay` and border opacity pulse
   - CTA button: "Judge is deliberating →" advances to state 2

2. **Deliberating** — Judge avatar centered with 2 concentric ring animations (scale out + fade, pure CSS `@keyframes`)
   - "The judge knows." bold title + "Everyone waits." muted subtitle
   - Info block: "[Judge name] is deliberating · integrity [score] · not yet committed"
   - Poll Supabase every 5s for verdict `status = 'committed'`. When detected, automatically show amber "Verdict coming in" block with animated dots (`...` cycling). User does NOT tap — after 2.5s delay, auto-advance to state 3.

3. **Verdict** — Clean reveal, no neon rings
   - "VERDICT" label + thin `<hr>` divider
   - 72px monospace YES or NO in `text-yes` / `text-no` color, plain background (no glowing border)
   - "called by [name] · integrity [score]" below
   - Market question in muted text
   - Coin flow rows: each bettor avatar + "Name · SIDE" + `+/-` coins in monospace (winners in `text-yes`, losers in `text-no`). Coin amounts calculated as proportional payout from total pool.
   - CTA: "See your result card →"

4. **Share Card** — Dark card with:
   - 2px top accent line in `yes`/`no` color
   - Group name + date (uppercase, spaced)
   - Market question
   - Large verdict word (same style as state 3 but smaller ~48px)
   - Stats row: coins won | streak | odds (3 columns, monospace numbers, coin-colored)
   - Footer: `called-it · @username` in monospace
   - "Share result" button (green/yes bg) + reset icon button beside it
   - Share uses `navigator.share` or clipboard fallback

### CSS Animations (added to `src/index.css`)

```css
@keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes border-pulse { 0%,100% { border-opacity: 1 } 50% { border-opacity: 0.4 } }
@keyframes ring-expand { 0% { transform: scale(0.8); opacity: 0.6 } 100% { transform: scale(1.6); opacity: 0 } }
@keyframes dots { 0% { content: '' } 33% { content: '.' } 66% { content: '..' } 100% { content: '...' } }
```

### Integration Points

**`src/pages/JudgeVerdict.tsx`** — After `handleCommit` succeeds, open the RevealCeremony modal (pass market/group context). The ceremony starts at state 3 (verdict) since the judge just committed.

**`src/pages/Group.tsx`** — Two changes:
1. In `renderMarketCard`, detect `m.status === 'resolved'` or `m.status === 'closed'`. For resolved markets, replace YES/NO buttons with a verdict result badge showing the outcome. For closed-pending markets, show a "Reveal" button that opens the ceremony at state 1.
2. Add `RevealCeremony` component instance with state management for which market is being revealed.

### Data Fetching Inside RevealCeremony

- Market data (question, pools, status) from `markets` table
- Bets with user info: join `bets` → `users` for name + avatar_color
- Verdict row from `verdicts` table (judge_id, verdict, status)
- Judge user info from `users` table
- Judge integrity from `group_members` table
- Polling: `useQuery` with `refetchInterval: 5000` on verdict row, enabled only in deliberating state

### Technical Details

- All state transitions use `useState<1|2|3|4>` 
- Fullscreen: `fixed inset-0 z-50 bg-bg-0` with fade-in animation
- Dot indicators at bottom showing current state (4 dots)
- Coin payout calculation: winner gets `(their_bet / winning_pool) * total_pool`, loser gets `-their_bet`
- No new routes needed — purely a modal overlay
- Users table has `avatar_color` field — use for avatar circle border/background tinting

