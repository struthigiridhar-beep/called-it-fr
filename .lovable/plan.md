

## Roast Composer Flow

### Overview
Build a multi-step roast flow: composer screen → sent confirmation screen. Accessible from feed event actions and profile. The `roasts` table already exists with `from_user`, `to_user`, `group_id`, `message`, `trigger_type`.

### New Files

#### 1. `src/pages/RoastComposer.tsx`
Full-screen page at route `/group/:groupId/roast/:toUserId`.

Query params pass context: `?trigger=bet_loss&reason=Lost 200 c · bet NO on launch slip&name=Rahul K&color=#...`

**Layout (matching screenshots exactly):**
- Header: `← Back` button + "Roast [Name]"
- Target card: avatar (colored circle with initials), name, reason line in muted text
- Section label: "BET LOSS ROASTS" or "STREAK BREAK ROASTS" based on trigger
- 4 preset roast cards — bordered cards with radio dot indicator, tapping selects (highlighted border turns roast-colored)
- "✏️ Use a preset instead" / "✏️ Write your own" toggle button — swaps between preset list and textarea (max 140 chars)
- **LIVE PREVIEW** section: dark red-bordered bubble showing "To: [Name]" + "@you" + the selected roast text in italic roast color
- "Send roast 🔥" button at bottom

**Preset lines:**
- `bet_loss`: 4 lines about being wrong / bad odds reading (from screenshot)
- `streak_break`: 4 lines about streak dying

**On send:**
1. Insert into `roasts` table (`from_user`, `to_user`, `group_id`, `message`, `trigger_type`)
2. Insert into `notifications` table (`user_id = to_user`, `type = "roast_received"`, `payload = { from_name, message, group_id, roast_id, from_user_id }`)
3. Insert into `events` table (`event_type = "roast_sent"`, `payload = { to_user_id, message, has_reply: false }`)
4. Navigate to sent confirmation (same page, state toggle)

#### 2. Sent Confirmation (same component, state-driven)
- Checkmark circle icon
- "Roast sent." heading
- "[Name] can see it now. The group can too." in muted text
- Red-bordered preview bubble with the roast text
- "🔥 Roast again" button → resets composer state
- "← Back to feed" button → navigates to group feed tab

### Modified Files

#### 3. `src/App.tsx`
Add route: `/group/:groupId/roast/:toUserId` → `<RoastComposer />`

#### 4. `src/components/FeedCard.tsx`
- On `bet_placed` events where market is settled and user lost: add "🔥 Roast" and "Send coins" action buttons
- On `roast_sent` events: add "🔥 Fire back" button for the recipient (navigates to roast composer targeting the sender)
- On `streak_milestone` / streak break events: add "🔥 Roast streak" button

#### 5. `src/pages/Notifications.tsx`
- For `roast_received` type notifications: render rich card with fire icon, "[Name] roasted you", roast preview text, timestamp
- Action buttons: "🔥 Fire back" (opens composer targeting sender), "React", "Ignore"

#### 6. `src/pages/Profile.tsx`
- Add "🔥 Roast" button in the action area (only shown when viewing another user's profile, or as a general entry point)

### Design Tokens
- All dark backgrounds (`bg-bg-0`, `bg-bg-1`, `bg-bg-2`)
- Roast preview bubble: dark red background with roast-colored border and italic text (matching the warm/copper tones in screenshots — use `border-[#8B4513]/40 bg-[#3D1F0E]` style)
- Selected preset: filled radio dot + highlighted border in roast color
- Monospace for all numbers (`font-mono-num`)
- Buttons use existing `rounded-button`, `border border-b-1` patterns

### No Database Changes
The `roasts`, `notifications`, and `events` tables already exist with the needed schema.

