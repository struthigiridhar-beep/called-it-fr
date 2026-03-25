import type { FeedEvent, FeedUser } from "@/hooks/useGroupFeed";
import { Coins, CheckCircle, Flame } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface FeedCardProps {
  event: FeedEvent;
  users: Map<string, FeedUser>;
  onYes?: (marketId: string) => void;
  onNo?: (marketId: string) => void;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function UserAvatar({ user, size = "h-8 w-8 text-xs" }: { user: FeedUser | undefined; size?: string }) {
  if (!user) return <div className={`${size} rounded-full bg-bg-3 shrink-0`} />;
  return (
    <div
      className={`${size} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: user.avatar_color }}
    >
      {getInitials(user.name)}
    </div>
  );
}

export default function FeedCard({ event, users, onYes, onNo }: FeedCardProps) {
  const { event_type, payload, user_id } = event;
  const p = payload as any;
  const actor = users.get(user_id);
  const actorName = actor?.name ?? "Someone";
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const { user: currentUser } = useAuth();

  const roastLink = (targetId: string, targetUser: FeedUser | undefined, triggerType: string, reason: string) => {
    const params = new URLSearchParams({
      trigger: triggerType,
      reason,
      name: targetUser?.name || "Someone",
      color: targetUser?.avatar_color || "#7B9EC8",
    });
    navigate(`/group/${groupId}/roast/${targetId}?${params.toString()}`);
  };

  switch (event_type) {
    case "bet_placed": {
      const side = p.side as string;
      const amount = p.amount as number;
      const question = p.question as string;
      return (
        <div className="flex gap-3">
          <UserAvatar user={actor} />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm text-t-1">
              <span className="font-semibold text-t-0">{actorName}</span> placed a bet
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-bold ${
                  side === "yes"
                    ? "bg-yes-bg border border-yes-border text-yes"
                    : "bg-no-bg border border-no-border text-no"
                }`}
              >
                {side.toUpperCase()}
              </span>
              <span className="font-mono-num text-xs text-coin font-semibold">{amount} c</span>
            </div>
            {question && <p className="text-xs text-t-2 leading-snug">"{question}"</p>}
          </div>
        </div>
      );
    }

    case "coins_sent": {
      const toUser = users.get(p.to_user_id);
      const toName = toUser?.name ?? "Someone";
      return (
        <div className="flex gap-3">
          <UserAvatar user={actor} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm text-t-1">
              <span className="font-semibold text-t-0">{actorName}</span> sent coins to{" "}
              <span className="font-semibold text-t-0">{toName}</span>
            </p>
            <div className="flex items-center gap-2 rounded-card bg-bg-2 border border-b-0 p-2">
              <UserAvatar user={actor} size="h-6 w-6 text-[10px]" />
              <span className="text-t-2 text-xs">→</span>
              <UserAvatar user={toUser} size="h-6 w-6 text-[10px]" />
              <span className="font-mono-num text-sm font-bold text-coin ml-auto">{p.amount} c</span>
            </div>
            {p.message && <p className="text-xs text-t-2 italic">"{p.message}"</p>}
          </div>
        </div>
      );
    }

    case "roast_sent": {
      const toUser = users.get(p.to_user_id);
      const toName = toUser?.name ?? "Someone";
      const isRecipient = currentUser?.id === p.to_user_id;
      return (
        <div className="flex gap-3">
          <UserAvatar user={actor} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm text-t-1">
              <span className="font-semibold text-t-0">{actorName}</span> roasted{" "}
              <span className="font-semibold text-t-0">{toName}</span>
            </p>
            <div className="rounded-card bg-roast-bg border border-roast-border p-3">
              <p className="text-sm text-roast italic">"{p.message}"</p>
            </div>
            <div className="flex gap-2">
              {p.has_reply && (
                <button className="text-xs text-yes font-semibold">replied ↗</button>
              )}
              {isRecipient && (
                <button
                  onClick={() => roastLink(user_id, actor, "bet_loss", `Roasted you`)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-roast"
                >
                  <Flame className="h-3 w-3" /> Fire back
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "market_created": {
      const question = p.question as string;
      const marketId = p.market_id as string;
      return (
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yes bg-yes-bg border border-yes-border">
            New Market
          </span>
          <div className="rounded-card border border-b-0 bg-bg-1 p-3 space-y-2.5">
            <p className="text-[15px] font-semibold text-t-0 leading-snug">{question}</p>
            {onYes && onNo && marketId && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onYes(marketId)}
                  className="h-9 rounded-button text-sm font-semibold bg-yes-bg border border-yes-border text-yes active:scale-[0.97] transition-all"
                >
                  YES
                </button>
                <button
                  onClick={() => onNo(marketId)}
                  className="h-9 rounded-button text-sm font-semibold bg-no-bg border border-no-border text-no active:scale-[0.97] transition-all"
                >
                  NO
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "streak_milestone": {
      const streakCount = p.streak as number;
      return (
        <div className="flex gap-3">
          <UserAvatar user={actor} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm text-t-1">
              <span className="font-semibold text-t-0">{actorName}</span> hit a win streak
            </p>
            <div className="rounded-card bg-coin-bg border border-coin-border p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-coin">{streakCount}× Win streak</p>
                <p className="text-[10px] text-coin/70">highest in group</p>
              </div>
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>
      );
    }

    case "market_settled": {
      const verdict = p.verdict as string;
      const question = p.question as string;
      const payouts = (p.payouts ?? []) as { user_id: string; amount: number }[];
      return (
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-full bg-success-bg border border-success-border flex items-center justify-center shrink-0">
            <CheckCircle className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-semibold text-success">Market settled</p>
            {question && <p className="text-xs text-t-1 leading-snug">"{question}"</p>}
            <span
              className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-bold ${
                verdict === "yes"
                  ? "bg-yes-bg border border-yes-border text-yes"
                  : "bg-no-bg border border-no-border text-no"
              }`}
            >
              {verdict?.toUpperCase()}
            </span>
            {payouts.length > 0 && (
              <div className="space-y-1 pt-1">
                {payouts.map((po, i) => {
                  const u = users.get(po.user_id);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <UserAvatar user={u} size="h-5 w-5 text-[8px]" />
                      <span className="text-t-1 truncate">{u?.name ?? "User"}</span>
                      <span className="font-mono-num text-coin font-semibold ml-auto">+{po.amount} c</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    case "coins_reset":
      return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-card bg-bg-1 border border-b-0">
          <Coins className="h-4 w-4 text-coin shrink-0" />
          <p className="text-xs text-t-2">New week · everyone starts with <span className="font-mono-num text-coin font-semibold">500</span> c</p>
        </div>
      );

    default:
      return (
        <div className="flex gap-3">
          <UserAvatar user={actor} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-t-1">
              <span className="font-semibold text-t-0">{actorName}</span>{" "}
              {event_type.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      );
  }
}
