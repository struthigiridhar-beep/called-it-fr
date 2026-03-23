

## Problem

The judge's "Pass verdict" button never appears because:

1. **Verdict status mismatch**: The verdict for "Will it rain tomorrow?" has `status = 'committed'` but the query on line 170 only looks for `status = 'pending'`. Since the verdict was already committed, `pendingVerdicts` returns empty, so `isJudgeForMarket` is always false.

2. **Market not transitioning to resolved**: The market remains `closed` even after the verdict is committed. There's no logic to update the market status to `resolved` after commitment.

## Plan

### 1. Fix the pendingVerdicts query to include both statuses

In `Group.tsx` line 170, change the filter to match both `pending` and `committed` verdicts so the judge sees the banner and dual buttons for markets they haven't fully resolved yet:

```
.in("status", ["pending", "committed"])
```

Also update the market filter on line 177 to keep `.eq("status", "closed")` since that's correct — the market stays closed until fully resolved.

### 2. Update market status to "resolved" after verdict commitment

In `JudgeVerdict.tsx`, after the verdict is committed successfully, also update the market's status from `closed` to `resolved`. This ensures the market card shows "View result" instead of "Reveal →" once the judge has acted.

### 3. Show appropriate buttons based on verdict status

Refine the card button logic:
- **Verdict pending** (judge assigned but hasn't committed): Show "Pass verdict" + "Reveal →"
- **Verdict committed** (judge committed, market still closed): Show "View result" since verdict exists
- **Market resolved**: Show "View result"

### Technical Details

**Files modified**: `src/pages/Group.tsx`, `src/pages/JudgeVerdict.tsx`

- `Group.tsx` line 170: `.in("status", ["pending", "committed"])` 
- `JudgeVerdict.tsx`: Add `await supabase.from("markets").update({ status: "resolved" }).eq("id", marketId)` after successful verdict commit
- Optionally split the button logic to distinguish pending vs committed verdicts

