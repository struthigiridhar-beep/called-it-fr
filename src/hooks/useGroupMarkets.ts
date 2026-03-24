import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useGroupMarkets(groupId: string | undefined, userId: string | undefined) {
  const { data: groupMarkets = [], refetch: refetchGroup } = useQuery({
    queryKey: ["group-markets", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("group_id", groupId!)
        .eq("is_public", false)
        .order("created_at", { ascending: false });
      return (data ?? []) as MarketRow[];
    },
  });

  const { data: publicMarkets = [], refetch: refetchPublic } = useQuery({
    queryKey: ["public-markets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      return (data ?? []) as MarketRow[];
    },
  });

  const allMarkets = [...groupMarkets, ...publicMarkets];
  const closedIds = allMarkets
    .filter((m) => m.status === "resolved" || m.status === "closed" || m.status === "disputed")
    .map((m) => m.id);

  const { data: verdicts = [] } = useQuery({
    queryKey: ["group-market-verdicts", groupId, closedIds.length],
    enabled: closedIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("verdicts")
        .select("id, market_id, verdict, status, committed_at")
        .in("market_id", closedIds);
      return data ?? [];
    },
  });

  const verdictIds = verdicts.map((v) => v.id);

  const { data: disputes = [] } = useQuery({
    queryKey: ["group-disputes", verdictIds.join(",")],
    enabled: verdictIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("id, verdict_id, status, flags")
        .in("verdict_id", verdictIds);
      return data ?? [];
    },
  });

  const disputeIds = disputes.map((d) => d.id);

  const { data: userFlags = [] } = useQuery({
    queryKey: ["user-dispute-flags", userId, disputeIds.join(",")],
    enabled: !!userId && disputeIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("dispute_flags")
        .select("dispute_id")
        .eq("user_id", userId!)
        .in("dispute_id", disputeIds);
      return data ?? [];
    },
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: ["group-member-count", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { count } = await supabase
        .from("group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("group_id", groupId!);
      return count ?? 0;
    },
  });

  const { data: rawUserBets = [] } = useQuery({
    queryKey: ["user-bets", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("bets").select("*").eq("user_id", userId!);
      return data ?? [];
    },
  });

  // Build bet lookup
  const userBets: Record<string, { side: Side; amount: number }> = {};
  rawUserBets.forEach((b) => {
    const existing = userBets[b.market_id];
    if (existing) {
      existing.amount += b.amount;
    } else {
      userBets[b.market_id] = { side: b.side as Side, amount: b.amount };
    }
  });

  const loading = false; // react-query handles loading per query

  const refetch = () => {
    refetchGroup();
    refetchPublic();
  };

  return {
    markets: groupMarkets,
    publicMarkets,
    userBets,
    verdicts,
    disputes,
    userFlags,
    memberCount,
    loading,
    refetch,
  };
}
