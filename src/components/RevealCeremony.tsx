import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { X, Share2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type CeremonyState = 1 | 2 | 3 | 4;

interface RevealCeremonyProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  groupId: string;
  groupName: string;
  initialState?: CeremonyState;
}

interface BettorRow {
  user_id: string;
  side: "yes" | "no";
  amount: number;
  name: string;
  avatar_color: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function RevealCeremony({
  open,
  onClose,
  marketId,
  groupId,
  groupName,
  initialState = 1,
}: RevealCeremonyProps) {
  const { user } = useAuth();
  const uid = user?.id;
  const [state, setState] = useState<CeremonyState>(initialState);
  const [verdictIncoming, setVerdictIncoming] = useState(false);

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setState(initialState);
      setVerdictIncoming(false);
    }
  }, [open, initialState]);

  // Market data
  const { data: market } = useQuery({
    queryKey: ["reveal-market", marketId],
    enabled: open && !!marketId,
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .single();
      return data;
    },
  });

  // Bets with user info
  const { data: bettors = [] } = useQuery({
    queryKey: ["reveal-bettors", marketId],
    enabled: open && !!marketId,
    queryFn: async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("user_id, side, amount")
        .eq("market_id", marketId);
      if (!bets?.length) return [];

      const userIds = [...new Set(bets.map((b) => b.user_id))];
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_color")
        .in("id", userIds);
      const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

      // Aggregate per user
      const agg = new Map<string, BettorRow>();
      for (const b of bets) {
        const u = userMap.get(b.user_id);
        const key = b.user_id;
        const existing = agg.get(key);
        if (existing) {
          existing.amount += b.amount;
        } else {
          agg.set(key, {
            user_id: b.user_id,
            side: b.side as "yes" | "no",
            amount: b.amount,
            name: u?.name ?? "Anon",
            avatar_color: u?.avatar_color ?? "#7B9EC8",
          });
        }
      }
      return Array.from(agg.values());
    },
  });

  // Verdict (poll every 5s in deliberating state)
  const { data: verdict } = useQuery({
    queryKey: ["reveal-verdict", marketId],
    enabled: open && !!marketId,
    refetchInterval: state === 2 ? 5000 : false,
    queryFn: async () => {
      const { data } = await supabase
        .from("verdicts")
        .select("*")
        .eq("market_id", marketId)
        .order("committed_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  // Judge user info
  const { data: judgeUser } = useQuery({
    queryKey: ["reveal-judge-user", verdict?.judge_id],
    enabled: open && !!verdict?.judge_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("name, avatar_color")
        .eq("id", verdict!.judge_id)
        .single();
      return data;
    },
  });

  // Judge integrity
  const { data: judgeIntegrity } = useQuery({
    queryKey: ["reveal-judge-integrity", groupId, verdict?.judge_id],
    enabled: open && !!groupId && !!verdict?.judge_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("judge_integrity")
        .eq("group_id", groupId)
        .eq("user_id", verdict!.judge_id)
        .single();
      return data;
    },
  });

  // Current user membership for share card stats
  const { data: myMembership } = useQuery({
    queryKey: ["reveal-my-membership", groupId, uid],
    enabled: open && !!groupId && !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("coins, streak")
        .eq("group_id", groupId)
        .eq("user_id", uid!)
        .single();
      return data;
    },
  });

  const { data: myUser } = useQuery({
    queryKey: ["reveal-my-user", uid],
    enabled: open && !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("name").eq("id", uid!).single();
      return data;
    },
  });

  // Auto-advance from deliberating when verdict committed
  useEffect(() => {
    if (state === 2 && verdict?.status === "committed" && !verdictIncoming) {
      setVerdictIncoming(true);
      const timer = setTimeout(() => {
        setState(3);
        setVerdictIncoming(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [state, verdict?.status, verdictIncoming]);

  // Payout calculations
  const payouts = useMemo(() => {
    if (!verdict?.verdict || !market) return [];
    const winningSide = verdict.verdict as "yes" | "no";
    const totalPool = market.yes_pool + market.no_pool;
    const winningPool = winningSide === "yes" ? market.yes_pool : market.no_pool;

    return bettors.map((b) => {
      const isWinner = b.side === winningSide;
      const coins = isWinner
        ? Math.round((b.amount / (winningPool || 1)) * totalPool) - b.amount
        : -b.amount;
      return { ...b, coins, isWinner };
    });
  }, [bettors, verdict?.verdict, market]);

  // My payout for share card
  const myPayout = payouts.find((p) => p.user_id === uid);
  const integrityPct = Math.round(Number(judgeIntegrity?.judge_integrity ?? 1) * 100);
  const judgeName = judgeUser?.name ?? "Judge";
  const totalPool = market ? market.yes_pool + market.no_pool : 0;
  const yesPct = totalPool > 0 && market ? Math.round((market.yes_pool / totalPool) * 100) : 50;

  if (!open) return null;

  const handleShare = async () => {
    const text = `${market?.question}\nVerdict: ${verdict?.verdict?.toUpperCase()}\n${groupName} · called-it`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-0 animate-fade-in flex flex-col">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-bg-2 flex items-center justify-center text-t-2 hover:text-t-0"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2">
        {([1, 2, 3, 4] as const).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === state ? "w-6 bg-t-0" : "w-1.5 bg-t-2/30"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* ─── State 1: Market Locked ─── */}
        {state === 1 && (
          <div className="flex flex-col items-center pt-8 space-y-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
              Betting closed
            </span>
            <h1 className="text-2xl font-bold text-t-0 text-center">All bets are in.</h1>
            <p className="text-sm text-t-1 italic text-center max-w-xs">
              "{market?.question}"
            </p>

            {/* Floating avatars */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-6">
              {bettors.map((b, i) => (
                <div
                  key={b.user_id}
                  className="flex flex-col items-center gap-1.5 ceremony-bob"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ceremony-border-pulse"
                    style={{
                      backgroundColor: b.avatar_color + "22",
                      borderWidth: 2,
                      borderColor: b.avatar_color,
                      color: b.avatar_color,
                    }}
                  >
                    {getInitials(b.name)}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      b.side === "yes" ? "text-yes" : "text-no"
                    }`}
                  >
                    {b.side}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setState(2)}
              className="w-full max-w-xs h-12 rounded-button bg-coin-bg border border-coin-border text-coin font-semibold text-sm active:scale-[0.97] transition-all"
            >
              Judge is deliberating →
            </button>
          </div>
        )}

        {/* ─── State 2: Deliberating ─── */}
        {state === 2 && (
          <div className="flex flex-col items-center pt-12 space-y-6">
            {/* Judge avatar with rings */}
            <div className="relative h-24 w-24 flex items-center justify-center">
              <div className="ceremony-ring absolute inset-0 rounded-full border-2 border-coin" />
              <div
                className="ceremony-ring absolute inset-0 rounded-full border-2 border-coin"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: (judgeUser?.avatar_color ?? "#7B9EC8") + "22",
                  borderWidth: 2,
                  borderColor: judgeUser?.avatar_color ?? "#7B9EC8",
                  color: judgeUser?.avatar_color ?? "#7B9EC8",
                }}
              >
                {getInitials(judgeName)}
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold text-t-0">The judge knows.</h1>
              <p className="text-sm text-t-1">Everyone waits.</p>
            </div>

            <div className="rounded-card border border-b-0 bg-bg-1 p-4 w-full max-w-xs space-y-1">
              <p className="text-sm text-t-0 font-semibold">{judgeName}</p>
              <p className="text-xs text-t-2">
                Integrity {integrityPct}% · {verdictIncoming ? "verdict incoming" : "not yet committed"}
              </p>
            </div>

            {verdictIncoming && (
              <div className="rounded-card bg-coin-bg border border-coin-border p-4 w-full max-w-xs text-center animate-fade-in">
                <p className="text-sm font-semibold text-coin">
                  Verdict coming in<span className="ceremony-dots" />
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── State 3: Verdict ─── */}
        {state === 3 && verdict?.verdict && (
          <div className="flex flex-col items-center pt-8 space-y-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
              Verdict
            </span>
            <hr className="w-12 border-t border-b-1" />

            <p
              className={`text-[72px] font-bold font-mono-num leading-none ${
                verdict.verdict === "yes" ? "text-yes" : "text-no"
              }`}
            >
              {verdict.verdict.toUpperCase()}
            </p>

            <p className="text-xs text-t-2">
              called by {judgeName} · integrity {integrityPct}%
            </p>

            <p className="text-sm text-t-1 italic text-center max-w-xs">
              "{market?.question}"
            </p>

            {/* Coin flow rows */}
            <div className="w-full max-w-xs space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                Coin flow
              </p>
              {payouts.map((p) => (
                <div
                  key={p.user_id}
                  className="flex items-center gap-3 rounded-card bg-bg-1 border border-b-0 p-3"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: p.avatar_color + "22",
                      borderWidth: 1.5,
                      borderColor: p.avatar_color,
                      color: p.avatar_color,
                    }}
                  >
                    {getInitials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-t-0 truncate">{p.name}</p>
                    <p className="text-[10px] text-t-2 uppercase">{p.side}</p>
                  </div>
                  <span
                    className={`font-mono-num text-sm font-bold ${
                      p.isWinner ? "text-yes" : "text-no"
                    }`}
                  >
                    {p.coins > 0 ? "+" : ""}{p.coins} c
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setState(4)}
              className="w-full max-w-xs h-12 rounded-button bg-yes text-white font-semibold text-sm active:scale-[0.97] transition-all"
            >
              See your result card →
            </button>
          </div>
        )}

        {/* ─── State 4: Share Card ─── */}
        {state === 4 && verdict?.verdict && (
          <div className="flex flex-col items-center pt-8 space-y-6">
            {/* Card */}
            <div className="w-full max-w-xs rounded-card bg-bg-1 overflow-hidden">
              {/* Accent line */}
              <div
                className={`h-0.5 ${
                  verdict.verdict === "yes" ? "bg-yes" : "bg-no"
                }`}
              />
              <div className="p-5 space-y-4">
                {/* Group + date */}
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-t-2">
                  <span>{groupName}</span>
                  <span>{format(new Date(), "MMM d, yyyy")}</span>
                </div>

                {/* Question */}
                <p className="text-sm font-semibold text-t-0 leading-snug">
                  {market?.question}
                </p>

                {/* Large verdict */}
                <p
                  className={`text-5xl font-bold font-mono-num text-center ${
                    verdict.verdict === "yes" ? "text-yes" : "text-no"
                  }`}
                >
                  {verdict.verdict.toUpperCase()}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold font-mono-num text-coin">
                      {myPayout ? (myPayout.coins > 0 ? `+${myPayout.coins}` : myPayout.coins) : "0"}
                    </p>
                    <p className="text-[10px] text-t-2 uppercase">Coins</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono-num text-coin">
                      {myMembership?.streak ?? 0}
                    </p>
                    <p className="text-[10px] text-t-2 uppercase">Streak</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono-num text-coin">
                      {yesPct}%
                    </p>
                    <p className="text-[10px] text-t-2 uppercase">Odds</p>
                  </div>
                </div>

                {/* Handle */}
                <p className="text-xs text-t-2 font-mono-num text-center">
                  called-it · @{myUser?.name ?? "you"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 w-full max-w-xs">
              <button
                onClick={handleShare}
                className="flex-1 h-12 rounded-button bg-yes text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              >
                <Share2 className="h-4 w-4" />
                Share result
              </button>
              <button
                onClick={onClose}
                className="h-12 w-12 rounded-button bg-bg-2 border border-b-0 flex items-center justify-center text-t-2 hover:text-t-0 active:scale-[0.97] transition-all"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
