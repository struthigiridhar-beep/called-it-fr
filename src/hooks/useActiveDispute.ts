import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveDispute {
  dispute_id: string;
  market_id: string;
  question: string;
  judge_name: string;
  flags: number;
  member_count: number;
  verdict_committed_at: string;
  total_pool: number;
}

export function useActiveDispute(groupId: string | undefined) {
  const { data: activeDispute = null } = useQuery({
    queryKey: ["active-dispute", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      // Get disputed markets in this group
      const { data: markets } = await supabase
        .from("markets")
        .select("id, question, yes_pool, no_pool")
        .eq("group_id", groupId!)
        .eq("status", "disputed");

      if (!markets?.length) return null;

      const market = markets[0];

      // Get verdict
      const { data: verdicts } = await supabase
        .from("verdicts")
        .select("id, judge_id, committed_at")
        .eq("market_id", market.id);

      if (!verdicts?.length) return null;
      const verdict = verdicts[0];

      // Get dispute
      const { data: disputes } = await supabase
        .from("disputes")
        .select("id, flags, status")
        .eq("verdict_id", verdict.id)
        .eq("status", "open");

      if (!disputes?.length) return null;
      const dispute = disputes[0];

      // Get judge name
      const { data: judge } = await supabase
        .from("users")
        .select("name")
        .eq("id", verdict.judge_id)
        .single();

      // Get member count
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId!);

      return {
        dispute_id: dispute.id,
        market_id: market.id,
        question: market.question,
        judge_name: judge?.name ?? "Unknown",
        flags: dispute.flags,
        member_count: members?.length ?? 0,
        verdict_committed_at: verdict.committed_at,
        total_pool: market.yes_pool + market.no_pool,
      } as ActiveDispute;
    },
  });

  return { activeDispute };
}
