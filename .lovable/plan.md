

## Onboarding Flows, Invite System, and Create/Join Group

Six changes across 4 new files and 5 modified files.

---

### FIX 1 — Post-bet auth redirect (Landing.tsx)

Modify the `useEffect` at line 47 that fires when `user` is set during `step === "auth"`.

**Current**: advances to `homescreen-nudge`, `bet-placed`, or `market-live`.

**New**: On auth success:
1. If `pendingBet` exists → commit bet to Supabase (insert bet row, update market pool, set `first_bet_at` if null), clear state
2. Navigate to `/onboarding/create-group` (regardless of pendingBet or pendingMarket)
3. Remove the `bet-placed` and `market-live` step branches entirely — those screens are replaced by the onboarding flow

Also update line 63 redirect guard to still send already-authenticated users to `/home`.

The auth form (line 251) stays as-is — it already shows "Save your bet" heading and the pending bet card. Just need to add a "Display name" input field before email, and update button text to "Save my bet & continue →" per the mockup (image-101). On signup, also insert a `users` row with the display name.

---

### FIX 2 — /onboarding/create-group (new file)

**File**: `src/pages/OnboardingCreateGroup.tsx`

Full-screen, no BottomNav. Matches image-102 exactly:
- "Called It." wordmark top-left (13px, 700, #4A4038)
- 2-dot progress indicator (dot 1 = blue #7B9EC8, dot 2 = #2A2420)
- "Now make it personal." heading (26px, 800, #EAE4DC)
- "Create a group for your crew — the people you actually want to bet against." subtext
- Group name input (bg #1E1A17, border #2A2420, rounded-[13px], placeholder "Fantasy F1 league, flat 4, work rivals...")
- "You can always rename it later." helper text (#4A4038)
- Bottom-pinned "Create group →" button (bg #EAE4DC, color #100E0C, disabled when empty)

On submit:
1. Insert `groups` row → get ID
2. Insert `group_members` row (coins=500)
3. Navigate to `/onboarding/first-market?groupId=ID`

---

### FIX 3 — /onboarding/first-market (new file)

**File**: `src/pages/OnboardingFirstMarket.tsx`

Full-screen, no BottomNav. Matches image-103:
- Progress dots (dot 1 = green #7AB870 ✓, dot 2 = blue #7B9EC8 active)
- "Drop the first market." heading
- "Make it about someone specific. The more real, the better." subtext
- Question textarea (maxLength 120, char counter "n/120", turns red >100)
- Suggestion pills (flex-wrap): 6 pre-written suggestions, tapping fills textarea
- Category chips: Work / Social / Life (single select)
- Deadline chips in 2 rows: 1h / 6h / 24h / 3d | 1w / 1mo / 6mo / 1yr (default: 1w)
- "Post it →" button, disabled if question empty

On submit:
1. Insert `markets` row (group_id from query param, deadline computed from chip)
2. Navigate to `/group/:groupId?showInvite=true`

---

### FIX 4 — Create/Join group sheet (new component)

**File**: `src/components/CreateJoinGroupSheet.tsx`

Bottom sheet with two sections separated by "or" divider:
- **Create**: group name input + "Create →" button → insert group + member → navigate to `/group/:id?showInvite=true`
- **Join**: code/link input + "Join group →" → parse code, validate against `invites` table, insert member (coins=500), navigate to `/group/:id`

**Home.tsx** (line 268-276): Wire the dashed card `onClick` to open `CreateJoinGroupSheet`. The FAB (line 282) currently opens CreateMarketSheet — keep that behavior since it's for creating markets within an existing group.

---

### FIX 5 — Group invite sheet (new component)

**File**: `src/components/GroupInviteSheet.tsx`

Bottom sheet matching image-104. On open, calls `supabase.rpc('generate_invite_link', ...)` or creates an invite directly:
- Group avatar + name + member count
- Overlapping member avatars (first 5)
- Dynamic headline (streak-based, resolved-count-based, or default)
- First open market card with odds bar
- Second market blurred with 🔒 "Join to see more"
- Invite link row with Copy button
- Share / Share on WhatsApp / Skip for now buttons

**Group.tsx** modifications:
- Add "Invite" pill button in the sticky header (line 485-497, next to the coin badge)
- Add state `inviteSheetOpen` + read `?showInvite=true` on mount → auto-open sheet, clear param via `history.replaceState`
- Pass group data (members, markets, group info) to the sheet

Since `generate_invite_link` RPC may not exist yet, the sheet will create an invite directly: `supabase.from('invites').insert({ group_id, created_by }).select('code').single()` and construct the URL as `calledit.app/join/{groupId}?ref={code}`.

---

### FIX 6 — Referral tracking (JoinGroup.tsx)

On mount at `/join/:groupId?ref=X&c=Y`:
- Read `ref` and `c` params, store in localStorage key `pendingReferral`
- After auth + group join (existing useEffect at line 143): read `pendingReferral`, insert `referrals` row, increment `invites.uses`, clear localStorage

SQL trigger for referral reward — included as comment block at bottom of file for manual execution.

---

### Routing (App.tsx)

Add 2 routes inside AuthGuard:
- `/onboarding/create-group` → `OnboardingCreateGroup`
- `/onboarding/first-market` → `OnboardingFirstMarket`

---

### Files summary

| Action | File |
|--------|------|
| New | `src/pages/OnboardingCreateGroup.tsx` |
| New | `src/pages/OnboardingFirstMarket.tsx` |
| New | `src/components/CreateJoinGroupSheet.tsx` |
| New | `src/components/GroupInviteSheet.tsx` |
| Modify | `src/App.tsx` — add 2 routes |
| Modify | `src/pages/Landing.tsx` — auth redirect + display name field |
| Modify | `src/pages/Home.tsx` — wire create/join sheet |
| Modify | `src/pages/Group.tsx` — invite button + auto-open sheet |
| Modify | `src/pages/JoinGroup.tsx` — referral localStorage tracking |

### Not touched
Feed layout, Board tab, Markets tab, bet sheet internals, roast composer, judge screen, profile page, notification hooks, existing edge functions, BottomNav.

