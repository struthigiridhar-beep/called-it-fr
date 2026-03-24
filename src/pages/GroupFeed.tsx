import { useParams } from "react-router-dom";
import { useGroupFeed } from "@/hooks/useGroupFeed";
import { formatDistanceToNow } from "date-fns";

export default function GroupFeed() {
  const { groupId } = useParams<{ groupId: string }>();
  const { events, loading } = useGroupFeed(groupId);

  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-base font-semibold text-t-0">Feed</h3>
      {loading && <p className="text-sm text-t-2">Loading…</p>}
      {!loading && events.length === 0 && (
        <p className="text-sm text-t-1">Nothing here yet.</p>
      )}
      {events.map((e) => (
        <div key={e.id} className="rounded-card border border-b-0 bg-bg-1 p-3 space-y-1">
          <p className="text-xs font-semibold text-t-1 capitalize">{e.event_type.replace(/_/g, " ")}</p>
          <p className="text-[10px] text-t-2">
            {e.created_at ? formatDistanceToNow(new Date(e.created_at), { addSuffix: true }) : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
