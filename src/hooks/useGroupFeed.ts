import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeedEvent {
  id: string;
  event_type: string;
  payload: any;
  user_id: string;
  group_id: string;
  created_at: string | null;
}

export interface FeedReaction {
  id: string;
  emoji: string;
  target_id: string;
  user_id: string;
}

export interface FeedUser {
  id: string;
  name: string;
  avatar_color: string;
}

export function useGroupFeed(groupId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["group-feed", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as FeedEvent[];
    },
  });

  const eventIds = events.map((e) => e.id);

  const { data: reactions = [] } = useQuery({
    queryKey: ["feed-reactions", groupId, eventIds],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("reactions")
        .select("id, emoji, target_id, user_id")
        .eq("target_type", "event")
        .in("target_id", eventIds);
      return (data ?? []) as FeedReaction[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["feed-users", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId!);
      const memberIds = (data ?? []).map((m) => m.user_id);
      if (memberIds.length === 0) return [];
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, avatar_color")
        .in("id", memberIds);
      return (usersData ?? []) as FeedUser[];
    },
  });

  useEffect(() => {
    if (!groupId) return;

    const eventsChannel = supabase
      .channel(`feed-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events", filter: `group_id=eq.${groupId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-feed", groupId] });
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`feed-reactions-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["feed-reactions", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [groupId, queryClient]);

  return { events, reactions, users, loading: eventsLoading };
}
