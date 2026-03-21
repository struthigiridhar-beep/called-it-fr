import { useState } from "react";

const REACTIONS = ["🔥", "😂", "👀", "💀"];

export default function ReactionPills() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => setSelected(selected === emoji ? null : emoji)}
          className={`h-9 w-9 rounded-pill text-lg flex items-center justify-center transition-all active:scale-90 ${
            selected === emoji
              ? "bg-bg-3 border border-b-2 scale-110"
              : "bg-bg-2 border border-b-0 hover:border-b-1"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
