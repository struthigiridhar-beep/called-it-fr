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
}

export function useGroupLeaderboard(groupId: string | undefined) {
  const { data: leaderboard = [], isLoading: loading } = useQuery({
    queryKey: ["group-leaderboard", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id, coins, xp, streak, judge_integrity")
        .eq("group_id", groupId!)
        .order("xp", { ascending: false });

      if (!members?.length) return [];

      const userIds = members.map((m) => m.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_color")
        .in("id", userIds);

      const userMap = new Map(users?.map((u) => [u.id, u]) ?? []);

      return members.map((m) => ({
        ...m,
        name: userMap.get(m.user_id)?.name ?? "Unknown",
        avatar_color: userMap.get(m.user_id)?.avatar_color ?? "#7B9EC8",
      })) as LeaderboardEntry[];
    },
  });

  return { leaderboard, loading };
}
