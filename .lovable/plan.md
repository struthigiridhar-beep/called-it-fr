

## Bug: Reveal Ceremony stuck on "Verdict coming in"

### Root Cause

In `RevealCeremony.tsx` line 178-187, the auto-advance useEffect has a race condition:

1. `setVerdictIncoming(true)` is called, starting a 2.5s timer
2. This state change triggers a re-render
3. React runs the cleanup function from the previous render, which calls `clearTimeout(timer)`
4. The effect re-runs, but now `verdictIncoming` is `true`, so `!verdictIncoming` is false — the if-block is skipped
5. The timer is gone and never re-created. The ceremony is stuck forever.

### Fix

**`src/components/RevealCeremony.tsx`** — Split into two effects:

1. One effect to detect `verdict.status === "committed"` and set `verdictIncoming = true`
2. A separate effect that watches `verdictIncoming` and sets a timer to advance to state 3

```typescript
// Effect 1: detect committed verdict
useEffect(() => {
  if (state === 2 && verdict?.status === "committed" && !verdictIncoming) {
    setVerdictIncoming(true);
  }
}, [state, verdict?.status, verdictIncoming]);

// Effect 2: auto-advance after delay
useEffect(() => {
  if (verdictIncoming && state === 2) {
    const timer = setTimeout(() => setState(3), 2500);
    return () => clearTimeout(timer);
  }
}, [verdictIncoming, state]);
```

This way, the timer in effect 2 is only created/cleaned when `verdictIncoming` or `state` changes — and since both are already at their final values when the timer is set, no re-render will clear it.

### Files Modified
- `src/components/RevealCeremony.tsx` — lines 178-187 only

