import { useParams } from "react-router-dom";
import { useGroupLeaderboard } from "@/hooks/useGroupLeaderboard";

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function GroupBoard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { leaderboard, loading } = useGroupLeaderboard(groupId);

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-base font-semibold text-t-0">Leaderboard</h3>
      {loading && <p className="text-sm text-t-2">Loading…</p>}
      {!loading && leaderboard.length === 0 && (
        <p className="text-sm text-t-1">No data yet.</p>
      )}
      <div className="space-y-1">
        {leaderboard.map((entry, i) => (
          <div key={entry.user_id} className="flex items-center gap-3 rounded-card bg-bg-1 border border-b-0 p-3">
            <span className="text-sm font-bold font-mono-num text-t-2 w-6 text-center">{i + 1}</span>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: entry.avatar_color }}
            >
              {getInitials(entry.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-t-0 truncate">{entry.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold font-mono-num text-coin">{entry.xp} XP</p>
              <p className="text-[10px] font-mono-num text-t-2">{entry.coins} c</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
