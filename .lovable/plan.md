

## Chat-Style Feed Redesign

Rewrite the feed rendering in two files to match the WhatsApp-style chat layout from the screenshot. No data/hook/routing changes.

### Architecture

**FeedCard.tsx** becomes a "bubble renderer" — it returns only the bubble content + sender label + actions row. The outer chat row structure (avatar placement, left/right alignment, timestamp) moves to **Group.tsx**.

FeedCard gets a new prop `isSelf: boolean` and exports helper components.

### File 1: `src/components/FeedCard.tsx`

Complete rewrite. The component returns a fragment with three parts that Group.tsx positions:

**A) `SenderLabel` — rendered above bubble**
- `roast_sent`: `<span style={{color:"#C47860", fontWeight:700}}>{actor}</span> roasted <span style={{color:"#9A8E84", fontWeight:600}}>{target}</span>`
- `bet_placed`: self → "you placed a bet", other → "{name} placed a bet"
- `market_created`: "{name} created a market" + inline NEW pill (`bg:#0E1820`, border `#1E3048`, color `#7B9EC8`, 9px, 800 weight)
- Other types: "{name} {event_type}"
- All in font-size 12px, color `#5C5248`

**B) `Bubble` — the main content**
- **Roast**: `bg:#1C0C08`, border `1px solid #3A1810`, border-radius 14px, padding 12px 14px. Text 15px, `#EAE4DC`, italic, weight 500. Decorative quotes in `#C47860`, 20px, bold.
- **Bet (other)**: `bg:#1E1A17`, border-radius `14px 14px 14px 4px`, padding 11px 13px. YES chip (`bg:#0E1820`, border `#1E3048`, color `#7B9EC8`) or NO chip (`bg:#221410`, border `#442820`, color `#C47860`), 12px bold. Amount monospace `#C8A860` 15px bold. Question 13px `#9A8E84`.
- **Bet (self)**: `bg:#0F1E10`, border `1px solid #1A3020`, border-radius `14px 14px 4px 14px`. Same inner content.
- **Market**: Always left-aligned. `bg:#1E1A17`, border-radius 14px, padding 12px 13px. Question 15px bold `#EAE4DC`. YES/NO buttons in flex row, gap 7px, each flex-1, border-radius 9px, padding 9px. YES: `bg:#0E1820` border `#1E3048` color `#7B9EC8`. NO: `bg:#221410` border `#442820` color `#C47860`. Same onYes/onNo handlers.
- **Other types** (coins_sent, streak, settled, reset): keep current styling but remove outer card wrapper — just the inner content as a bubble with `bg:#1E1A17` border-radius 14px.

**C) `ActionsRow` — below bubble**
- Roast: "🔥 Fire back" pill (left) + reaction chips + add-react (right). Fire back pill: `bg:#1C0906`, border `#38140C`, rounded-full, 12px, `#C47860`, weight 700. Only if isRecipient.
- Bet (others): reactions left + "🔥 Roast" pill right (`ml-auto`). Same roastLink handler.
- Bet (self): reactions only, `justify-end`.
- Market: add-react button only.

**Avatar**: 32px circle, `bg:#272220`, initials 11px bold `#9A8E84`. Remove avatar_color usage — uniform dark avatar.

### File 2: `src/pages/Group.tsx` (feed section, lines 549-599)

**Day separators** (replace lines 568-571):
```
<div className="flex items-center gap-[10px] px-4 py-[10px]">
  <div className="h-px flex-1 bg-[#1E1A17]" />
  <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"#3A3230"}} className="uppercase">
    {dateLabel === "Today" ? "TODAY" : fmtDate(d, "MMM d").toUpperCase()}
  </span>
  <div className="h-px flex-1 bg-[#1E1A17]" />
</div>
```

**Feed container**: Remove `space-y-1`. No outer card wrapper per event (remove the `rounded-card border border-b-0 bg-bg-1 p-3` div). Events sit on page bg.

**Each event row** — Group.tsx builds the chat row:
```
const isSelf = e.user_id === uid;
const isRoast = e.event_type === "roast_sent";
const isMarket = e.event_type === "market_created";
const alignRight = isSelf && !isRoast && !isMarket;
```

Row structure:
- `flex items-end gap-2 px-4 mb-[10px]` + `flex-row-reverse` if alignRight
- Avatar (32px) — `self-end`
- Content column (`flex-1 min-w-0` + `items-end` if alignRight)
  - SenderLabel
  - Bubble
  - ActionsRow with FeedReactions integrated
- Timestamp (`text-[10px] font-mono text-[#3E3830] self-end pb-1`) — formatDistanceToNow or time

**FeedReactions** styling update: reaction chips get `bg:#1A1714`, border `#222018`, rounded-full, 12px, color `#9A8E84`. Count monospace `#5C5248`. Add-react button same bg/border, color `#4A4038`.

### Files touched
- `src/components/FeedCard.tsx` — full rewrite
- `src/pages/Group.tsx` — lines 549-599 (feed section only)
- `src/components/FeedReactions.tsx` — styling only (chip colors)

### Not touched
Data fetching, hooks, Supabase queries, routing, Board tab, Markets tab, bet sheet, roast composer, reaction toggle logic.

