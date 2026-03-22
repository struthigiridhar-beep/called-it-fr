

## Put Coin Balance + Create on the Same Line as Tabs

### Problem
The coin balance pill and the tab bar (Markets / Feed / Board / + Create) are on two separate rows. The user wants them all on one single line.

### Change
**`src/pages/Group.tsx`** — Merge the header row and tab row into one `flex` row:
- Remove the separate "Coin balance row" `div` (lines 388-395)
- Move the group name `h2` above the combined row (or keep it as a standalone header)
- Combine tabs + coin pill + Create button into a single `flex items-center` row:
  - Left: Markets | Feed | Board tabs
  - Right: coin balance pill, then + Create button (using `ml-auto` and `gap-3`)

Layout will be:
```text
Group Name (header, own line)
[Markets] [Feed] [Board]          [0 c] [+ Create]
─────────────────────────────────────────────────
```

### Files
- `src/pages/Group.tsx` lines 387-419 — restructure the sticky header

