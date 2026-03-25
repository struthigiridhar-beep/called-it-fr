

## Fix: Public Bets on Home + forwardRef Warnings

### Problem 1: Public bets missing from Home
The Home page (`src/pages/Home.tsx`) only queries `group_members` for the current user. If the user has no group memberships, it returns `[]` immediately (line 49). Public markets the user has bet on are never fetched or displayed.

### Problem 2: Console warnings
`OddsBar` and `Notifications` components receive refs (from React Router's `<Route>`) but aren't wrapped in `forwardRef`.

---

### Changes

#### 1. `src/pages/Home.tsx` — Add "Your Public Bets" section

Add a second `useQuery` that:
- Fetches all bets by the current user
- Gets the corresponding market IDs
- Fetches those markets where `is_public = true`
- Returns them as a list of public markets the user has participated in

Render a **"Your Public Bets"** section below the groups list (before the create/join CTA) showing each public market as a compact card: question, YES/NO pool bar, status badge, and the user's bet position. Tapping navigates to the landing page or a dedicated public market view.

Also update the header stats line to include public bet count: `"0 groups · 2 public bets · 0 markets live"`

#### 2. `src/components/OddsBar.tsx` — Wrap in `forwardRef`

Add `React.forwardRef` wrapper to eliminate the console warning when used inside `Landing.tsx`.

#### 3. `src/pages/Notifications.tsx` — Wrap in `forwardRef`

Same fix — wrap the default export in `forwardRef` since React Router passes a ref to route elements.

### Files Modified
- `src/pages/Home.tsx` — new public bets query + rendering section
- `src/components/OddsBar.tsx` — `forwardRef` wrapper
- `src/pages/Notifications.tsx` — `forwardRef` wrapper

