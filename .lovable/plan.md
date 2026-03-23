

## Problem

Two bugs prevent the judge flow from working:

1. **Judge banner logic is inverted** (`Group.tsx` lines 143-168): The `pendingVerdicts` query returns closed markets where the user has *no* verdict row. But `assign-judge` creates a verdict row with `status='pending'` for the assigned judge. So the banner filters OUT the exact markets where the user IS the judge. The banner never appears.

2. **No fallback for direct navigation**: If the user navigates to the judge URL manually, the page works but the banner link is the only discovery path.

## Plan

### 1. Fix the judge banner query in `Group.tsx`

Replace the `pendingVerdicts` query (lines 143-168) with correct logic:
- Query `verdicts` table directly for rows where `judge_id = uid` and `status = 'pending'`
- Join with closed markets in this group
- Return the market info for each pending verdict

```text
Flow:
  verdicts (judge_id=me, status=pending)
    → get market_ids
    → filter by group_id = current group
    → return market question/id for banner
```

### 2. Fix banner navigation

The `navigate()` call on line 438 currently passes `pendingVerdicts[0]?.id` which is the market ID. This part is correct but depends on step 1 returning the right data.

### Technical Details

**Modified file**: `src/pages/Group.tsx`
- Replace the `pendingVerdicts` useQuery to first query `verdicts` for `judge_id=uid, status=pending`, then filter by markets in the current group
- The banner click handler stays the same

