

## Onboarding Flows, Invite System, and Create Group Fix

This is a large set of changes across 5 fixes. Here is the implementation plan.

### Overview

```text
Cold landing bet → auth overlay → /onboarding/create-group → /onboarding/first-market → /group/:id (invite sheet auto-opens)
Home + FAB → CreateJoinGroupSheet → create or join → /group/:id (invite sheet auto-opens)
Group header Invite button → GroupInviteSheet
/join/:groupId?ref=X&c=Y → referral tracking → reward on first bet
```

### FIX 1 — Post-bet auth on cold landing

**File: `src/pages/Landing.tsx`**

Change the `useEffect` that fires when `user` is set during `step === "auth"`:
- Instead of advancing to `bet-placed` or `market-live`, redirect to `/onboarding/create-group`
- Before redirecting, commit the pending bet to Supabase (insert bet row, update market pools, set `first_bet_at` if null)
- Store pending bet data in localStorage before auth (already partially done) so it survives the auth flow

The auth form already exists on this page — no overlay needed, just change the post-auth destination.

### FIX 2 — `/onboarding/create-group`

**New file: `src/pages/OnboardingCreateGroup.tsx`**

Full-screen page, no BottomNav. Layout matches mockup (image-95):
- "Called It." wordmark top-left, muted
- 2-dot progress indicator (dot 1 active in `#7B9EC8`)
- "Now make it personal." heading
- "Create a group for your crew..." subtext
- Group name input with placeholder
- "You can always rename it later." helper text
- "Create group →" full-width button at bottom

On submit:
1. Insert `groups` row (name, created_by, is_public=false)
2. Insert `group_members` row (user_id, group_id, coins=500, xp=0)
3. Navigate to `/onboarding/first-market?groupId=[id]`

**File: `src/App.tsx`** — add route `/onboarding/create-group`

### FIX 3 — `/onboarding/first-market`

**New file: `src/pages/OnboardingFirstMarket.tsx`**

Full-screen, no BottomNav. Layout matches mockup (image-96):
- Progress indicator (dot 2 active)
- "Drop the first market." heading
- Question textarea (120 char max, counter in corner)
- Suggestion pills that fill the textarea on tap
- Category chips: Work / Social / Life
- Deadline chips: 1w / 2w / 1mo / 3mo
- "Post it →" button

On submit:
1. Insert `markets` row (group_id from query param, created_by, status=open, deadline computed from chip selection, min_bet=10)
2. Navigate to `/group/:groupId?showInvite=true`

**File: `src/App.tsx`** — add route `/onboarding/first-market`

### FIX 4 — Create or join group from home

**New file: `src/components/CreateJoinGroupSheet.tsx`**

Bottom sheet with two sections matching mockup (image-94):
- "Create a new group" — name input, "Create →" button
- "Join with a code" — paste link/code input, "Join group →" button

Create flow: insert group + member, navigate to `/group/:id?showInvite=true`

Join flow: parse code from input (handle full URL or raw code), validate against `invites` table, increment uses, insert `group_members` (coins=500), navigate to `/group/:id`

**File: `src/pages/Home.tsx`** — wire the dashed card and FAB to open this sheet

### FIX 5 — Invite sheet (GroupInviteSheet)

**New file: `src/components/GroupInviteSheet.tsx`**

Bottom sheet that calls `supabase.rpc('generate_invite_link', { p_group_id, p_inviter_id })` on open. Layout matches mockup (image-97, image-98):

- Group avatar + name + member count
- Overlapping member avatar circles (first 5)
- Dynamic headline computed from group data:
  - If any member has streak >= 3: "[Name] is on a [N]-win streak. Come bet against them."
  - If settled markets >= 5: "Your friends have called [N] things right."
  - Default: "Your crew is betting on each other. You're not in it yet."
- First open market card with odds bar
- Second market blurred with lock icon + "Join to see more"
- Invite link display with Copy button
- Three buttons: Share, WhatsApp, Skip for now

**File: `src/pages/Group.tsx`**:
- Add "Invite" button to group header
- Read `?showInvite=true` query param to auto-open sheet on arrival from onboarding
- Wire sheet open/close state

### FIX 6 — Referral tracking

**File: `src/pages/JoinGroup.tsx`**:
- On `/join/:groupId?ref=X&c=Y`, store `{ ref, code, groupId }` in localStorage key `pendingReferral`
- After auth + join: read localStorage, insert `referrals` row, increment `invites.uses`, clear localStorage

**Referral reward on first bet** — handled via existing `handle_new_bet_event` trigger or a new trigger:
- Check if user's `first_bet_at` was null, set it
- Look up `referrals` where `invitee_id = user.id`
- Credit inviter 50 coins, insert transaction, insert notification

This reward logic is best done in a new DB trigger `handle_first_bet_referral_reward` on `bets` table since it needs service-level access to update another user's coins.

**Migration**: Create trigger function that fires on bet insert, checks if user has `first_bet_at IS NULL`, looks up referral, credits inviter.

### Routes added to `src/App.tsx`
- `/onboarding/create-group` → OnboardingCreateGroup
- `/onboarding/first-market` → OnboardingFirstMarket

### Files created
- `src/pages/OnboardingCreateGroup.tsx`
- `src/pages/OnboardingFirstMarket.tsx`
- `src/components/CreateJoinGroupSheet.tsx`
- `src/components/GroupInviteSheet.tsx`

### Files modified
- `src/App.tsx` — new routes
- `src/pages/Landing.tsx` — post-auth redirect change
- `src/pages/Home.tsx` — wire create/join sheet
- `src/pages/Group.tsx` — invite button + auto-open invite sheet
- `src/pages/JoinGroup.tsx` — referral localStorage tracking

### Migration
- New trigger function `handle_first_bet_referral_reward` on `bets` insert

### Not touched
Feed layout, Board tab, Markets tab, bet sheet internals, roast composer, judge screen, profile page, notification hooks, existing edge functions.

