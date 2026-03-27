import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

function truncate(str: string | undefined, len: number) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

interface AlertConfig {
  iconBg: string;
  iconBorder: string;
  emoji: string;
  title: string;
  subtitle: string;
  action: () => void;
  cta?: { label: string; bg: string; border: string; color: string; onClick: () => void };
}

const Notifications = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id);

  const getConfig = (n: any): AlertConfig | null => {
    const pl = n.payload as any;

    switch (n.type) {
      case "roast_received":
        return {
          iconBg: "#1C0906",
          iconBorder: "#38140C",
          emoji: "🔥",
          title: `${pl?.from_name || "Someone"} roasted you`,
          subtitle: truncate(pl?.message, 60),
          action: () => pl?.group_id && navigate(`/group/${pl.group_id}`),
        };

      case "judge_assigned":
        return {
          iconBg: "#0C1A0A",
          iconBorder: "#2A4A20",
          emoji: "⚖️",
          title: "You're the judge",
          subtitle: truncate(pl?.question, 60),
          action: () => {},
          cta: {
            label: "Give verdict →",
            bg: "#0C1A0A",
            border: "#2A4A20",
            color: "#7AB870",
            onClick: () => pl?.market_id && pl?.group_id && navigate(`/group/${pl.group_id}/judge/${pl.market_id}`),
          },
        };

      case "verdict_in": {
        const isYes = pl?.verdict === "yes";
        return {
          iconBg: "#0E1820",
          iconBorder: "#1E3048",
          emoji: "🔮",
          title: "Verdict in",
          subtitle: truncate(pl?.question, 50),
          action: () => pl?.group_id && navigate(`/group/${pl.group_id}`),
        };
      }

      case "dispute_triggered":
        return {
          iconBg: "#1C0906",
          iconBorder: "#38140C",
          emoji: "🚩",
          title: "Verdict disputed",
          subtitle: truncate(pl?.question, 50) + (pl?.flag_count ? ` · ${pl.flag_count}/3 flags` : ""),
          action: () => pl?.market_id && pl?.group_id && navigate(`/group/${pl.group_id}/dispute/${pl.market_id}`),
        };

      case "dispute_resolved":
        return {
          iconBg: "#1A1714",
          iconBorder: "#2A2420",
          emoji: "✅",
          title: "Dispute resolved",
          subtitle: truncate(pl?.question, 50),
          action: () => pl?.group_id && navigate(`/group/${pl.group_id}`),
        };

      case "market_closing_soon":
        return {
          iconBg: "#1C1608",
          iconBorder: "#362810",
          emoji: "⏳",
          title: "Closing soon",
          subtitle: truncate(pl?.question, 50) + (pl?.hours_left ? ` · ${pl.hours_left}h left` : ""),
          action: () => pl?.group_id && navigate(`/group/${pl.group_id}`),
        };

      case "new_market":
        return {
          iconBg: "#0E1820",
          iconBorder: "#1E3048",
          emoji: "📊",
          title: `${pl?.creator_name || "Someone"} opened a market`,
          subtitle: truncate(pl?.question, 60),
          action: () => pl?.group_id ? navigate(`/group/${pl.group_id}`) : undefined,
        };

      case "market_about_you":
        return {
          iconBg: "#241A30",
          iconBorder: "#382A50",
          emoji: "👀",
          title: "There's a market about you",
          subtitle: truncate(pl?.question, 60),
          action: () => pl?.group_id ? navigate(`/group/${pl.group_id}`) : undefined,
        };

      default:
        return null; // includes 'bet_placed' — silently filtered
    }
  };

  const visibleNotifications = notifications.filter((n) => getConfig(n) !== null);

  return (
    <div ref={ref} className="min-h-[100dvh] flex flex-col" style={{ background: "#100E0C" }}>
      <div className="flex-1 overflow-y-auto pt-safe-top pb-28">
        <header className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1" style={{ color: "#EAE4DC" }}>Alerts</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ fontSize: 12, color: "#7B9EC8", padding: "4px 8px", cursor: "pointer" }}
            >
              Mark all read
            </button>
          )}
        </header>

        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <p style={{ fontSize: 14, fontWeight: 500, color: "#5C5248" }}>Nothing here yet</p>
            <p style={{ fontSize: 12, color: "#4A4038", marginTop: 6, maxWidth: 220, textAlign: "center" }}>
              Roasts, judge assignments, and verdicts show up here.
            </p>
          </div>
        ) : (
          visibleNotifications.map((n) => {
            const config = getConfig(n)!;
            return (
              <button
                key={n.id}
                onClick={() => config.action()}
                className="w-full text-left"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid #1A1714",
                  background: !n.read ? "#171412" : "#100E0C",
                }}
              >
                {/* Icon circle */}
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 99,
                    background: config.iconBg,
                    border: `1px solid ${config.iconBorder}`,
                    fontSize: 18,
                  }}
                >
                  {config.emoji}
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#EAE4DC", marginBottom: 2 }}>
                    {config.title}
                    {n.type === "verdict_in" && (n.payload as any)?.verdict && (
                      <span style={{
                        fontWeight: 800,
                        color: (n.payload as any).verdict === "yes" ? "#7B9EC8" : "#C47860",
                        marginLeft: 6,
                      }}>
                        {((n.payload as any).verdict as string).toUpperCase()}
                      </span>
                    )}
                  </p>
                  <p style={{ fontSize: 12, color: "#5C5248", lineHeight: 1.4 }} className="truncate">
                    {config.subtitle}
                  </p>
                  {config.cta && (
                    <span
                      onClick={(e) => { e.stopPropagation(); config.cta!.onClick(); }}
                      style={{
                        display: "inline-block",
                        marginTop: 6,
                        background: config.cta.bg,
                        border: `1px solid ${config.cta.border}`,
                        borderRadius: 99,
                        padding: "4px 10px",
                        fontSize: 11,
                        color: config.cta.color,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {config.cta.label}
                    </span>
                  )}
                </div>

                {/* Right column */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#3E3830" }}>
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                  </span>
                  {!n.read && (
                    <div style={{ width: 6, height: 6, borderRadius: 99, background: "#7B9EC8" }} />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
});

Notifications.displayName = "Notifications";

export default Notifications;
