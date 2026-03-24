import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfile(userId: string | undefined) {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("name, avatar_color")
        .eq("id", userId!)
        .single();

      const { data: memberships } = await supabase
        .from("group_members")
        .select("coins, xp, streak, judge_integrity")
        .eq("user_id", userId!);

      const totalCoins = memberships?.reduce((s, m) => s + m.coins, 0) ?? 0;
      const totalXp = memberships?.reduce((s, m) => s + m.xp, 0) ?? 0;
      const maxStreak = Math.max(0, ...(memberships?.map((m) => m.streak) ?? []));
      const avgIntegrity = memberships?.length
        ? memberships.reduce((s, m) => s + Number(m.judge_integrity), 0) / memberships.length
        : 1;

      return {
        name: userData?.name ?? "",
        avatar_color: userData?.avatar_color ?? "#7B9EC8",
        totalCoins: Math.max(0, totalCoins),
        totalXp,
        maxStreak,
        avgIntegrity,
      };
    },
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: record, isLoading: recordLoading } = useQuery({
    queryKey: ["win-loss", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: bets } = await supabase
        .from("bets")
        .select("market_id, side, amount")
        .eq("user_id", userId!);

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

  const loading = profileLoading || txLoading || recordLoading;

  return { profile, transactions, record, loading };
}
