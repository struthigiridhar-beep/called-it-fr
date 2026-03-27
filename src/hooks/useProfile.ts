import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Membership {
  group_id: string;
  group_name: string;
  xp: number;
  coins: number;
  streak: number;
  judge_integrity: number;
  crew_role: string | null;
  joined_at: string;
}

interface BetWithMarket {
  id: string;
  market_id: string;
  side: string;
  amount: number;
  created_at: string;
  question: string | null;
  status: string | null;
  yes_pool: number;
  no_pool: number;
  group_id: string | null;
  verdict_outcome: string | null;
}

interface StreakEntry {
  length: number;
  status: "active" | "broken";
}

const ROLE_PRIORITY = ["prophetic", "wildcard", "hyped", "judge", "creator"] as const;

const ROLE_CONFIG: Record<string, { emoji: string; label: string }> = {
  prophetic: { emoji: "🔮", label: "Prophetic" },
  wildcard: { emoji: "🎲", label: "Wildcard" },
  hyped: { emoji: "🔥", label: "HypedUp" },
  judge: { emoji: "⚖️", label: "Judge" },
  creator: { emoji: "🏗️", label: "Creator" },
};

export function useProfile(userId: string | undefined, currentUserId: string | undefined) {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["profile-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, avatar_color, status_text, created_at")
        .eq("id", userId!)
        .single();
      return data;
    },
  });

  const { data: memberships = [], isLoading: memberLoading } = useQuery({
    queryKey: ["profile-memberships", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("group_id, xp, coins, streak, judge_integrity, crew_role, joined_at")
        .eq("user_id", userId!);

      if (!data?.length) return [] as Membership[];

      const groupIds = data.map((m) => m.group_id);
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds);

      const groupMap = new Map(groups?.map((g) => [g.id, g.name]) ?? []);

      return data.map((m) => ({
        ...m,
        group_name: groupMap.get(m.group_id) ?? "Unknown",
        judge_integrity: Number(m.judge_integrity),
      })) as Membership[];
    },
  });

  const { data: currentUserGroupIds = new Set<string>() } = useQuery({
    queryKey: ["profile-current-groups", currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", currentUserId!);
      return new Set(data?.map((r) => r.group_id) ?? []);
    },
  });

  const { data: recentBets = [] } = useQuery({
    queryKey: ["profile-recent-bets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("id, market_id, side, amount, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!bets?.length) return [] as BetWithMarket[];

      const marketIds = [...new Set(bets.map((b) => b.market_id))];
      const { data: markets } = await supabase
        .from("markets")
        .select("id, question, status, yes_pool, no_pool, group_id")
        .in("id", marketIds);
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("market_id, verdict")
        .in("market_id", marketIds)
        .eq("status", "committed");

      const marketMap = new Map(markets?.map((m) => [m.id, m]) ?? []);
      const verdictMap = new Map(verdicts?.map((v) => [v.market_id, v.verdict]) ?? []);

      return bets.map((b) => {
        const m = marketMap.get(b.market_id);
        return {
          id: b.id,
          market_id: b.market_id,
          side: b.side,
          amount: b.amount,
          created_at: b.created_at,
          question: m?.question ?? null,
          status: m?.status ?? null,
          yes_pool: m?.yes_pool ?? 0,
          no_pool: m?.no_pool ?? 0,
          group_id: m?.group_id ?? null,
          verdict_outcome: verdictMap.get(b.market_id) ?? null,
        } as BetWithMarket;
      });
    },
  });

  const { data: settledRecord } = useQuery({
    queryKey: ["profile-accuracy", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("market_id, side")
        .eq("user_id", userId!);

      if (!bets?.length) return { wins: 0, losses: 0, settled: 0, totalBets: 0 };

      const marketIds = [...new Set(bets.map((b) => b.market_id))];
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("market_id, verdict")
        .in("market_id", marketIds)
        .eq("status", "committed");

      const verdictMap = new Map(verdicts?.map((v) => [v.market_id, v.verdict]) ?? []);
      const seen = new Set<string>();
      let wins = 0, losses = 0;
      for (const b of bets) {
        if (seen.has(b.market_id)) continue;
        seen.add(b.market_id);
        const v = verdictMap.get(b.market_id);
        if (!v) continue;
        if (b.side === v) wins++;
        else losses++;
      }
      return { wins, losses, settled: wins + losses, totalBets: bets.length };
    },
  });

  const { data: streakHistory = [] } = useQuery({
    queryKey: ["profile-streaks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("market_id, side, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });

      if (!bets?.length) return [] as StreakEntry[];

      const marketIds = [...new Set(bets.map((b) => b.market_id))];
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("market_id, verdict")
        .in("market_id", marketIds)
        .eq("status", "committed");

      const verdictMap = new Map(verdicts?.map((v) => [v.market_id, v.verdict]) ?? []);
      
      const seen = new Set<string>();
      const settledBets: { side: string; won: boolean }[] = [];
      for (const b of bets) {
        if (seen.has(b.market_id)) continue;
        seen.add(b.market_id);
        const v = verdictMap.get(b.market_id);
        if (!v) continue;
        settledBets.push({ side: b.side, won: b.side === v });
      }

      if (!settledBets.length) return [] as StreakEntry[];

      const streaks: StreakEntry[] = [];
      let current = 0;
      for (const b of settledBets) {
        if (b.won) {
          current++;
        } else {
          if (current > 0) streaks.push({ length: current, status: "broken" });
          current = 0;
        }
      }
      if (current > 0) {
        streaks.push({ length: current, status: "active" });
      }

      streaks.sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;
        return b.length - a.length;
      });

      return streaks;
    },
  });

  const { data: referralStats } = useQuery({
    queryKey: ["profile-referrals", userId],
    enabled: !!userId && userId === currentUserId,
    queryFn: async () => {
      const { data, count } = await supabase
        .from("referrals")
        .select("id", { count: "exact" })
        .eq("inviter_id", userId!);
      const c = count ?? data?.length ?? 0;
      return { count: c, coinsEarned: c * 50 };
    },
  });

  const lifetimeXp = memberships.reduce((s, m) => s + m.xp, 0);
  const avgIntegrity = (() => {
    const valid = memberships.filter((m) => m.judge_integrity > 0);
    if (!valid.length) return 0;
    return Math.round((valid.reduce((s, m) => s + m.judge_integrity, 0) / valid.length) * 100);
  })();

  const bestCrewRole = (() => {
    for (const role of ROLE_PRIORITY) {
      const m = memberships.find((mem) => mem.crew_role === role);
      if (m) {
        const config = ROLE_CONFIG[role];
        return { role, groupName: m.group_name, emoji: config.emoji, label: config.label };
      }
    }
    return null;
  })();

  const accuracy = settledRecord && settledRecord.settled >= 3
    ? Math.round((settledRecord.wins / settledRecord.settled) * 100)
    : null;

  const loading = userLoading || memberLoading;

  return {
    user,
    memberships,
    currentUserGroupIds,
    recentBets,
    settledRecord: settledRecord ?? { wins: 0, losses: 0, settled: 0, totalBets: 0 },
    streakHistory,
    referralStats: referralStats ?? { count: 0, coinsEarned: 0 },
    lifetimeXp,
    avgIntegrity,
    bestCrewRole,
    accuracy,
    loading,
  };
}

export function betResult(bet: BetWithMarket) {
  if (bet.status === "open" || bet.status === "closed") {
    return { label: "open", color: "#4A4038" };
  }
  if (bet.status === "resolved" && bet.verdict_outcome) {
    const won = bet.verdict_outcome === bet.side;
    const sidePool = bet.side === "yes" ? bet.yes_pool : bet.no_pool;
    const totalPool = bet.yes_pool + bet.no_pool;
    const payout = won && sidePool > 0 ? Math.round((bet.amount / sidePool) * totalPool) : 0;
    if (won) return { label: `+${payout} c`, color: "#7AB870" };
    return { label: `−${bet.amount} c`, color: "#C47860" };
  }
  return { label: "—", color: "#4A4038" };
}
