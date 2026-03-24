import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useGroupFeed(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: ["group-feed", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`feed-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events", filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-feed", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return { events, loading };
}
