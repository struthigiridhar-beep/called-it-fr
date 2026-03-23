

## Issues to Fix

Three problems identified from the screenshots and code:

### 1. Judge banner still shows "1 pending" after verdict committed

**Root cause**: `pendingVerdicts` query (Group.tsx line 170) includes both `pending` AND `committed` statuses, and the market filter on line 177 checks `status = "closed"`. If the market didn't transition to `resolved` (race condition or failed update), the committed verdict still appears as "pending" in the banner.

**Fix in `Group.tsx`**:
- Split the query: banner count should only count `status = "pending"` verdicts (not yet committed)
- For the card dual-buttons, check verdicts with `status = "pending"` only — once committed, the market should be resolved and show "View result"
- Banner text: change from "1 pending" to show actual pending count, and only show banner when there are truly pending (uncommitted) verdicts

### 2. JudgeVerdict committed view shows stale "Share your verdict card"

**Root cause**: After committing, `JudgeVerdict.tsx` line 173-236 shows a committed view with generic "Share your verdict card" and "Back to markets" buttons. The user expects the flow to either redirect back automatically or show a proper "View verdict" state.

**Fix in `JudgeVerdict.tsx`**:
- After successful commit + ceremony close, navigate back to the group page automatically
- The committed view (if revisited) should show "View verdict" instead of "Share your verdict card", and display the actual verdict outcome prominently

### 3. Home screen doesn't reflect resolved markets / verdicts

**Root cause**: Home.tsx line 85 only counts `status === "open"` markets for the "live" badge. There's no display of recently resolved markets or their verdict outcomes.

**Fix in `Home.tsx`**:
- Add a count or indicator for recently resolved markets (e.g., "1 resolved" or show the verdict outcome)
- On the group card, show the latest verdict result (e.g., "Verdict → NO") as part of the activity line when the most recent activity is a verdict rather than a bet

### 4. Multiple groups with pending verdicts

**Current behavior**: The banner navigates to `pendingVerdicts[0]?.id` and shows one question. With multiple markets or groups this is incomplete.

**Fix in `Group.tsx`**:
- If multiple pending verdicts exist in the group, list them all (or show a count with the first question, and make the banner navigate to a list)
- The banner should cycle through or stack multiple pending items

### Files Modified
- `src/pages/Group.tsx` — Fix pendingVerdicts query to only include `pending` status for banner; handle multiple verdicts
- `src/pages/JudgeVerdict.tsx` — Auto-navigate back after ceremony; update committed view copy
- `src/pages/Home.tsx` — Add resolved market / verdict display to group cards

