

## Center Auth Screen + Bet Confirmation + Subtle Homescreen Nudge

### Changes to `src/pages/JoinGroup.tsx` — Auth step (lines 340-424)

1. **Center the content vertically**: Change container from `items-start justify-start pt-14` to `items-center justify-center`

2. **Keep pending bet card** at top of the centered block (already there)

3. **Add subtle homescreen nudge** below the auth form toggle, as a small inline hint (not a full-screen takeover). Something like:
   ```
   ┌─────────────────────────────┐
   │ 📱 Add Called It to your    │
   │ homescreen for quick access │
   │ iOS: Share → Add to Home    │
   └─────────────────────────────┘
   ```
   - Small card with muted styling (`bg-bg-1 border-b-1 text-t-2 text-xs`)
   - Device-detected instructions (iOS vs Android) using the same `getDeviceInstructions()` logic from `HomescreenNudge.tsx`
   - Only shown if not already dismissed (`shouldShowNudge()`) and not in standalone mode
   - Dismissable with a small × button that sets the localStorage key

### Files
- **`src/pages/JoinGroup.tsx`**: Layout centering + add inline nudge card after the sign-in/sign-up toggle text

