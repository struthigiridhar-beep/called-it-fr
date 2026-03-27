import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  user_id: string;
  coins: number;
  xp: number;
  streak: number;
  judge_integrity: number;
  name: string;
  avatar_color: string;
  crew_role: string | null;
  accuracy: number | null; // win % or null if < 1 settled bet
  bet_count: number;
  coins_lost: number; // total coins bet on losing side (for "most overconfident")
}

export function useGroupLeaderboard(groupId: string | undefined) {
  const { data: leaderboard = [], isLoading: loading } = useQuery({
    queryKey: ["group-leaderboard", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      // 1. Members
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, coins, xp, streak, judge_integrity, crew_role")
        .eq("group_id", groupId!)
        .order("xp", { ascending: false });

      if (!members?.length) return [];

      const userIds = members.map((m) => m.user_id);

      // 2. Users
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_color")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

      // 3. Group markets (resolved only for accuracy calc)
      const { data: markets } = await supabase
        .from("markets")
        .select("id, yes_pool, no_pool, status")
        .eq("group_id", groupId!);

      const marketIds = (markets ?? []).map((m) => m.id);
      const resolvedIds = new Set(
        (markets ?? []).filter((m) => m.status === "resolved").map((m) => m.id)
      );

      // 4. Bets
      const { data: bets } = marketIds.length
        ? await supabase
            .from("bets")
            .select("user_id, market_id, side, amount")
            .in("market_id", marketIds)
        : { data: [] as any[] };

      // 5. Committed verdicts
      const { data: verdicts } = marketIds.length
        ? await supabase
            .from("verdicts")
            .select("market_id, verdict")
            .in("market_id", marketIds)
            .eq("status", "committed")
        : { data: [] as any[] };

      const verdictMap = new Map<string, string>(
        (verdicts ?? []).map((v: any) => [v.market_id, v.verdict])
      );

      // Compute per-user stats
      const statsMap = new Map<
        string,
        { wins: number; settled: number; totalBets: number; coinsLost: number }
      >();

      for (const uid of userIds) {
        statsMap.set(uid, { wins: 0, settled: 0, totalBets: 0, coinsLost: 0 });
      }

      // Group bets by user+market
      const userMarketBets = new Map<string, { side: string; amount: number }>();
      for (const b of bets ?? []) {
        const key = `${b.user_id}:${b.market_id}`;
        const existing = userMarketBets.get(key);
        if (!existing) {
          userMarketBets.set(key, { side: b.side, amount: b.amount });
        } else {
          existing.amount += b.amount;
        }
      }

      for (const [key, { side, amount }] of userMarketBets) {
        const [uid, mid] = key.split(":");
        const stats = statsMap.get(uid);
        if (!stats) continue;
        stats.totalBets++;

        if (resolvedIds.has(mid) && verdictMap.has(mid)) {
          stats.settled++;
          if (verdictMap.get(mid) === side) {
            stats.wins++;
          } else {
            stats.coinsLost += amount;
          }
        }
      }

      return members.map((m) => {
        const stats = statsMap.get(m.user_id);
        return {
          ...m,
          name: userMap.get(m.user_id)?.name ?? "Unknown",
          avatar_color: userMap.get(m.user_id)?.avatar_color ?? "#7B9EC8",
          crew_role: m.crew_role ?? null,
          accuracy:
            stats && stats.settled > 0
              ? Math.round((stats.wins / stats.settled) * 100)
              : null,
          bet_count: stats?.totalBets ?? 0,
          coins_lost: stats?.coinsLost ?? 0,
        };
      }) as LeaderboardEntry[];
    },
  });

  // Derive "most overconfident" — member with highest coins_lost
  const mostOverconfidentId =
    leaderboard.length > 0
      ? leaderboard.reduce((prev, curr) =>
          curr.coins_lost > prev.coins_lost ? curr : prev
        ).coins_lost > 0
        ? leaderboard.reduce((prev, curr) =>
            curr.coins_lost > prev.coins_lost ? curr : prev
          ).user_id
        : null
      : null;

  return { leaderboard, loading, mostOverconfidentId };
}
