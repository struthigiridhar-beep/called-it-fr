import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Bell, CheckCheck, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const Notifications = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id);

  const typeLabel = (type: string) => {
    switch (type) {
      case "dispute_triggered": return "Dispute triggered";
      case "dispute_resolved": return "Dispute resolved";
      case "judge_assigned": return "Judge assignment";
      case "market_resolved": return "Market resolved";
      default: return type.replace(/_/g, " ");
    }
  };

  return (
    <div ref={ref} className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-safe-top pb-28">
        <header className="pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-t-0 flex-1">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-yes"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </header>

        <div className="space-y-1 mt-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-10 w-10 text-t-2 mb-3" />
              <p className="text-sm text-t-1">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const pl = n.payload as any;
              if (n.type === "roast_received") {
                return (
                  <div
                    key={n.id}
                    className={`rounded-card py-3 px-3 space-y-2 ${
                      !n.read ? "bg-roast-bg border border-roast-border" : "bg-bg-1 border border-b-0"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-roast shrink-0" />
                      <p className="text-sm font-semibold text-t-0 flex-1">
                        {pl?.from_name || "Someone"} roasted you
                      </p>
                      <span className="text-[10px] text-t-2">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {pl?.message && (
                      <p className="text-xs text-roast italic pl-6">"{pl.message}"</p>
                    )}
                    <div className="flex gap-2 pl-6">
                      <button
                        onClick={() => {
                          const params = new URLSearchParams({
                            trigger: "bet_loss",
                            reason: "Roasted you",
                            name: pl?.from_name || "Someone",
                            color: "#7B9EC8",
                          });
                          navigate(`/group/${pl?.group_id}/roast/${pl?.from_user_id}?${params.toString()}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-roast"
                      >
                        <Flame className="h-3 w-3" /> Fire back
                      </button>
                      <button className="text-xs text-t-2 font-medium">Ignore</button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 py-3 px-3 rounded-card ${
                    !n.read ? "bg-bg-1 border border-b-0" : ""
                  }`}
                >
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-yes" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-t-0">{typeLabel(n.type)}</p>
                    <p className="text-xs text-t-2 mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
});

Notifications.displayName = "Notifications";

export default Notifications;
