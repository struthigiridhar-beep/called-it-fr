import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, TrendingDown, Coins, Trophy, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { profile, transactions, record, loading } = useProfile(user?.id);

  const txIcon = (type: string) => {
    switch (type) {
      case "payout": return <TrendingUp className="h-4 w-4 text-yes" />;
      case "bet": return <TrendingDown className="h-4 w-4 text-no" />;
      case "bonus": return <Trophy className="h-4 w-4 text-coin" />;
      default: return <Coins className="h-4 w-4 text-t-2" />;
    }
  };

  const txLabel = (type: string) => {
    switch (type) {
      case "payout": return "Payout";
      case "bet": return "Bet placed";
      case "bonus": return "Bonus";
      case "penalty": return "Penalty";
      case "refund": return "Refund";
      default: return type;
    }
  };

  const initials = (profile?.name ?? user?.email ?? "??")
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-safe-top pb-28">
        <header className="pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-t-0">Profile</h1>
        </header>

        <div className="flex items-center gap-4 mt-4">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
            style={{ backgroundColor: profile?.avatar_color ?? "#7B9EC8" }}
          >
            {initials}
          </div>
          <div>
            <p className="text-t-0 font-semibold text-base">{profile?.name ?? "—"}</p>
            <p className="text-xs text-t-2">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="rounded-card bg-bg-1 border border-b-0 px-3 py-3 text-center">
            <div className="text-coin font-bold font-mono-num text-lg">{profile?.totalCoins?.toLocaleString() ?? "—"}</div>
            <div className="text-[10px] text-t-2 mt-0.5">coins</div>
          </div>
          <div className="rounded-card bg-bg-1 border border-b-0 px-3 py-3 text-center">
            <div className="text-t-0 font-bold font-mono-num text-lg">{profile?.totalXp?.toLocaleString() ?? "—"}</div>
            <div className="text-[10px] text-t-2 mt-0.5">total XP</div>
          </div>
          <div className="rounded-card bg-bg-1 border border-b-0 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-4 w-4 text-coin" />
              <span className="text-coin font-bold font-mono-num text-lg">{profile?.maxStreak ?? 0}</span>
            </div>
            <div className="text-[10px] text-t-2 mt-0.5">best streak</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 px-1">
          <span className="text-xs text-t-2">
            <span className="text-yes font-semibold">{record?.wins ?? 0}W</span>
            {" / "}
            <span className="text-no font-semibold">{record?.losses ?? 0}L</span>
          </span>
          {(record?.wins ?? 0) + (record?.losses ?? 0) > 0 && (
            <div className="flex-1 h-2 rounded-full bg-bg-2 overflow-hidden">
              <div
                className="h-full bg-yes rounded-full transition-all"
                style={{ width: `${((record?.wins ?? 0) / ((record?.wins ?? 0) + (record?.losses ?? 0))) * 100}%` }}
              />
            </div>
          )}
        </div>

        <h2 className="text-sm font-semibold text-t-0 mt-8 mb-3">Transaction History</h2>
        <div className="space-y-1">
          {transactions.length === 0 ? (
            <p className="text-xs text-t-2 text-center py-6">No transactions yet.</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-button">
                <div className="h-8 w-8 rounded-full bg-bg-2 flex items-center justify-center shrink-0">
                  {txIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-t-0 font-medium">{txLabel(tx.type)}</p>
                  <p className="text-[10px] text-t-2">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                </div>
                <span className={`text-sm font-mono-num font-semibold ${tx.type === "bet" || tx.type === "penalty" ? "text-no" : "text-yes"}`}>
                  {tx.type === "bet" || tx.type === "penalty" ? "−" : "+"}{tx.amount}
                </span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={signOut}
          className="w-full mt-8 py-3 rounded-button border border-b-1 text-sm text-t-2 active:scale-[0.98] transition-transform"
        >
          Sign out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
