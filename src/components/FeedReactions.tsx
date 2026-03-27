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
          className="flex items-center gap-1 transition-all active:scale-90"
          style={{
            background: myId ? "#222018" : "#1A1714",
            border: `1px solid ${myId ? "#3A3430" : "#222018"}`,
            borderRadius: 99,
            padding: "5px 10px",
            fontSize: 12,
            color: "#9A8E84",
          }}
        >
          <span className="text-sm">{emoji}</span>
          <span style={{ fontFamily: "monospace", color: "#5C5248" }}>{count}</span>
        </button>
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: "#1A1714",
              border: "1px solid #222018",
              borderRadius: 99,
              padding: "5px 10px",
              fontSize: 12,
              color: "#4A4038",
            }}
          >
            +
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" style={{ background: "#1A1714", border: "1px solid #222018" }} align="start" sideOffset={4}>
          <div className="flex gap-1">
            {EMOJI_PICKER.map((e) => (
              <button
                key={e}
                onClick={() => toggle(e)}
                className="h-9 w-9 rounded-full flex items-center justify-center text-lg active:scale-90 transition-all"
                style={{ color: "#9A8E84" }}
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
