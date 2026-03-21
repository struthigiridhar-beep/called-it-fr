

## Cold Start Landing Flow Rebuild

Based on the 7 screens provided, the landing page needs a clean state machine that handles two paths: betting on a public market, and creating your own bet. Both lead to magic link auth and distinct post-auth screens.

### Flow

```text
Path A: Bet on public market
  browse → betting (sheet) → auth ("Save your bet.") → magic-sent → bet-placed

Path B: Create your own bet
  browse → create-bet → auth ("One step to go live.") → magic-sent → market-live
```

### Screens to build (matching prototypes exactly)

**Screen 1 — Browse (image-20)**
- "Called It." brand heading + subtitle
- "Live now" + "X coins in play" indicator
- MarketCard with PUBLIC BET badge, YES/NO buttons
- "Create your own bet instead ›" card below (not a text link — a bordered card row)

**Screen 2 — BetSheet (image-21)**
- Existing BetSheet drawer, no changes needed
- Header: "How much on YES?" (update from current "Place your bet")
- CTA: "Bet 25 coins on YES"
- On confirm: store pending bet in state, advance to `auth`

**Screen 3a — Auth after bet (image-22)**
- "YOUR PENDING BET" card: Side (YES/NO colored), Amount (coin colored), truncated question
- "Save your bet." bold heading
- "Enter your email — we'll send a magic link. No password."
- Email input, "No spam. Ever." helper
- Fixed bottom "Send magic link" button
- Calls `signInWithOtp(email, redirectTo: window.location.origin)`
- Stores `calledit_pending_bet` in localStorage before sending
- On success: advance to `magic-sent`

**Screen 3b — Auth after creating bet (image-23)**
- "YOUR MARKET" card: bold question text, "Goes live the moment you sign in. Your link is ready."
- "One step to go live." bold heading
- "Enter your email — we'll send a magic link instantly."
- Same email input + "No spam. No password. Ever."
- Fixed bottom "Send magic link" button
- Stores `calledit_pending_market` in localStorage

**Screen 4 — Magic link sent (image-24)**
- Centered green checkmark circle icon
- "Check your email." bold heading
- "Tap the magic link and you're in — bet saved, coins credited, market live."
- "While you wait" card: "Share your link now. They need to join to see the odds."

**Screen 5a — Bet placed (image-25)** — shown after magic link return with pending bet
- "Bet placed." bold heading
- "YOUR POSITION" card: question, odds bar, "YES · 25 coins" + "68% odds"
- Gold "Now make one about your crew" CTA card
- "Create your own bet →" button
- "Explore the app" secondary button

**Screen 5b — Market live (image-26)** — shown after magic link return with pending market
- "You're live." bold heading
- Market card: question, "Your market is live. Share the link — they have to join to see the odds."
- Share URL + WhatsApp / Copy link / iMessage buttons
- "You start with 500 coins. Place a bet on your own market too."
- "See my markets" bottom button

### Files to change

1. **`src/pages/Landing.tsx`** — Full rewrite with new step type:
   ```ts
   type Step = "browse" | "betting" | "create-bet" | "auth" | "magic-sent" | "bet-placed" | "market-live";
   ```
   - Add `useEffect` on mount: if `user` exists and localStorage has `calledit_pending_bet`, restore it and go to `bet-placed`; if `calledit_pending_market`, go to `market-live`; otherwise redirect to `/home`
   - Auth screen renders differently based on whether `pendingBet` or `pendingMarket` is set
   - `magic-sent` is a single shared screen

2. **`src/components/BetSheet.tsx`** — Update default header from "Place your bet" to "How much on {SIDE}?" to match image-21

3. **`src/hooks/useAuth.tsx`** — Ensure `signInWithOtp` accepts a `redirectTo` param (already done in previous work, just verify)

### localStorage persistence

Before calling `signInWithOtp`:
- If betting: `localStorage.setItem('calledit_pending_bet', JSON.stringify({ side, amount, marketId, question }))`
- If creating market: `localStorage.setItem('calledit_pending_market', JSON.stringify({ question }))`

On Landing mount with authenticated user:
- Check localStorage for either key
- If found, restore state and show the corresponding post-auth screen
- Clear localStorage after processing

