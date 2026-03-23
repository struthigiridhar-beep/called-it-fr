

## Fix: Judge should see both verdict banner AND Reveal button

### Problem
Currently the judge sees the "You're the judge" banner at the top AND the "Reveal →" button on the closed market card, but they function as two separate paths. The judge banner goes to the verdict commitment screen, and "Reveal →" opens the ceremony modal. This is correct behavior — the judge needs the verdict screen to actually commit, and the Reveal button shows the ceremony.

However, looking at the screenshot, the closed market card only shows "Reveal →". For the judge, it would be clearer to show **both** a "Pass verdict" button (linking to the judge screen) and the "Reveal →" button on the same card, so the judge has direct access from the card itself without relying solely on the banner.

### Changes

**`src/pages/Group.tsx`** — In the `renderMarketCard` function (around line 398):

For closed markets where the current user is the assigned judge (check if `pendingVerdicts` includes this market's ID), render **two buttons in a grid**:
1. **"Pass verdict"** — coin-colored, navigates to `/group/${groupId}/judge/${m.id}`
2. **"Reveal →"** — secondary style, opens the reveal ceremony modal

For closed markets where the user is NOT the judge, keep the single "Reveal →" button as-is.

For resolved markets, keep the single "View result" button as-is.

```text
Closed market card (judge):
  ┌──────────────┬──────────────┐
  │ Pass verdict  │  Reveal →   │
  └──────────────┴──────────────┘

Closed market card (non-judge):
  ┌─────────────────────────────┐
  │         Reveal →            │
  └─────────────────────────────┘
```

### Technical Detail
- Derive `isJudgeForMarket` by checking if `pendingVerdicts.some(v => v.id === m.id)`
- Use `grid grid-cols-2 gap-2` layout for the two-button judge variant

