

## Current State

The landing page renders correctly with:
- "Called It." heading and tagline
- A skeleton loader card (since no markets exist)
- "Skip → browse the app" link

**The full flow cannot be tested** because the `markets` table is empty. The skeleton loader displays indefinitely — there's no market to tap YES/NO on, so the bet sheet never opens.

## Issues Found

1. **No seed data**: The `markets` table has 0 rows. Need at least one market with `is_public = true` and `status = 'open'` to test the flow.

2. **`useFeaturedMarket` uses `.single()`**: When no rows match, Supabase returns a 406 error (`PGRST116: The result contains 0 rows`). This causes the query to error rather than return `null` gracefully. The hook should use `.maybeSingle()` instead of `.single()` to handle the empty case without throwing.

## Plan

### Step 1: Fix `useFeaturedMarket` to use `.maybeSingle()`
In `src/hooks/useFeaturedMarket.ts`, replace both `.single()` calls with `.maybeSingle()` so that zero-row results return `null` instead of a 406 error.

### Step 2: Insert a seed public market via migration
Create a migration that inserts a sample public market so the landing page has something to show:
- `question`: "Will the group ship before demo day?"
- `category`: "work"
- `is_public`: true
- `is_pinned`: true
- `status`: "open"
- `yes_pool`: 150, `no_pool`: 75
- `deadline`: 7 days from now
- Use a placeholder `created_by` (the existing user `2d7104eb-...`) and a placeholder `group_id` (create a public group if none exists)

### Step 3: Re-test the full flow
After seed data is in place, the flow becomes testable:
1. Landing shows the featured market card with YES/NO buttons
2. Tap YES → BetSheet drawer opens with side toggle + amount presets
3. Confirm bet → post-bet state with updated odds, reaction pills, "Create a market" CTA
4. Tap "Create a market" → "Your turn" prompt picker screen
5. Tap "Skip — explore the app" → auth screen with email/password form
6. Sign up → welcome screen with "See my markets" button

## Technical Details

- **`.single()` → `.maybeSingle()`**: This is the root cause of the 406 network errors visible in logs. `.maybeSingle()` returns `null` for 0 rows instead of erroring.
- The seed migration needs a valid `group_id` and `created_by` UUID. We'll create a group or use an existing user's ID.

