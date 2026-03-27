import type { FeedEvent, FeedUser } from "@/hooks/useGroupFeed";
import { Coins, CheckCircle, Flame } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface FeedCardProps {
  event: FeedEvent;
  users: Map<string, FeedUser>;
  isSelf: boolean;
  onYes?: (marketId: string) => void;
  onNo?: (marketId: string) => void;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function ChatAvatar({ user }: { user: FeedUser | undefined }) {
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center font-bold shrink-0 self-end"
      style={{ backgroundColor: "#272220", color: "#9A8E84", fontSize: 11 }}
    >
      {user ? getInitials(user.name) : "??"}
    </div>
  );
}

export function SenderLabel({ event, users, isSelf }: { event: FeedEvent; users: Map<string, FeedUser>; isSelf: boolean }) {
  const actor = users.get(event.user_id);
  const actorName = actor?.name ?? "Someone";
  const p = event.payload as any;

  const baseStyle: React.CSSProperties = { fontSize: 12, color: "#5C5248", paddingBottom: 4 };

  switch (event.event_type) {
    case "roast_sent": {
      const toUser = users.get(p.to_user_id);
      return (
        <div style={baseStyle}>
          <span style={{ color: "#C47860", fontWeight: 700 }}>{actorName}</span>
          {" roasted "}
          <span style={{ color: "#9A8E84", fontWeight: 600 }}>{toUser?.name ?? "Someone"}</span>
        </div>
      );
    }
    case "bet_placed":
      return (
        <div style={baseStyle}>
          {isSelf ? "you placed a bet" : `${actorName} placed a bet`}
        </div>
      );
    case "market_created":
      return (
        <div style={{ ...baseStyle, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{actorName} created a market</span>
          <span
            style={{
              background: "#0E1820",
              border: "1px solid #1E3048",
              borderRadius: 99,
              padding: "1px 7px",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#7B9EC8",
            }}
          >
            NEW
          </span>
        </div>
      );
    case "coins_sent":
      return <div style={baseStyle}>{isSelf ? "you sent coins" : `${actorName} sent coins`}</div>;
    case "market_settled":
      return <div style={baseStyle}>Market settled</div>;
    case "streak_milestone":
      return <div style={baseStyle}>{isSelf ? "you hit a streak" : `${actorName} hit a streak`}</div>;
    case "coins_reset":
      return <div style={baseStyle}>Weekly reset</div>;
    default:
      return <div style={baseStyle}>{actorName} {event.event_type.replace(/_/g, " ")}</div>;
  }
}

export function Bubble({ event, users, isSelf, onYes, onNo }: FeedCardProps) {
  const p = event.payload as any;

  switch (event.event_type) {
    case "roast_sent":
      return (
        <div
          style={{
            background: "#1C0C08",
            border: "1px solid #3A1810",
            borderRadius: 14,
            padding: "12px 14px",
          }}
        >
          <p style={{ fontSize: 15, color: "#EAE4DC", fontStyle: "italic", lineHeight: 1.5, fontWeight: 500 }}>
            <span style={{ color: "#C47860", fontSize: 20, fontWeight: 700, verticalAlign: "-0.1em", marginRight: 1 }}>"</span>
            {p.message}
            <span style={{ color: "#C47860", fontSize: 20, fontWeight: 700, verticalAlign: "-0.1em", marginLeft: 1 }}>"</span>
          </p>
        </div>
      );

    case "bet_placed": {
      const side = p.side as string;
      const amount = p.amount as number;
      const question = p.question as string;
      const isYes = side === "yes";
      return (
        <div
          style={{
            background: isSelf ? "#0F1E10" : "#1E1A17",
            border: isSelf ? "1px solid #1A3020" : "none",
            borderRadius: isSelf ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
            padding: "11px 13px",
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              style={{
                background: isYes ? "#0E1820" : "#221410",
                border: `1px solid ${isYes ? "#1E3048" : "#442820"}`,
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 800,
                padding: "3px 8px",
                color: isYes ? "#7B9EC8" : "#C47860",
                letterSpacing: "0.04em",
              }}
            >
              {side.toUpperCase()}
            </span>
            <span style={{ fontSize: 15, fontFamily: "monospace", color: "#C8A860", fontWeight: 700, marginLeft: 6 }}>
              {amount} c
            </span>
          </div>
          {question && (
            <p style={{ fontSize: 13, color: "#9A8E84", marginTop: 4, lineHeight: 1.35 }}>{question}</p>
          )}
        </div>
      );
    }

    case "market_created": {
      const question = p.question as string;
      const marketId = p.market_id as string;
      return (
        <div
          style={{
            background: "#1E1A17",
            borderRadius: 14,
            padding: "12px 13px",
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: "#EAE4DC", marginBottom: 10, lineHeight: 1.3, letterSpacing: -0.2 }}>
            {question}
          </p>
          {onYes && onNo && marketId && (
            <div className="flex gap-[7px]">
              <button
                onClick={() => onYes(marketId)}
                className="flex-1 active:scale-[0.97] transition-all"
                style={{
                  background: "#0E1820",
                  border: "1px solid #1E3048",
                  borderRadius: 9,
                  padding: 9,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#7B9EC8",
                  textAlign: "center",
                }}
              >
                YES
              </button>
              <button
                onClick={() => onNo(marketId)}
                className="flex-1 active:scale-[0.97] transition-all"
                style={{
                  background: "#221410",
                  border: "1px solid #442820",
                  borderRadius: 9,
                  padding: 9,
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#C47860",
                  textAlign: "center",
                }}
              >
                NO
              </button>
            </div>
          )}
        </div>
      );
    }

    case "coins_sent": {
      const toUser = users.get(p.to_user_id);
      const actor = users.get(event.user_id);
      return (
        <div style={{ background: "#1E1A17", borderRadius: 14, padding: "11px 13px" }}>
          <div className="flex items-center gap-2">
            <ChatAvatar user={actor} />
            <span style={{ color: "#5C5248", fontSize: 12 }}>→</span>
            <ChatAvatar user={toUser} />
            <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "#C8A860", marginLeft: "auto" }}>
              {p.amount} c
            </span>
          </div>
          {p.message && <p style={{ fontSize: 13, color: "#9A8E84", fontStyle: "italic", marginTop: 6 }}>"{p.message}"</p>}
        </div>
      );
    }

    case "streak_milestone": {
      const streakCount = p.streak as number;
      return (
        <div style={{ background: "#1E1A17", borderRadius: 14, padding: "11px 13px" }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#C8A860" }}>{streakCount}× Win streak</p>
              <p style={{ fontSize: 10, color: "#C8A860", opacity: 0.7 }}>highest in group</p>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
        </div>
      );
    }

    case "market_settled": {
      const verdict = p.verdict as string;
      const question = p.question as string;
      const payouts = (p.payouts ?? []) as { user_id: string; amount: number }[];
      const isYes = verdict === "yes";
      return (
        <div style={{ background: "#1E1A17", borderRadius: 14, padding: "11px 13px" }}>
          {question && <p style={{ fontSize: 13, color: "#9A8E84", marginBottom: 6, lineHeight: 1.35 }}>"{question}"</p>}
          <span
            style={{
              display: "inline-flex",
              background: isYes ? "#0E1820" : "#221410",
              border: `1px solid ${isYes ? "#1E3048" : "#442820"}`,
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 800,
              padding: "3px 8px",
              color: isYes ? "#7B9EC8" : "#C47860",
            }}
          >
            {verdict?.toUpperCase()}
          </span>
          {payouts.length > 0 && (
            <div className="space-y-1 pt-2">
              {payouts.map((po, i) => {
                const u = users.get(po.user_id);
                return (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    <div
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#272220", color: "#9A8E84", fontSize: 8, fontWeight: 700 }}
                    >
                      {u ? getInitials(u.name) : "??"}
                    </div>
                    <span style={{ color: "#9A8E84" }} className="truncate">{u?.name ?? "User"}</span>
                    <span style={{ fontFamily: "monospace", color: "#C8A860", fontWeight: 600, marginLeft: "auto" }}>+{po.amount} c</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    case "coins_reset":
      return (
        <div style={{ background: "#1E1A17", borderRadius: 14, padding: "11px 13px" }} className="flex items-center gap-2">
          <Coins className="h-4 w-4 shrink-0" style={{ color: "#C8A860" }} />
          <p style={{ fontSize: 12, color: "#9A8E84" }}>
            New week · everyone starts with <span style={{ fontFamily: "monospace", color: "#C8A860", fontWeight: 600 }}>500</span> c
          </p>
        </div>
      );

    default:
      return (
        <div style={{ background: "#1E1A17", borderRadius: 14, padding: "11px 13px" }}>
          <p style={{ fontSize: 13, color: "#9A8E84" }}>{event.event_type.replace(/_/g, " ")}</p>
        </div>
      );
  }
}

export function ActionsRow({
  event,
  users,
  isSelf,
  children,
}: {
  event: FeedEvent;
  users: Map<string, FeedUser>;
  isSelf: boolean;
  children?: React.ReactNode; // FeedReactions slot
}) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const p = event.payload as any;

  const roastLink = (targetId: string, targetUser: FeedUser | undefined, triggerType: string, reason: string) => {
    const params = new URLSearchParams({
      trigger: triggerType,
      reason,
      name: targetUser?.name || "Someone",
      color: targetUser?.avatar_color || "#7B9EC8",
    });
    navigate(`/group/${groupId}/roast/${targetId}?${params.toString()}`);
  };

  const pillStyle: React.CSSProperties = {
    background: "#1C0906",
    border: "1px solid #38140C",
    borderRadius: 99,
    padding: "4px 10px",
    fontSize: 12,
    color: "#C47860",
    fontWeight: 600,
    cursor: "pointer",
  };

  switch (event.event_type) {
    case "roast_sent": {
      const isRecipient = currentUser?.id === p.to_user_id;
      const actor = users.get(event.user_id);
      return (
        <div className="flex items-center gap-1.5 pt-[5px] flex-wrap">
          {isRecipient && (
            <button
              onClick={() => roastLink(event.user_id, actor, "bet_loss", "Roasted you")}
              style={{ ...pillStyle, fontWeight: 700 }}
            >
              🔥 Fire back
            </button>
          )}
          <div className="flex-1" />
          {children}
        </div>
      );
    }

    case "bet_placed": {
      const actor = users.get(event.user_id);
      const isNotSelf = currentUser?.id !== event.user_id;
      return (
        <div className="flex items-center gap-1.5 pt-[5px] flex-wrap" style={isSelf ? { justifyContent: "flex-end" } : {}}>
          {children}
          {isNotSelf && (
            <button
              onClick={() => roastLink(event.user_id, actor, "bet_loss", `Bold bet: ${(p.side as string).toUpperCase()} on "${p.question}"`)}
              style={{ ...pillStyle, marginLeft: "auto" }}
            >
              🔥 Roast
            </button>
          )}
        </div>
      );
    }

    case "market_settled": {
      const question = p.question as string;
      const payouts = (p.payouts ?? []) as { user_id: string; amount: number }[];
      return (
        <div className="flex items-center gap-1.5 pt-[5px] flex-wrap">
          {children}
          <button
            onClick={() => {
              const targetId = payouts.find(po => po.user_id !== currentUser?.id)?.user_id
                ?? Array.from(users.entries()).find(([id]) => id !== currentUser?.id)?.[0];
              if (targetId) {
                const targetUser = users.get(targetId);
                roastLink(targetId, targetUser, "bet_loss", `Lost on "${question}"`);
              }
            }}
            style={{ ...pillStyle, marginLeft: "auto" }}
          >
            🔥 Roast a loser
          </button>
        </div>
      );
    }

    default:
      if (!children) return null;
      return (
        <div className="flex items-center gap-1.5 pt-[5px] flex-wrap" style={isSelf ? { justifyContent: "flex-end" } : {}}>
          {children}
        </div>
      );
  }
}

// Default export kept for backward compat but not used in new layout
export default function FeedCard({ event, users, onYes, onNo }: Omit<FeedCardProps, "isSelf">) {
  return <Bubble event={event} users={users} isSelf={false} onYes={onYes} onNo={onNo} />;
}
