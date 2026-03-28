## Fix Create Group Page Styling + "Create Your Own Bet" Flow

Two issues to resolve:

### Issue 1 — Create Group  inside feed is not wired right. visual polish

Comparing current (image-112) vs target (image-116):

- **Progress dots**: Currently using `bg-yes` which renders as a wide pill. Should be small 8×8 circles — dot 1 in `#7B9EC8`, dot 2 in `#2A2420`
- **Input focus ring**: Browser default blue ring showing. Need to suppress with `focus:ring-0 focus:outline-none` and use `focus:border-[#4A4038]` instead
- **Subtext**: Should read "Create a group for your crew — the people you actually want to bet against." (matches current code, just verifying)
- Flow here should be The group name -> add bet -> get invite link or add people if already existing in Called It. 

Changes in `src/pages/OnboardingCreateGroup.tsx`:

- Fix dot sizes to explicit `h-2 w-2 rounded-full` with correct colors
- Fix input to suppress browser focus ring, use border-color change on focus

### Issue 2 — "Create your own bet" flow should pass question through to first-market

Current flow: Landing "Create your own bet" → question input → auth → `/onboarding/create-group` → `/onboarding/first-market` (empty)

Target flow: Landing "Create your own bet" → Create group (matching image) -> question input → auth → invite link -> `/onboarding/create-group` → `/onboarding/first-market` (pre-filled with the question they already typed)

Changes:

1. `**src/pages/Landing.tsx**` (line 79): When navigating to `/onboarding/create-group` after auth, if `pendingMarket` exists, pass the question as a query param: `/onboarding/create-group?question=...`
2. `**src/pages/OnboardingCreateGroup.tsx**`: Read `question` from search params. On group creation, forward it: `/onboarding/first-market?groupId=X&question=...`
3. `**src/pages/OnboardingFirstMarket.tsx**`: Read `question` from search params and pre-fill the textarea with it

This way the user's typed question carries through the entire flow without being lost.

### Files modified


| File                                  | Change                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| `src/pages/OnboardingCreateGroup.tsx` | Fix dot colors, input focus ring, forward `question` param   |
| `src/pages/OnboardingFirstMarket.tsx` | Pre-fill textarea from `question` query param                |
| `src/pages/Landing.tsx`               | Pass `pendingMarket.question` as query param to create-group |
