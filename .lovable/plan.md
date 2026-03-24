

## Two Issues: Verdict Leak on Home + Broken Coin Payouts

### Issue 1: "Verdict → YES" showing on Home page

The Home page group card shows the most recent activity — which is currently picking up verdicts via the `lastActivity` logic (line 116-117). The verdict text "Verdict → YES" is showing because the latest event in the group was a verdict commitment, not a bet.

**Fix**: Change the activity line to only show bet activity (not verdicts). Verdicts are internal judge actions, not social activity worth surfacing on the home dashboard. Remove the verdict comparison from the `lastActivity` logic entirely.

### Issue 2: Coins are stuck — NO payout logic exists

This is the critical bug. Here's what's happening:

- User started with base coins, placed bets totaling 540 coins (deducted correctly), received 300 in bonuses
- Current balance: 260 coins — mathematically correct based on transactions
- **But**: Two markets are resolved ("Will it rain" → YES won, "gym 3x" → YES won). The user bet YES on rain (40 coins) and NO on gym (100 coins). They should have received a payout for the rain win, and lost coins on gym.
- **There are ZERO `payout` transactions in the database.** The `resolve_market` RPC only updates `markets.status = 'resolved'` — it does NOT distribute coins to winners.

The entire payout pipeline is missing. When a verdict is committed and the market resolves, nobody gets paid.

### Plan

#### 1. Add payout logic to `resolve_market` RPC (migration)

Rewrite the `resolve_market` function to:
- Get the winning side from the committed verdict
- Calculate total pool (`yes_pool + no_pool`)
- For each bettor on the winning side: payout = `(their_bet / winning_pool) * total_pool`
- Credit winners via `UPDATE group_members SET coins = coins + payout`
- Insert `payout` transaction rows for winners
- Award XP to winners (+10 per correct bet), deduct from losers or just skip
- Keep the `UPDATE markets SET status = 'resolved'`

```text
Payout formula:
  winning_side = verdict (yes/no)
  total_pool = yes_pool + no_pool
  winning_pool = sum of bets on winning side
  per_winner_payout = (their_amount / winning_pool) * total_pool
```

#### 2. Backfill payouts for already-resolved markets

Run a one-time migration to process payouts for the 2 resolved markets that never paid out:
- "Will it rain tomorrow?" (YES won, user bet 40 on YES → should get full pool back since only bettor)
- "Gym 3x week" (YES won, user bet 100 on NO → lost, no payout)

#### 3. Fix Home page activity line

In `Home.tsx`, remove the verdict branch from `lastActivity` logic (lines 116-122). Only show recent bets as activity.

#### 4. Build out Profile page with coin history

The Profile page is currently a stub (just shows email). Add:
- Current coin balance (from `group_members`)
- Transaction history list (bets, payouts, bonuses) from `transactions` table
- Win/loss record from resolved markets

### Files modified
- **Migration**: Rewrite `resolve_market` RPC with payout logic + backfill existing resolved markets
- **`src/pages/Home.tsx`**: Remove verdict from activity line
- **`src/pages/Profile.tsx`**: Add coin balance, transaction history, win/loss stats

