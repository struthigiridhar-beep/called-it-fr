import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CreateMarketSheet from "@/components/CreateMarketSheet";
import { useState } from "react";

interface GroupCardData {
  id: string;
  name: string;
  memberCount: number;
  userRank: number;
  liveMarkets: number;
  resolvedMarkets: number;
  streak: number;
  xpThisWeek: number;
  xp: number;
  lastActivity: string | null;
  memberAvatars: { initials: string }[];
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);
  const [createGroupName, setCreateGroupName] = useState("");
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["home-groups", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<GroupCardData[]> => {
      // Get user's groups
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id, xp, streak, coins")
        .eq("user_id", user!.id);

      if (!memberships?.length) return [];

      const groupIds = memberships.map((m) => m.group_id);

      // Parallel fetches
      const [groupsRes, allMembersRes, marketsRes, betsRes, verdictsRes] = await Promise.all([
        supabase.from("groups").select("id, name").in("id", groupIds),
        supabase.from("group_members").select("group_id, user_id, xp").in("group_id", groupIds),
        supabase.from("markets").select("id, group_id, status").in("group_id", groupIds),
        supabase
          .from("bets")
          .select("id, market_id, created_at, user_id, side, amount")
          .order("created_at", { ascending: false }),
        supabase
          .from("verdicts")
          .select("market_id, verdict, status, committed_at")
          .eq("status", "committed")
          .order("committed_at", { ascending: false }),
      ]);

      const groupsMap = new Map((groupsRes.data ?? []).map((g) => [g.id, g]));
      const allMembers = allMembersRes.data ?? [];
      const markets = marketsRes.data ?? [];
      const bets = betsRes.data ?? [];
      const verdicts = verdictsRes.data ?? [];

      // Get user names for activity
      const userIds = [...new Set(allMembers.map((m) => m.user_id))];
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name")
        .in("id", userIds);
      const usersMap = new Map((usersData ?? []).map((u) => [u.id, u.name]));

      // Build market to group map
      const marketGroupMap = new Map(markets.map((m) => [m.id, m.group_id]));

      return groupIds.map((gid) => {
        const group = groupsMap.get(gid);
        if (!group) return null;

        const myMembership = memberships.find((m) => m.group_id === gid)!;
        const groupMembers = allMembers.filter((m) => m.group_id === gid);
        const liveMarkets = markets.filter((m) => m.group_id === gid && m.status === "open").length;
        const resolvedMarkets = markets.filter((m) => m.group_id === gid && m.status === "resolved").length;

        // Rank by XP
        const sorted = [...groupMembers].sort((a, b) => b.xp - a.xp);
        const rank = sorted.findIndex((m) => m.user_id === user!.id) + 1;

        // Member avatars (top 3)
        const memberAvatars = groupMembers.slice(0, 3).map((m) => ({
          initials: getInitials(usersMap.get(m.user_id) ?? "??"),
        }));

        // Latest activity: bet or verdict
        const groupMarketIds = new Set(
          markets.filter((m) => m.group_id === gid).map((m) => m.id)
        );
        const latestBet = bets.find((b) => groupMarketIds.has(b.market_id));
        const latestVerdict = verdicts.find((v) => groupMarketIds.has(v.market_id));

        let lastActivity: string | null = null;
        // Compare timestamps — show whichever is more recent
        const betTime = latestBet ? new Date(latestBet.created_at).getTime() : 0;
        const verdictTime = latestVerdict ? new Date(latestVerdict.committed_at).getTime() : 0;

        if (verdictTime > betTime && latestVerdict) {
          lastActivity = `Verdict → ${latestVerdict.verdict.toUpperCase()}`;
        } else if (latestBet) {
          const betterName = usersMap.get(latestBet.user_id) ?? "Someone";
          const firstName = betterName.split(" ")[0];
          lastActivity = `${firstName} just bet ${latestBet.amount} coins`;
        }

        return {
          id: gid,
          name: group.name,
          memberCount: groupMembers.length,
          userRank: rank,
          liveMarkets,
          streak: myMembership.streak,
          xpThisWeek: 0, // Would need date filtering on transactions
          xp: myMembership.xp,
          lastActivity,
          memberAvatars,
        } satisfies GroupCardData;
      }).filter(Boolean) as GroupCardData[];
    },
    staleTime: 30_000,
  });


  const totalLive = groups.reduce((sum, g) => sum + g.liveMarkets, 0);

  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-safe-top pb-28">
        {/* Header */}
        <header className="pt-4 pb-2">
          <h1 className="text-2xl font-bold text-t-0 tracking-tight">Called It.</h1>
          <p className="text-sm text-t-1 mt-0.5">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {totalLive} market{totalLive !== 1 ? "s" : ""} live
          </p>
        </header>

        {/* Group cards */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-card border border-b-0 bg-bg-1 p-4 h-40 animate-pulse" />
            ))
          ) : groups.length === 0 ? (
            <div className="mt-12 flex flex-col items-center text-center space-y-3">
              <p className="text-t-1 text-sm">No groups yet. Create one to start betting with friends.</p>
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/group/${g.id}`)}
                className="w-full text-left rounded-card border border-b-0 bg-bg-1 p-4 space-y-3 active:scale-[0.98] transition-transform"
              >
                {/* Top row: avatar + name + live badge */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-bg-3 border border-b-1 flex items-center justify-center text-sm font-semibold text-t-1 shrink-0">
                    {getInitials(g.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-t-0 font-semibold text-[15px] truncate">{g.name}</span>
                      {g.liveMarkets > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yes shrink-0 ml-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-yes" />
                          {g.liveMarkets} live
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-t-2">
                      {g.memberCount} member{g.memberCount !== 1 ? "s" : ""} · you're #{g.userRank}
                    </span>
                  </div>
                </div>

                {/* Stats grid: 3 equal columns */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-button bg-bg-2 border border-b-0 px-3 py-2 text-center">
                    <div className="text-t-0 font-semibold font-mono-num text-sm">{g.xp.toLocaleString()}</div>
                    <div className="text-[10px] text-t-2 mt-0.5">your XP</div>
                  </div>
                  <div className="rounded-button bg-bg-2 border border-b-0 px-3 py-2 text-center">
                    <div className="text-coin font-semibold font-mono-num text-sm">
                      {g.streak > 0 ? `${g.streak}×` : "—"}
                    </div>
                    <div className="text-[10px] text-t-2 mt-0.5">streak</div>
                  </div>
                  <div className="rounded-button bg-bg-2 border border-b-0 px-3 py-2 text-center">
                    <div className="text-coin font-semibold font-mono-num text-sm">
                      {g.xpThisWeek > 0 ? `+${g.xpThisWeek.toLocaleString()}` : "—"}
                    </div>
                    <div className="text-[10px] text-t-2 mt-0.5">this week</div>
                  </div>
                </div>

                {/* Recent activity line */}
                {g.lastActivity && (
                  <div className="flex items-center gap-2 text-xs text-t-2">
                    <div className="flex -space-x-1.5">
                      {g.memberAvatars.map((a, i) => (
                        <span
                          key={i}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-3 border border-bg-1 text-[8px] font-semibold text-t-2"
                        >
                          {a.initials}
                        </span>
                      ))}
                    </div>
                    <span className="truncate">{g.lastActivity}</span>
                  </div>
                )}
              </button>
            ))
          )}

          {/* Create / join group CTA */}
          <button
            onClick={() => {/* TODO: create/join modal */}}
            className="w-full rounded-card border border-dashed border-b-1 bg-transparent px-4 py-5 flex items-center gap-3 text-t-2 active:scale-[0.98] transition-transform"
          >
            <div className="h-10 w-10 rounded-full border border-dashed border-b-1 flex items-center justify-center shrink-0">
              <Plus className="h-4 w-4 text-t-2" />
            </div>
            <span className="text-sm">Create or join a group</span>
          </button>
        </div>
      </div>

      {/* FAB to create market */}
      {groups.length > 0 && (
        <button
          onClick={() => {
            setCreateGroupId(groups[0].id);
            setCreateGroupName(groups[0].name);
            setCreateOpen(true);
          }}
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full bg-yes flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-5 w-5 text-white" />
        </button>
      )}

      {createGroupId && (
        <CreateMarketSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          groupId={createGroupId}
          groupName={createGroupName}
        />
      )}

      <BottomNav />
    </div>
  );
}
