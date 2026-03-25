

## Two Small UI Tweaks

### 1. Roast Composer: Write Your Own First
**File: `src/pages/RoastComposer.tsx`**
- Line 41: Change `useState(false)` → `useState(true)` so the textarea shows by default
- Lines 155-164: Update section header and toggle label:
  - Header shows "WRITE YOUR ROAST" in custom mode, trigger-based label when viewing presets
  - Toggle label: "🔥 Use a preset" when in custom mode, "✏️ Write your own" when viewing presets

### 2. Simplify "+ react" Button to WhatsApp-style Emoji+
**File: `src/components/FeedReactions.tsx`**
- Lines 63-68: Replace the `+ react` text button with a minimal smiley-plus icon button — just `😀+` or a simple `🙂⁺` character, no background/border, smaller and more subtle like WhatsApp's reaction trigger.

