import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FeedReaction } from "@/hooks/useGroupFeed";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useQueryClient } from "@tanstack/react-query";

const EMOJI_PICKER = ["😂", "🔥", "👀", "💀", "👎"];

interface FeedReactionsProps {
  eventId: string;
  groupId: string;
  reactions: FeedReaction[];
  userId: string | undefined;
}

export default function FeedReactions({ eventId, groupId, reactions, userId }: FeedReactionsProps) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Aggregate by emoji
  const aggregated = reactions.reduce<Record<string, { count: number; myId: string | null }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, myId: null };
    acc[r.emoji].count++;
    if (r.user_id === userId) acc[r.emoji].myId = r.id;
    return acc;
  }, {});

  const toggle = async (emoji: string) => {
    if (!userId) return;
    const existing = aggregated[emoji];
    if (existing?.myId) {
      await supabase.from("reactions").delete().eq("id", existing.myId);
    } else {
      await supabase.from("reactions").insert({
        emoji,
        target_id: eventId,
        target_type: "event",
        user_id: userId,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["feed-reactions", groupId] });
    setPickerOpen(false);
  };

  const pills = Object.entries(aggregated);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {pills.map(([emoji, { count, myId }]) => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          className={`h-7 px-2 rounded-pill text-xs flex items-center gap-1 transition-all active:scale-90 ${
            myId
              ? "bg-bg-3 border border-b-2"
              : "bg-bg-2 border border-b-0 hover:border-b-1"
          }`}
        >
          <span className="text-sm">{emoji}</span>
          <span className="font-mono-num text-t-2">{count}</span>
        </button>
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button className="h-7 w-7 flex items-center justify-center text-base opacity-50 hover:opacity-80 active:scale-90 transition-all">
            😀⁺
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-bg-2 border border-b-1" align="start" sideOffset={4}>
          <div className="flex gap-1">
            {EMOJI_PICKER.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="h-9 w-9 rounded-button flex items-center justify-center text-lg hover:bg-bg-3 active:scale-90 transition-all"
              >
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
