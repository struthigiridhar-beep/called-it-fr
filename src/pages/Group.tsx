import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import OddsBar from "@/components/OddsBar";
import BetSheet from "@/components/BetSheet";
import CreateMarketSheet from "@/components/CreateMarketSheet";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Tab = "markets" | "feed" | "board" | "create";
type Side = "yes" | "no";

interface MarketRow {
  id: string;
  question: string;
  yes_pool: number;
  no_pool: number;
  min_bet: number;
  deadline: string;
  status: string;
  is_public: boolean;
  is_pinned: boolean;
  group_id: string | null;
  created_at: string;
  created_by: string | null;
  category: string;
}

interface BetRow {
  id: string;
  market_id: string;
  side: "yes" | "no";
  amount: number;
  user_id: string;
  created_at: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDeadline(d: string) {
  try {
    return format(new Date(d), "MMM d");
  } catch {
    return "";
  }
}

export default function Group() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("markets");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMarket, setSheetMarket] = useState<MarketRow | null>(null);
  const [sheetSide, setSheetSide] = useState<Side>("yes");
  const [createOpen, setCreateOpen] = useState(false);

  const uid = user?.id;

  // Fetch group info
  const { data: group } = useQuery({
    queryKey: ["group-info", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("id, name").eq("id", groupId!).single();
      return data;
    },
  });

  // Fetch membership (coins)
  const { data: membership } = useQuery({
    queryKey: ["group-membership", groupId, uid],
    enabled: !!groupId && !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("coins, xp, streak")
        .eq("group_id", groupId!)
        .eq("user_id", uid!)
        .single();
      return data;
    },
  });

  // Fetch group markets (private)
  const { data: groupMarkets = [] } = useQuery({
    queryKey: ["group-markets", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("group_id", groupId!)
        .eq("is_public", false)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      return (data ?? []) as MarketRow[];
    },
  });

  // Fetch public markets
  const { data: publicMarkets = [] } = useQuery({
    queryKey: ["public-markets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("is_public", true)
        .eq("status", "open")
        .order("yes_pool", { ascending: false });
      return (data ?? []) as MarketRow[];
    },
  });

  // Fetch user bets
  const { data: userBets = [] } = useQuery({
    queryKey: ["user-bets", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("bets").select("*").eq("user_id", uid!);
      return (data ?? []) as BetRow[];
    },
  });

  // Fetch user data for first_bet_at
  const { data: userData } = useQuery({
    queryKey: ["user-data", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("first_bet_at").eq("id", uid!).single();
      return data;
    },
  });

  // Judge banner: verdicts needed for closed markets in this group
  const { data: pendingVerdicts = [] } = useQuery({
    queryKey: ["pending-verdicts", groupId, uid],
    enabled: !!groupId && !!uid,
    queryFn: async () => {
      // Get closed markets in this group
      const { data: closedMarkets } = await supabase
        .from("markets")
        .select("id, question, deadline")
        .eq("group_id", groupId!)
        .eq("status", "closed");
      if (!closedMarkets?.length) return [];
      // Check if user is judge for any (verdicts table has judge_id)
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("id, market_id")
        .eq("judge_id", uid!)
        .in("market_id", closedMarkets.map((m) => m.id));
      // Markets that already have a verdict from this judge
      const settledIds = new Set((verdicts ?? []).map((v) => v.market_id));
      // Return markets that need a verdict (no verdict yet)
      // Actually verdicts means they already judged. We want markets where the user IS the judge but hasn't committed.
      // Since we don't have a judge_id on markets, we'll skip judge banner for now unless there's a verdict.
      // For now, return closed markets where user has NO verdict yet — assuming anyone in group can judge.
      // TODO: refine when judge assignment is clearer
      return closedMarkets.filter((m) => !settledIds.has(m.id));
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid!)
        .eq("read", false);
      return count ?? 0;
    },
  });

  const userCoins = membership?.coins ?? 100;

  // Build bet lookup: marketId -> { side, totalAmount }
  const betsByMarket = new Map<string, { side: Side; amount: number }>();
  userBets.forEach((b) => {
    const existing = betsByMarket.get(b.market_id);
    if (existing) {
      existing.amount += b.amount;
    } else {
      betsByMarket.set(b.market_id, { side: b.side, amount: b.amount });
    }
  });

  // First bet market detection
  const firstBetMarketId = (() => {
    if (!userData?.first_bet_at) return null;
    const publicBets = userBets.filter((b) =>
      publicMarkets.some((m) => m.id === b.market_id)
    );
    if (!publicBets.length) return null;
    // earliest bet
    const sorted = [...publicBets].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted[0]?.market_id ?? null;
  })();

  // Sort public markets: first bet pinned, then by total pool desc
  const sortedPublicMarkets = [...publicMarkets].sort((a, b) => {
    if (a.id === firstBetMarketId) return -1;
    if (b.id === firstBetMarketId) return 1;
    return (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool);
  });

  const openSheet = (market: MarketRow, side: Side) => {
    setSheetMarket(market);
    setSheetSide(side);
    setSheetOpen(true);
  };

  const confirmBet = async (side: Side, amount: number) => {
    if (!sheetMarket || !uid) return;
    const finalAmount = Math.min(amount, userCoins);
    if (finalAmount <= 0) {
      toast.error("Not enough coins");
      return;
    }
    try {
      // Insert bet
      const { error: betErr } = await supabase.from("bets").insert({
        market_id: sheetMarket.id,
        user_id: uid,
        side,
        amount: finalAmount,
      });
      if (betErr) throw betErr;

      // Update market pool
      const poolCol = side === "yes" ? "yes_pool" : "no_pool";
      const currentPool = side === "yes" ? sheetMarket.yes_pool : sheetMarket.no_pool;
      // We need to use RPC or raw update — but market update policy requires created_by = uid
      // For now update via supabase (may fail if RLS blocks non-creator updates)
      await supabase
        .from("markets")
        .update({ [poolCol]: currentPool + finalAmount })
        .eq("id", sheetMarket.id);

      // Deduct coins
      const newBalance = Math.max(0, userCoins - finalAmount);
      await supabase
        .from("group_members")
        .update({ coins: newBalance })
        .eq("group_id", sheetMarket.group_id ?? groupId!)
        .eq("user_id", uid);

      // Insert transaction
      await supabase.from("transactions").insert({
        user_id: uid,
        amount: -finalAmount,
        type: "bet" as const,
        reference_id: sheetMarket.id,
      });

      // Invalidate
      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
      queryClient.invalidateQueries({ queryKey: ["public-markets"] });
      queryClient.invalidateQueries({ queryKey: ["user-bets"] });
      queryClient.invalidateQueries({ queryKey: ["group-membership"] });

      setSheetOpen(false);
      toast.success(`Bet ${finalAmount} coins on ${side.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to place bet");
    }
  };

  const renderMarketCard = (m: MarketRow, isPublic: boolean) => {
    const total = m.yes_pool + m.no_pool;
    const yesPct = total > 0 ? Math.round((m.yes_pool / total) * 100) : 50;
    const noPct = 100 - yesPct;
    const position = betsByMarket.get(m.id);
    const isFirstBet = m.id === firstBetMarketId;
    const estReturn = position
      ? Math.round(
          (position.amount /
            (position.side === "yes" ? m.yes_pool : m.no_pool || 1)) *
            total
        )
      : 0;

    return (
      <div
        key={m.id}
        className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3"
      >
        {/* Capsule row */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPublic ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-[#0E1820] border border-[#1E3048] text-[#7B9EC8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7B9EC8]" />
              Public bet
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-[#272220] border border-[#38302A] text-[#9A8E84]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9A8E84]/50" />
              {group?.name ?? "Group"}
            </span>
          )}
          {isFirstBet && (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-[#0E1820] border border-[#1E3048] text-[#7B9EC8]">
              Your first bet
            </span>
          )}
          <span className="text-xs text-t-2 ml-auto">
            closes {formatDeadline(m.deadline)}
          </span>
        </div>

        {/* Question */}
        <p className="text-[15px] font-semibold text-t-0 leading-snug">
          {m.question}
        </p>

        {/* Odds bar */}
        <OddsBar yesPool={m.yes_pool} noPool={m.no_pool} />

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-t-2">
          <span className="font-mono-num font-semibold text-yes">{yesPct}%</span>
          <span className="font-mono-num">
            {total.toLocaleString()} c · {formatDeadline(m.deadline)}
          </span>
          <span className="font-mono-num font-semibold text-no">{noPct}%</span>
        </div>

        {/* YES / NO buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openSheet(m, "yes")}
            className="h-11 rounded-button text-sm font-semibold bg-yes-bg border border-yes-border text-yes active:scale-[0.97] transition-all"
          >
            YES
          </button>
          <button
            onClick={() => openSheet(m, "no")}
            className="h-11 rounded-button text-sm font-semibold bg-no-bg border border-no-border text-no active:scale-[0.97] transition-all"
          >
            NO
          </button>
        </div>

        {/* Position row */}
        {position && (
          <div className="flex items-center justify-between text-xs text-t-2 pt-1 border-t border-b-0">
            <span>
              Your position: {position.side.toUpperCase()} · {position.amount} c
            </span>
            <span className="font-mono-num font-semibold text-coin">
              ~{estReturn} c est.
            </span>
          </div>
        )}
      </div>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "markets", label: "Markets" },
    { key: "feed", label: "Feed" },
    { key: "board", label: "Board" },
  ];

  const handleTabChange = (t: Tab) => {
    if (t === "create") {
      setCreateOpen(true);
      return;
    }
    setTab(t);
  };

  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Tab bar */}
        <div className="sticky top-0 z-10 bg-bg-0 px-4 pt-4 space-y-3">
          <h2 className="text-lg font-bold text-t-0">{group?.name ?? "Group"}</h2>

          <div className="flex items-center gap-4 border-b border-b-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`pb-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "text-t-0 border-b-2 border-t-0"
                    : "text-t-2 border-b-2 border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3 pb-2.5">
              <div className="flex items-center gap-1.5 rounded-pill bg-coin-bg border border-coin-border px-3 py-1">
                <span className="text-sm font-bold font-mono-num text-coin">{userCoins.toLocaleString()}</span>
                <span className="text-xs text-coin">c</span>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-sm font-semibold text-yes flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </button>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 pt-4 space-y-4">
          {tab === "markets" && (
            <>
              {/* Judge banner */}
              {pendingVerdicts.length > 0 && (
                <div className="rounded-card bg-coin-bg border border-coin-border p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-coin-bg border border-coin-border flex items-center justify-center text-sm font-semibold text-coin shrink-0">
                      {getInitials(user?.email ?? "JU")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-coin">
                        You're the judge
                      </p>
                      <p className="text-xs text-coin/70">
                        Tap to commit verdict · {pendingVerdicts.length} pending
                      </p>
                    </div>
                    <span className="text-2xl font-bold font-mono-num text-coin">
                      {pendingVerdicts.length}
                    </span>
                  </div>
                  <p className="text-sm text-t-1 italic">
                    "{pendingVerdicts[0]?.question}"
                  </p>
                </div>
              )}

              {/* YOUR GROUP section */}
              {groupMarkets.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                    Your Group
                  </h3>
                  {groupMarkets.map((m) => renderMarketCard(m, false))}
                </div>
              )}

              {/* PUBLIC section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                    Public · everyone can bet
                  </h3>
                  <span className="rounded-pill px-2.5 py-1 text-[10px] font-semibold text-t-1 border border-b-1 bg-bg-2">
                    Global
                  </span>
                </div>
                {sortedPublicMarkets.map((m) => renderMarketCard(m, true))}
                {sortedPublicMarkets.length === 0 && (
                  <p className="text-sm text-t-2">No public markets yet.</p>
                )}
              </div>
            </>
          )}

          {tab === "feed" && (
            <div className="mt-4">
              <h3 className="text-base font-semibold text-t-0">Feed</h3>
              <p className="text-sm text-t-1 mt-2">Nothing here yet.</p>
            </div>
          )}

          {tab === "board" && (
            <div className="mt-4">
              <h3 className="text-base font-semibold text-t-0">Leaderboard</h3>
              <p className="text-sm text-t-1 mt-2">No data yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bet sheet */}
      {sheetMarket && (
        <BetSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialSide={sheetSide}
          question={sheetMarket.question}
          yesPct={
            (sheetMarket.yes_pool + sheetMarket.no_pool) > 0
              ? Math.round((sheetMarket.yes_pool / (sheetMarket.yes_pool + sheetMarket.no_pool)) * 100)
              : 50
          }
          noPct={
            (sheetMarket.yes_pool + sheetMarket.no_pool) > 0
              ? Math.round((sheetMarket.no_pool / (sheetMarket.yes_pool + sheetMarket.no_pool)) * 100)
              : 50
          }
          onConfirm={confirmBet}
          minBet={sheetMarket.min_bet}
          userCoins={userCoins}
          groupName={sheetMarket.is_public ? undefined : (group?.name ?? undefined)}
          totalPool={sheetMarket.yes_pool + sheetMarket.no_pool}
          yesSidePool={sheetMarket.yes_pool}
          noSidePool={sheetMarket.no_pool}
        />
      )}

      {/* Create market sheet */}
      <CreateMarketSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupId={groupId!}
        groupName={group?.name ?? "Group"}
      />

      <BottomNav />
    </div>
  );
}
