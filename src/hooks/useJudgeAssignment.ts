import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useJudgeAssignment(groupId: string | undefined, userId: string | undefined) {
  const { data: pendingMarkets = [], isLoading: loading } = useQuery({
    queryKey: ["pending-verdicts", groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("id, market_id")
        .eq("judge_id", userId!)
        .eq("status", "pending");
      if (!verdicts?.length) return [];
      const { data: markets } = await supabase
        .from("markets")
        .select("id, question, deadline")
        .eq("group_id", groupId!)
        .eq("status", "closed")
        .in("id", verdicts.map((v) => v.market_id));
      return markets ?? [];
    },
  });

  return { pendingMarkets, loading };
}
