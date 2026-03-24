import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, TrendingUp, TrendingDown, Coins, Trophy, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("name, avatar_color")
        .eq("id", user!.id)
        .single();

      const { data: memberships } = await supabase
        .from("group_members")
        .select("coins, xp, streak, group_id")
        .eq("user_id", user!.id);

      const totalCoins = memberships?.reduce((s, m) => s + m.coins, 0) ?? 0;
      const totalXp = memberships?.reduce((s, m) => s + m.xp, 0) ?? 0;
      const maxStreak = Math.max(0, ...(memberships?.map((m) => m.streak) ?? []));

      return { ...userData, totalCoins, totalXp, maxStreak };
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: record } = useQuery({
    queryKey: ["win-loss", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get user's bets on resolved markets
      const { data: bets } = await supabase
        .from("bets")
        .select("market_id, side, amount")
        .eq("user_id", user!.id);

      if (!bets?.length) return { wins: 0, losses: 0 };

      const marketIds = [...new Set(bets.map((b) => b.market_id))];
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("market_id, verdict, status")
        .in("market_id", marketIds)
        .eq("status", "committed");

      const verdictMap = new Map(verdicts?.map((v) => [v.market_id, v.verdict]) ?? []);
      let wins = 0, losses = 0;
      const seen = new Set<string>();
      for (const b of bets) {
        if (seen.has(b.market_id)) continue;
        seen.add(b.market_id);
        const v = verdictMap.get(b.market_id);
        if (!v) continue;
        if (b.side === v) wins++;
        else losses++;
      }
      return { wins, losses };
    },
  });

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
        {/* Header */}
        <header className="pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-t-0">Profile</h1>
        </header>

        {/* Avatar + name */}
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

        {/* Stats row */}
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

        {/* Win/Loss */}
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

        {/* Transaction history */}
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

        {/* Sign out */}
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
