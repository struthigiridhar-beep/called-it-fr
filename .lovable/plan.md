

## Fix: One Bet Per User Per Market + Side Lock

### Problem
1. **Bug**: The `betsByMarket` lookup (line 186-194) only keeps the side from the *first* bet row it encounters. When a user bets YES then NO, both bets exist but the map shows the wrong aggregate — it sums amounts but keeps whichever side was first.
2. **Missing rule**: Users should not be allowed to switch sides. They can only top up on their original side.

### Changes

**1. `src/pages/Group.tsx` — `confirmBet` function (lines 223-277)**
- Before inserting, check `betsByMarket` for an existing position on this market
- If the user already has a bet on the *opposite* side, show `toast.error("You already bet on [SIDE]. You can only top up.")` and return
- If same side, proceed (top-up)

**2. `src/components/BetSheet.tsx` — Lock side toggle when user has existing position**
- Add new prop `lockedSide?: "yes" | "no"` 
- When `lockedSide` is set, disable the opposite side button (grey it out, show "Locked" or similar), and force `side` to `lockedSide`
- Show a small note: "You're already on [SIDE] — top up only"

**3. `src/pages/Group.tsx` — `openSheet` function (line 217)**
- Pass `lockedSide` to `BetSheet` based on `betsByMarket.get(market.id)?.side`
- If user has existing position, force `initialSide` to match their existing side regardless of which button they tapped

**4. `src/pages/Group.tsx` — `betsByMarket` aggregation (lines 186-194)**  
- No change needed here — the aggregation logic is actually fine as long as we enforce single-side. The bug is that it *allows* mixed-side bets to exist; once we block switching, the lookup will always be correct.

### No database changes needed
The enforcement is client-side. The bets table allows multiple rows per user/market (for top-ups), which is correct.

