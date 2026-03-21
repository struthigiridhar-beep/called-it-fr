import { useState } from "react";

const REACTIONS = [
  { emoji: "🔥", count: 48 },
  { emoji: "😂", count: 22 },
  { emoji: "👀", count: 31 },
  { emoji: "💀", count: 14 },
];

export default function ReactionPills() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map(({ emoji, count }) => (
        <button
          key={emoji}
          onClick={() => setSelected(selected === emoji ? null : emoji)}
          className={`h-9 px-3 rounded-pill text-sm flex items-center justify-center gap-1.5 transition-all active:scale-90 ${
            selected === emoji
              ? "bg-bg-3 border border-b-2 scale-110"
              : "bg-bg-2 border border-b-0 hover:border-b-1"
          }`}
        >
          <span className="text-base">{emoji}</span>
          <span className="font-mono-num text-t-2 text-xs">{selected === emoji ? count + 1 : count}</span>
        </button>
      ))}
    </div>
  );
}
