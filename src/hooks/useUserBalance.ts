import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserBalance(userId: string | undefined, groupId: string | undefined) {
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["group-membership", groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("coins, xp, streak")
        .eq("group_id", groupId!)
        .eq("user_id", userId!)
        .single();
      return data;
    },
  });

  return {
    balance: Math.max(0, data?.coins ?? 0),
    xp: data?.xp ?? 0,
    streak: data?.streak ?? 0,
    loading,
    refetch,
  };
}
