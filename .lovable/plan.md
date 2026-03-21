

## Referral Flow Rebuild

The current `JoinGroup.tsx` is broken: it mixes password auth with Google OAuth, has tangled state transitions, and doesn't match the prototypes. Here's the plan to rebuild it from scratch based on the 4 screens you shared.

### Flow Overview

```text
Screen 1: PREVIEW (no bet tapped)
  → User sees inviter avatar, group name, hero text
  → Featured market card with "About you" badge
  → Blurred locked markets + member avatars
  → "Join [Group]" button at bottom
  → Tapping YES/NO on the market card opens the BetSheet

Screen 2: BET SHEET (drawer)
  → "Bet on YES before joining" header (adapts to side)
  → Amount presets: 25, 50, 100, all-in
  → CTA: "Join + bet 25 coins on YES"
  → Confirming stores bet locally, advances to Screen 3

Screen 3: AUTH (magic link)
  → Shows "YOUR PENDING BET" summary card (side, amount, question)
  → "One step to get in." heading
  → Single email input field — no password, no name
  → "Send magic link" button at bottom
  → Calls signInWithOtp({ email })
  → Shows "Check your email" confirmation after sending

Screen 4: JOINED (after magic link click)
  → Success banner: "You're in [Group]. [Inviter] earns 50 coins"
  → "YOUR BET IS LIVE" card with position, amount, updated odds bar
  → Inviter referral info card (+50 c)
  → "You start with 500 coins."
  → "See all markets" button at bottom
```

### Step 1: Add `signInWithOtp` to useAuth

Add a new method to `AuthContextType` and `AuthProvider`:
```ts
signInWithOtp: (email: string) => Promise<void>
```
Implementation calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/join/' + groupId + '?ref=' + inviteCode } })`. The redirect URL needs to bring them back to the same join page so the `useEffect` can complete the join.

Remove `signUpWithEmail` and `signInWithEmail` (password-based) since we're going magic-link only. Keep `signInWithGoogle` for future use but remove it from the referral auth screen.

### Step 2: Rewrite JoinGroup.tsx

Replace the entire file with a clean 4-step state machine:

**State**: `step: "preview" | "auth" | "magic-sent" | "joined"`
- `pendingBet: { side, amount } | null` — stored before auth, applied after

**Screen 1 (preview)**: Matches prototype image-16 exactly:
- Inviter avatar + "{Name} invited you / to {Group} · N members"
- Bold heading: "There's already a market about you."
- Subtext: "Join to see what they're predicting — and bet back."
- Featured MarketCard with floating "About you" badge (top-right)
- Blurred locked card: "{N} more markets — join to unlock"
- Member avatar stack + "{N} already inside"
- Bottom CTA: "Join {Group}" — tapping goes to auth if no user, joined if user
- YES/NO buttons open the BetSheet

**Screen 2 (BetSheet)**: Modify the existing BetSheet for referral context:
- Header: "Bet on {SIDE} before joining" (not "Place your bet")
- Same 25/50/100/all-in presets
- CTA: "Join + bet {amount} coins on {SIDE}"
- On confirm: store pending bet, advance to `auth` step

**Screen 3 (auth)**: Matches image-18:
- If pending bet exists, show "YOUR PENDING BET" card (side, amount, truncated question)
- Heading: "One step to get in."
- Subtext: "Enter your email — we'll send a magic link. No password, no forms."
- Single email input
- "No spam. Just your friends roasting you when you're wrong."
- Bottom CTA: "Send magic link"
- After sending: show "magic-sent" sub-state with "Check your inbox" message

**Screen 4 (joined)**: Matches image-19:
- Triggered by `useEffect` when `user` becomes non-null
- Auto-joins group + credits inviter 50 coins
- If pending bet exists, places it via Supabase insert into `bets` + updates market pools
- Success banner: "You're in {Group}. {Inviter} earns 50 coins for inviting you"
- "YOUR BET IS LIVE" card: question, "Your position: {SIDE}", "{amount} coins in", updated odds bar
- Inviter info card with avatar: "{Name} invited you — he earns 50 coins each time you bet +50 c"
- "You start with 500 coins."
- Bottom CTA: "See all markets"

### Step 3: Update BetSheet for referral mode

Add an optional `referralMode` prop to BetSheet that changes:
- Header text to "Bet on {SIDE} before joining"
- CTA text to "Join + bet {amount} coins on {SIDE}"
- Helper text removed

### Step 4: Persist pending bet across magic link redirect

Since the magic link opens in a new tab/same tab after email click, the React state is lost. Store `pendingBet` and `groupId` in `localStorage` before sending the magic link. On mount, if user is authenticated and localStorage has a pending bet for this group, restore it and clear storage.

### Technical Details

- **Magic link auth**: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })` — no password needed
- **Redirect URL**: Must point back to `/join/:groupId?ref=:code` so the join effect fires
- **localStorage keys**: `calledit_pending_bet` = `{ groupId, side, amount, marketId }`
- **Bet placement on join**: Insert into `bets` table + update `markets` yes_pool/no_pool via two separate calls (no RPC exists for atomic bet placement yet)
- **RLS**: Bets INSERT policy requires `auth.uid() = user_id` — works since user is authenticated post-magic-link
- **Markets SELECT**: Anon can view public markets, but group markets require membership. The join upsert must happen before bet placement.

