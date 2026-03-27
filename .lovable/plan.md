Full rebuild of /profile into a two-state profile screen.

One migration, one hook rewrite, two new bottom sheet components, routing updates.

Upload the reference mockup screenshots — match layout exactly.

---

MIGRATION

Before creating the migration file, check if status_text already exists on the users table:

  SELECT column_name FROM information_schema.columns

  WHERE table_name = 'users' AND column_name = 'status_text';

Only create migration if column is absent:

  ALTER TABLE users ADD COLUMN IF NOT EXISTS status_text text DEFAULT null;

No RLS changes needed.

---

HOOK: src/hooks/useProfile.ts — full rewrite

Single export: useProfile(userId: string, currentUserId: string)

Fetches in parallel:

1. User row: id, name, avatar_color, status_text, created_at from users

2. Memberships: join group_members → groups

   SELECT [gm.group](http://gm.group)_id, [g.name](http://g.name) as group_name, gm.xp, gm.coins, gm.streak,

          gm.judge_integrity, gm.crew_role, gm.joined_at

   FROM group_members gm

   LEFT JOIN groups g ON [g.id](http://g.id) = [gm.group](http://gm.group)_id

   WHERE gm.user_id = userId

3. currentUserGroupIds: SELECT group_id FROM group_members WHERE user_id = currentUserId

   Return as Set<string> for O(1) lookup

4. Recent bets: last 10 by created_at DESC

   SELECT [b.id](http://b.id), [b.market](http://b.market)_id, b.side, b.amount, b.created_at,

          m.question, m.status, m.yes_pool, [m.no](http://m.no)_pool, [m.group](http://m.group)_id,

          v.verdict as verdict_outcome

   FROM bets b

   LEFT JOIN markets m ON [m.id](http://m.id) = [b.market](http://b.market)_id

   LEFT JOIN verdicts v ON [v.market](http://v.market)_id = [b.market](http://b.market)_id AND v.status = 'committed'

   WHERE b.user_id = userId

   ORDER BY b.created_at DESC LIMIT 10

5. All settled bets for accuracy (no limit):

   Same join as above but WHERE m.status = 'resolved'

   Compute client-side:

     wins = rows where verdict_outcome === bet.side

     losses = settled - wins

     accuracy = settled > 0 ? Math.round(wins / settled * 100) : null

6. Referral stats (only fetch if userId === currentUserId):

   SELECT COUNT(*) as count FROM referrals WHERE inviter_id = userId

   Coins earned = count * 50 (referral reward is always 50 per spec)

Computed values (all client-side, not from DB):

lifetimeXp: memberships.reduce((sum, m) => sum + m.xp, 0)

avgIntegrity: average of judge_integrity across memberships where judge_integrity > 0

  If none: return 0

bestCrewRole: priority order for display (first match wins):

  Priority: Prophetic → Wildcard → HypedUp → Judge → Creator

  Find first role in that priority order across all memberships

  Return { role, groupName } — groupName is the group where this role was earned

streakHistory: computed from all settled bets ordered by created_at ASC:

  Walk through bets in order. Each bet is a win (verdict matches side) or loss.

  A streak is a consecutive sequence of wins. Reset on any loss.

  Build array of { length: number, status: 'active' | 'broken' }

  The last streak is 'active' if the most recent settled bet was a win AND current streak > 0

  Otherwise all are 'broken'

  Sort for display: active first (if exists), then by length DESC

  Peak = longest broken streak. Label it separately.

betResult(bet): function used in render

  If market.status = 'open' → { label: 'open', color: '#4A4038' }

  If market.status = 'resolved':

    won = bet.verdict_outcome === bet.side

    payout = won ? Math.round((bet.amount / (bet.side === 'yes' ? market.yes_pool : [market.no](http://market.no)_pool)) * (market.yes_pool + [market.no](http://market.no)_pool)) : 0

    won → { label: '+' + payout + ' c', color: '#7AB870' }

    lost → { label: '−' + bet.amount + ' c', color: '#C47860' }

Loading state: return { loading: true, data: null }

Error state: return { loading: false, error: true, data: null }

---

PAGE: src/pages/Profile.tsx — full rewrite

useParams<{ userId: string }>()

isSelf = userId === [currentUser.id](http://currentUser.id) (from existing auth context)

Uses useProfile(userId, [currentUser.id](http://currentUser.id))

Loading state: full screen centered, show 3 skeleton rows in design system colours (#171412 bg, #1E1A17 shimmer). No spinner.

Error state: centered "Couldn't load profile" in #5C5248, back button.

STICKY TOP NAV:

  position sticky, top 0, z-index 10

  bg #100E0C, border-bottom 1px solid #1A1714, padding 13px 16px

  Left: "←" in #7B9EC8, font-size 13px, onClick: navigate(-1)

  Center: [user.name](http://user.name), font-size 14px, font-weight 600, #EAE4DC, position absolute left 50% transform -50%

  Right: empty div (same width as back button for centering balance)

HEADER (padding 22px 16px 14px, flex col, align-items center, text-align center):

  Avatar: 70px circle, bg = user.avatar_color, initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

    font-size 24px, font-weight 700, color #100E0C, border-radius 99px

  Name: font-size 19px, font-weight 700, #EAE4DC, letter-spacing -0.3px, margin-bottom 3px

  Status: font-size 12px, #9A8E84, font-style italic, margin-bottom 10px

    If isSelf and status_text is null: "Add a status..." in #4A4038 (tappable — opens EditProfileSheet)

    Else: status_text value

  Crew role pill (if bestCrewRole exists):

    Format: "[emoji] [RoleName] · [groupName]"

    border-radius 99px, font-size 11px, font-weight 600, padding 3px 11px, margin-bottom 8px

    Prophetic: bg #241A30, color #A07FD8, border 1px solid #382A50

    Wildcard: bg #201800, color #C8A860, border 1px solid #362A04

    HypedUp: bg #1E0906, color #C47860, border 1px solid #38140C

    Judge: bg #0C1A0A, color #7AB870, border 1px solid #203A18

    Creator: bg #0E1820, color #7B9EC8, border 1px solid #162434

  Member since: font-size 10px, #4A4038, format: "Member since " + format(created_at, 'MMM yyyy')

STAT GRID (grid 3 cols, gap 6px, padding 0 14px 12px):

  Each card: bg #171412, border 1px solid #242018, border-radius 11px, padding 10px 8px

  Label: 9px, 700, uppercase, letter-spacing 0.06em, #4A4038, margin-bottom 4px

  Value: 18px, 700, monospace, #EAE4DC, line-height 1

  Unit: 9px, #5C5248, margin-top 2px

  Card 1 — Lifetime XP: value = lifetimeXp, unit = "xp"

  Card 2 — Accuracy: value = accuracy !== null ? accuracy + "%" : "—", unit = settled + " bets" or "< 3 bets" if settled < 3

  Card 3 — isSelf: label "Coins", value = memberships[0]?.coins ?? 0, unit "this week"

            other: label "Bets", value = recentBets.length (total from all bets query), unit "total"

JUDGE INTEGRITY BAR (margin 0 14px 12px):

  bg #171412, border 1px solid #242018, border-radius 11px, padding 10px 12px

  Top row flex space-between:

    Left: "⚖️ Judge integrity" — 9px, 700, uppercase, #4A4038

    Right: avgIntegrity > 0 ? "[score] / 100" : "No verdicts yet"

      Score: 16px, monospace, #C8A860 | " / 100": 9px, #5C5248

  Progress track: height 5px, bg #1E1A17, border-radius 99px, margin-top 6px, overflow hidden

  Fill: bg #C8A860, width = avgIntegrity + "%", border-radius 99px

  If avgIntegrity === 0: do not render track — only show "No verdicts yet" label

ACTION STRIP (display flex, gap 7px, padding 0 14px 14px):

  isSelf:

    Edit profile: bg #0E1820, border 1px solid #1E3048, border-radius 11px, flex 1, padding 11px 4px, flex-col center, gap 4px

      Icon ✏️ 16px, Label "Edit profile" 10px #7B9EC8

      onClick: setEditSheetOpen(true)

    Invite friends: bg #171412, border 1px solid #242018, same structure

      Icon 🔗 16px, Label "Invite friends" 10px #9A8E84

      onClick: setInviteSheetOpen(true)

  other user:

    Send coins: bg #1C1608, border 1px solid #362810, flex 1, same structure

      Icon 🪙 16px, Label "Send coins" 10px #C8A860

      onClick: open existing coin donation flow with target userId pre-filled

    Add to group: bg #0E1820, border 1px solid #1E3048, flex 1

      Icon ➕ 16px, Label "Add to group" 10px #7B9EC8

      onClick: open existing group invite flow with this user as target

GROUPS SECTION (padding 0 14px 4px):

  Section header: 9px, 700, uppercase, #4A4038, flex row with flex-1 rule (#1A1714) after

  isSelf label: "Your groups" | other label: "Groups"

  Each group row: display flex, align-items center, gap 9px, padding 9px 0, border-bottom 1px solid #1A1714

  Group avatar: 32px, border-radius 9px, bg #1E1A17, first char of group name, font-size 13px, #9A8E84

  Info col flex-1:

    Group name: 12px, 600, #EAE4DC, margin-bottom 3px

    Subtext row: "Rank #[n]" in #5C5248 10px + crew_role pill (if exists)

      Compute rank: position of this user by xp DESC within this group — requires a separate query or pass rank from leaderboard data. If rank unavailable: omit rank.

    For OTHER user only — if group_id in currentUserGroupIds:

      Second subtext line: "you're in this one" pill

        bg #0C1A0A, border 1px solid #203A18, border-radius 99px, font-size 9px, font-weight 600, color #7AB870, padding 1px 7px

        Displayed as its own line below rank row, not inline

  XP: right-aligned, 12px monospace, #9A8E84, format "[n] xp"

  For OTHER user — groups NOT in currentUserGroupIds:

    Row opacity 0.55

    Subtext: "Not in this group" in #3A3230, font-size 10px

    Right: 🔒 font-size 13px, #3A3230 (replaces XP)

    No crew role pill, no rank shown

RECENT BETS SECTION (padding 0 14px 4px, margin-top 12px):

  Section label: "Recent bets"

  Each row: display flex, align-items center, gap 7px, padding 8px 0, border-bottom 1px solid #1A1714

  YES chip: bg #0E1820, border 1px solid #1E3048, border-radius 4px, font-size 9px, font-weight 800, padding 2px 5px, color #7B9EC8, letter-spacing 0.04em, flex-shrink 0

  NO chip: bg #221410, border 1px solid #442820, border-radius 4px, font-size 9px, font-weight 800, padding 2px 5px, color #C47860, flex-shrink 0

  Question: font-size 11px, color #9A8E84, flex 1, overflow hidden, text-overflow ellipsis, white-space nowrap

  Result: use betResult(bet) function — font-size 11px, monospace, font-weight 600, flex-shrink 0, color from result

STREAK HISTORY SECTION (padding 0 14px 4px, margin-top 12px):

  Section label: "Streak history"

  If no settled bets: "No bets settled yet" in #4A4038, font-size 12px

  Flex-wrap row, gap 5px:

    Active streak: bg #1C1608, border 1px solid #362810, border-radius 99px, 10px monospace, color #C8A860, padding 3px 9px, font-weight 600. Text: "🔥 [n]× current"

    Peak (longest broken): same gold colours, opacity 0.6. Text: "[n]× peak"

    Other broken: bg #1A1714, border 1px solid #222018, color #3E3830. Text: "[n]× RIP"

    Order: active first, then by length DESC

---

COMPONENT: src/components/EditProfileSheet.tsx

Props: { open: boolean, onClose: () => void, user: { name, status_text, avatar_color }, onSaved: (updated) => void }

Bottom sheet. Overlay: position fixed, inset 0, bg rgba(0,0,0,0.72), z-index 50.

Sheet: position fixed, bottom 0, left 0, right 0, bg #171412, border-radius 20px 20px 0 0, border-top 1px solid #2A2420, padding 0 16px 28px, max-width 430px, margin 0 auto

Handle: 36px × 4px, bg #2A2420, border-radius 99px, margin 14px auto 18px

Title: "Edit profile" — 15px, 700, #EAE4DC, margin-bottom 3px

Subtitle: "Name and status are visible to everyone in your groups." — 12px, #5C5248, line-height 1.5, margin-bottom 18px

Field: Display name

  Label: 9px, 700, uppercase, letter-spacing 0.07em, #5C5248, margin-bottom 6px

  Input: 100%, bg #1E1A17, border 1px solid #2A2420, border-radius 10px, padding 10px 12px, font-size 13px, #EAE4DC, margin-bottom 14px

  Focus: border-color #4A4038, outline none

Field: Status  

  Same input style. Placeholder: "What's your vibe?" in #4A4038

Field: Avatar colour

  Label: "Avatar colour"

  Swatches: flex row, gap 8px, margin-bottom 20px

  Colours: #7B9EC8, #C47860, #7AB870, #C8A860, #A07FD8, #9A8E84

  Each: 30px circle. Selected: box-shadow 0 0 0 2.5px #100E0C, 0 0 0 4px #EAE4DC

  On select: local state updates, avatar preview at top of sheet updates optimistically

Save button: 100%, bg #7B9EC8, color #0A1420, border-radius 11px, padding 12px, 14px, 700, cursor pointer

  onClick:

    PATCH: supabase.from('users').update({ name, status_text, avatar_color }).eq('id', currentUserId)

    On success: onSaved({ name, status_text, avatar_color }), onClose()

    On error: show error text below button in #C47860, 12px. Do not close sheet.

Dismiss: tap overlay closes sheet (onClose)

---

COMPONENT: src/components/InviteSheet.tsx

Props: { open: boolean, onClose: () => void, userId: string, referralStats: { count: number, coinsEarned: number } }

Same overlay + sheet structure as EditProfileSheet.

referralUrl = "[https://calledit.app/ref/](https://calledit.app/ref/)" + userId

waMessage = "I've been calling it all along 🔮 Join me on Called It — prediction markets for people who actually know each other. " + referralUrl

Title: "Invite friends to Called It"

Subtitle: "When they place their first bet, you earn 50 coins. No group needed — they can join a group after." — 12px, #5C5248, line-height 1.5, margin-bottom 16px

Hero box: bg #1E1A17, border-radius 13px, padding 14px, margin-bottom 16px, text-align center

  "Your referral link" — 14px, 700, #EAE4DC, margin-bottom 4px

  "Anyone who signs up through this link is tracked to you." — 11px, #5C5248, line-height 1.5

Link box: bg #1A1714, border 1px solid #2A2420, border-radius 10px, padding 10px 12px, margin-bottom 14px

  "calledit.app/ref/" in #7B9EC8 + userId in #5C5248 — 10px monospace, word-break break-all

Share buttons (flex row, gap 7px, margin-bottom 14px):

  WhatsApp: bg #091A09, border #183018, label "WhatsApp" #7AB870, icon 💬

    onClick: [window.open](http://window.open)("[https://wa.me/?text=](https://wa.me/?text=)" + encodeURIComponent(waMessage))

  Copy link: label "Copy link" #9A8E84, icon 🔗

    onClick: navigator.clipboard.writeText(referralUrl)

    On success: label → "Copied ✓" in #7AB870, revert after 2000ms

  Share: label "Share" #9A8E84, icon ↗️

    onClick: if (navigator.share) navigator.share({ title: 'Called It', url: referralUrl }) else copy fallback

  Each button: bg #1E1A17, border #2A2420, border-radius 11px, flex 1, padding 10px 4px, flex-col center, gap 5px

Referral stats (text-align center, 10px, #4A4038, line-height 1.6):

  referralStats.count > 0:

    "You've brought in " + count + " people · earned "

    + coinsEarned in #C8A860 monospace

    + " in referral coins"

  count === 0: "Share your link to start earning referral coins"

---

ROUTING: src/App.tsx

  Change route: /profile → /profile/:userId

  Add route: /ref/:userId

    Component: inline redirect — reads userId param, stores in localStorage key 'referralUserId', navigates to "/"

BOTTOM NAV: src/components/BottomNav.tsx

  Profile tab link: navigate("/profile/" + [currentUser.id](http://currentUser.id))

FEED: src/components/FeedCard.tsx

  Avatar element onClick: navigate("/profile/" + event.user_id)

  If event.user_id === currentUserId: navigate to own profile (same route, no special case needed)

BOARD TAB: src/pages/Group.tsx

  Member row onClick: navigate("/profile/" + member.user_id)

---

Do not touch: feed layout, bet sheet, roast composer, judge screen, markets tab, edge functions, notification hooks, Board tab leaderboard data.

Reference the design system tokens shared at the start. Dark backgrounds only. Monospace for all numbers and percentages.