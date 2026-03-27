Fix event coverage on Feed tab and rebuild Alerts tab with correct notification types.

Touch: src/pages/Group.tsx (feed section and alerts section), src/components/NotificationItem.tsx or equivalent alerts render component.

Do NOT touch: data fetching hooks, Supabase queries, routing, bet sheet, roast composer, Board tab, Markets tab, FeedCard chat bubble structure.

---

PART 1 — Feed tab: ensure all 4 event types render correctly

Events table contains exactly these event_type values:

  bet_placed | roast_sent | market_created | market_settled

Ensure there is an explicit render case for all four in the feed map. No fallthrough to null.

market_settled — add this render case if missing:

  Sender label: "market settled" in muted #5C5248 (no avatar — center-aligned full width label)

  Bubble: bg #1E1A17, border-radius 14px, padding 11px 13px, align center, max-width 100%

  Content:

    Line 1: question text — font-size 13px, font-weight 600, color #EAE4DC, truncated 1 line

    Line 2: verdict pill + outcome text

      YES pill: bg #0E1820, border 1px solid #1E3048, border-radius 5px,

        font-size 12px, font-weight 800, color #7B9EC8, padding 2px 8px

      NO pill: bg #221410, border 1px solid #442820, border-radius 5px,

        font-size 12px, font-weight 800, color #C47860, padding 2px 8px

      After pill: "· verdict is in" in font-size 12px, color #9A8E84, margin-left 6px

  Pull from: event.payload.question, event.payload.verdict

  Do NOT attempt to render winner_ids or coin amounts — they are not in the payload

  No roast button. No fire back. Reactions only (FeedReactions as normal).

  This event is always center-aligned — not left or right. No avatar. Full width bubble.

---

PART 2 — Clean up and rebuild Alerts tab

Before rendering, filter out any notification where type === 'bet_placed' — return null, do not render. These are legacy junk rows.

Alerts tab is a flat list of rows. NOT chat bubbles. Do not use FeedCard or FeedReactions here.

ALERT ROW structure (all types):

  display flex, align-items flex-start, gap 12px, padding 14px 16px

  border-bottom: 1px solid #1A1714

  background: unread → #171412, read → #100E0C

  On tap: mark notification as read (existing handler), then navigate to relevant screen

  Left: icon circle

    36px, border-radius 99px, display flex, align-items center, justify-content center

    font-size 18px (emoji)

  Middle: text block, flex 1, min-width 0

    Title: font-size 14px, font-weight 600, color #EAE4DC, margin-bottom 2px

    Subtitle: font-size 12px, color #5C5248, line-height 1.4

  Right column: display flex, flex-direction column, align-items flex-end, gap 6px, flex-shrink 0

    Timestamp: font-size 10px, font-family monospace, color #3E3830

    Unread dot: 6px circle, bg #7B9EC8, border-radius 99px. Only show if ![notification.read](http://notification.read)

TYPE DEFINITIONS (match notification.type exactly):

'roast_received':

  Icon: bg #1C0906, border 1px solid #38140C, emoji 🔥

  Title: "[payload.from_name] roasted you"

  Subtitle: payload.message truncated to 60 chars

  Action on tap: navigate to group feed

'judge_assigned':

  Icon: bg #0C1A0A, border 1px solid #2A4A20, emoji ⚖️

  Title: "You're the judge"

  Subtitle: payload.question truncated to 60 chars

  Below subtitle: "Give verdict →" inline CTA

    bg #0C1A0A, border 1px solid #2A4A20, border-radius 99px

    padding 4px 10px, font-size 11px, color #7AB870, font-weight 600

    display inline-block, margin-top 6px

    onClick: navigate to judge screen for [payload.market](http://payload.market)_id

'verdict_in':

  Icon: bg #0E1820, border 1px solid #1E3048, emoji 🔮

  Title: "Verdict in · " + verdict pill inline

    YES: color #7B9EC8 | NO: color #C47860 | font-weight 800

  Subtitle: payload.question truncated to 50 chars

  Action: navigate to group feed

'dispute_triggered':

  Icon: bg #1C0906, border 1px solid #38140C, emoji 🚩

  Title: "Verdict disputed"

  Subtitle: payload.question truncated to 50 chars + " · " + payload.flag_count + "/3 flags"

  Action: navigate to re-vote screen for [payload.market](http://payload.market)_id

'dispute_resolved':

  Icon: bg #1A1714, border 1px solid #2A2420, emoji ✅

  Title: "Dispute resolved"

  Subtitle: payload.question truncated to 50 chars

  Action: navigate to group feed

'market_closing_soon':

  Icon: bg #1C1608, border 1px solid #362810, emoji ⏳

  Title: "Closing soon"

  Subtitle: payload.question truncated to 50 chars + " · " + payload.hours_left + "h left"

  Action: navigate to Markets tab

'new_market':

  Icon: bg #0E1820, border 1px solid #1E3048, emoji 📊

  Title: payload.creator_name + " opened a market"

  Subtitle: payload.question truncated to 60 chars

  Action: navigate to Markets tab

'market_about_you':

  Icon: bg #241A30, border 1px solid #382A50, emoji 👀

  Title: "There's a market about you"

  Subtitle: payload.question truncated to 60 chars

  Action: navigate to Markets tab

Any unknown type including 'bet_placed': return null silently.

EMPTY STATE (zero notifications or all filtered out):

  Full screen centered, flex column, align-items center, justify-content center

  Main text: "Nothing here yet" — font-size 14px, font-weight 500, color #5C5248

  Sub text: "Roasts, judge assignments, and verdicts show up here."

    font-size 12px, color #4A4038, margin-top 6px, max-width 220px, text-align center

MARK ALL READ:

  Header right of Alerts screen

  Only visible if unread count > 0

  font-size 12px, color #7B9EC8, padding 4px 8px, cursor pointer

  onClick: existing mark-all-read handler — do not change, do not rewrite

---

PART 3 — Visual separation: Feed vs Alerts must look completely different

Feed: chat thread, bubbles, avatars, time-ordered, social

Alerts: flat notification list, icon circles, no bubbles, no avatars, action-oriented

If any Alerts rows currently use FeedCard, chat bubble styling, or FeedReactions — remove and replace with the row structure above. These are separate UI paradigms and must not share components.

---

Reference the design system tokens shared at the start. Dark backgrounds only. Monospace for all numbers and percentages.