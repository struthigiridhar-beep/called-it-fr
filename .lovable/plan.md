

## Fix: Feed is empty + Remove Alerts section

### Root Cause
The feed reads from the `events` table, but **nothing ever writes to it**. The `events` table has no INSERT RLS policy (users can't insert), and no application code or database trigger inserts rows. All activity (bets, verdicts, disputes, market creation) writes to `notifications` but never to `events`.

### Solution

**1. Database trigger to auto-populate `events` from actions**

Create a migration with:
- An INSERT RLS policy on `events` for authenticated users (needed for client-side inserts)
- A database trigger function that fires AFTER INSERT on `bets`, `markets`, `verdicts`, and `roasts` — automatically inserting corresponding `events` rows with the right `event_type` and `payload`

Trigger mappings:
| Source table | event_type | payload |
|---|---|---|
| `bets` | `bet_placed` | `{ side, amount, question (from markets), market_id }` |
| `markets` | `market_created` | `{ question, market_id, deadline }` |
| `verdicts` (status=committed) | `verdict_in` | `{ market_id, verdict, question }` |
| `roasts` | `roast_sent` | `{ to_user_id, message }` |

Each trigger looks up `group_id` from the relevant row (directly or via `markets`).

**2. Backfill existing actions into `events`**

Run INSERT statements to populate events from existing `bets`, `markets`, `verdicts`, and `roasts` rows so the feed isn't empty on first load.

**3. Remove Alerts/Notifications entirely**

- **`src/App.tsx`**: Remove the `/notifications` route and `Notifications` import
- **`src/components/BottomNav.tsx`**: Remove the Alerts tab (Bell icon + unread badge). Keep Home, Profile, Sign out
- **`src/pages/Notifications.tsx`**: Delete file (or leave orphaned — removing route is sufficient)
- **`src/hooks/useNotifications.ts`**: Remove import from BottomNav

**4. No changes needed to feed rendering**

`useGroupFeed.ts`, `FeedCard.tsx`, `FeedReactions.tsx`, and the feed tab in `Group.tsx` are already correct — they just need data in the `events` table.

### Files
- **New migration**: Trigger functions + backfill + RLS policy on `events`
- **`src/App.tsx`**: Remove notifications route
- **`src/components/BottomNav.tsx`**: Remove Alerts tab
