

## Fix Feed Realtime, Add Roast Triggers to Feed, Add Sign-In Button

### Three Issues

1. **Feed not updating in realtime**: The `events` and `reactions` tables are missing from the Supabase realtime publication. The hooks subscribe to postgres_changes but never receive them. Only `dispute_flags` and `dispute_votes` are currently published.

2. **No roast action on feed events**: The `market_settled` FeedCard shows verdict info but has zero action buttons for roasting losers. Similarly, `bet_placed` events don't offer roast options after a market resolves. Users can't trigger the roast flow from the feed.

3. **No sign-in button on landing page**: Returning users have no way to sign in without going through the bet flow.

---

### Changes

#### 1. Migration: Add tables to realtime publication
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
```
This will make the existing realtime subscriptions in `useGroupFeed.ts` actually work.

#### 2. `src/components/FeedCard.tsx` — Add roast action buttons

- **`market_settled` events**: Below the verdict/payouts, add a row of action buttons. For each user who lost (bet on the wrong side), show "🔥 Roast [Name]" linking to the roast composer with `trigger=bet_loss` and reason like "Lost on [question]". This requires passing market bets data or computing losers from the payload.
  - Simpler approach: Add a generic "🔥 Roast a loser" button that navigates to a member picker, OR add roast buttons for known losing users from the payouts/bets context.
  - Best approach: The `market_settled` payload already has `verdict`. Any `bet_placed` event for the same market on the opposite side = a loser. Add a prop `allEvents` or compute from `users` map. **Simplest**: just add a "🔥 Roast" button on `market_settled` that lets the user pick a target from group members.

- **`bet_placed` events**: Add a subtle "🔥 Roast" action button visible to other users (not the actor) — allows roasting someone for a bold/bad bet.

#### 3. `src/pages/Landing.tsx` — Add subtle sign-in link

Below the "Create your own bet" button (line 449), add:
```
Already have an account? Sign in
```
Styled as `text-t-2 text-xs text-center` with "Sign in" underlined. Clicking sets `authMode` to `"signin"` and advances to the auth step.

### Files Modified
- **Migration**: Add `events` and `reactions` to realtime publication
- `src/components/FeedCard.tsx` — roast action buttons on `market_settled` and `bet_placed`
- `src/pages/Landing.tsx` — sign-in link at bottom

