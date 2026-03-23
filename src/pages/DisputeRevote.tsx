import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Lock, AlertTriangle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function DisputeRevote() {
  const { groupId, disputeId } = useParams<{ groupId: string; disputeId: string }>();
  const { user } = useAuth();
  const uid = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);

  // Dispute info
  const { data: dispute } = useQuery({
    queryKey: ["dispute", disputeId],
    enabled: !!disputeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*")
        .eq("id", disputeId!)
        .single();
      return data;
    },
  });

  // Verdict + market info
  const { data: verdictData } = useQuery({
    queryKey: ["dispute-verdict", dispute?.verdict_id],
    enabled: !!dispute?.verdict_id,
    queryFn: async () => {
      const { data: verdict } = await supabase
        .from("verdicts")
        .select("*")
        .eq("id", dispute!.verdict_id)
        .single();
      if (!verdict) return null;
      const { data: market } = await supabase
        .from("markets")
        .select("*")
        .eq("id", verdict.market_id)
        .single();
      return { verdict, market };
    },
  });

  // Judge info
  const { data: judgeInfo } = useQuery({
    queryKey: ["dispute-judge", verdictData?.verdict?.judge_id, groupId],
    enabled: !!verdictData?.verdict?.judge_id && !!groupId,
    queryFn: async () => {
      const judgeId = verdictData!.verdict.judge_id;
      const { data: user } = await supabase
        .from("users")
        .select("name, avatar_color")
        .eq("id", judgeId)
        .single();
      const { data: membership } = await supabase
        .from("group_members")
        .select("judge_integrity")
        .eq("group_id", groupId!)
        .eq("user_id", judgeId)
        .single();
      return { ...user, integrity: membership?.judge_integrity ?? 1 };
    },
  });

  // Group member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["group-member-count", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { count } = await supabase
        .from("group_members")
        .select("user_id", { count: "exact", head: true })
        .eq("group_id", groupId!);
      return count ?? 0;
    },
  });

  // Votes with realtime
  const { data: votes = [] } = useQuery({
    queryKey: ["dispute-votes", disputeId],
    enabled: !!disputeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("dispute_votes")
        .select("user_id, vote")
        .eq("dispute_id", disputeId!);
      return data ?? [];
    },
  });

  // Members list for tally display
  const { data: members = [] } = useQuery({
    queryKey: ["group-members-list", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: gm } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", groupId!);
      if (!gm?.length) return [];
      const userIds = gm.map((g) => g.user_id);
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_color")
        .in("id", userIds);
      return users ?? [];
    },
  });

  // Realtime subscription for votes
  useEffect(() => {
    if (!disputeId) return;
    const channel = supabase
      .channel(`dispute-votes-${disputeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dispute_votes", filter: `dispute_id=eq.${disputeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dispute-votes", disputeId] });
          queryClient.invalidateQueries({ queryKey: ["dispute", disputeId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [disputeId, queryClient]);

  const yesVotes = votes.filter((v) => v.vote === "yes").length;
  const noVotes = votes.filter((v) => v.vote === "no").length;
  const hasVoted = votes.some((v) => v.user_id === uid);
  const isResolved = dispute?.status === "upheld" || dispute?.status === "overturned";
  const totalPool = verdictData?.market
    ? verdictData.market.yes_pool + verdictData.market.no_pool
    : 0;

  const castVote = async (vote: "yes" | "no") => {
    if (!uid || !disputeId) return;
    setVoting(true);
    try {
      const { data, error } = await supabase.rpc("cast_dispute_vote", {
        _dispute_id: disputeId,
        _user_id: uid,
        _vote: vote,
      });
      if (error) throw error;
      toast.success(`Vote cast: ${vote.toUpperCase()}`);
      queryClient.invalidateQueries({ queryKey: ["dispute-votes", disputeId] });
      queryClient.invalidateQueries({ queryKey: ["dispute", disputeId] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to cast vote");
    } finally {
      setVoting(false);
    }
  };

  const originalVerdict = verdictData?.verdict?.verdict;
  const judgeName = judgeInfo?.name ?? "Judge";
  const integrityPct = Math.round((judgeInfo?.integrity ?? 1) * 100);

  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg-0 px-4 pt-4 pb-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2 hover:text-t-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold text-t-0">Community Re-vote</h2>
        </div>

        <div className="px-4 space-y-5">
          {/* Dispute triggered banner */}
          <div className="rounded-card bg-no-bg border border-no-border p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-no shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-no">Verdict disputed</p>
              <p className="text-xs text-t-2 mt-0.5">
                The community has flagged this verdict. A re-vote is in progress.
              </p>
            </div>
          </div>

          {/* Question */}
          <p className="text-[15px] font-semibold text-t-0 leading-snug">
            "{verdictData?.market?.question}"
          </p>

          {/* Judge card with original verdict */}
          <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
              Original verdict
            </p>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  backgroundColor: (judgeInfo?.avatar_color ?? "#7B9EC8") + "22",
                  borderWidth: 2,
                  borderColor: judgeInfo?.avatar_color ?? "#7B9EC8",
                  color: judgeInfo?.avatar_color ?? "#7B9EC8",
                }}
              >
                {getInitials(judgeName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-t-0">{judgeName}</p>
                <p className="text-xs text-t-2">Integrity {integrityPct}%</p>
              </div>
              {originalVerdict && (
                <span
                  className={`text-2xl font-bold font-mono-num ${
                    originalVerdict === "yes" ? "text-yes" : "text-no"
                  }`}
                >
                  {originalVerdict.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Coins locked indicator */}
          <div className="rounded-card bg-coin-bg border border-coin-border p-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-coin" />
            <span className="text-sm font-semibold text-coin">
              {totalPool.toLocaleString()} coins locked
            </span>
            <span className="text-xs text-coin/60 ml-auto">until resolved</span>
          </div>

          {/* Vote section */}
          {!isResolved && (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                What actually happened?
              </p>
              {hasVoted ? (
                <div className="rounded-card bg-bg-2 border border-b-0 p-4 text-center">
                  <p className="text-sm font-semibold text-t-1">You've cast your vote</p>
                  <p className="text-xs text-t-2 mt-1">Waiting for other members…</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => castVote("yes")}
                    disabled={voting}
                    className="h-14 rounded-button text-base font-bold bg-yes-bg border border-yes-border text-yes active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    YES
                  </button>
                  <button
                    onClick={() => castVote("no")}
                    disabled={voting}
                    className="h-14 rounded-button text-base font-bold bg-no-bg border border-no-border text-no active:scale-[0.97] transition-all disabled:opacity-50"
                  >
                    NO
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolution banner */}
          {isResolved && (
            <div
              className={`rounded-card p-4 text-center space-y-1 ${
                dispute?.status === "upheld"
                  ? "bg-yes-bg border border-yes-border"
                  : "bg-no-bg border border-no-border"
              }`}
            >
              <p className={`text-lg font-bold ${dispute?.status === "upheld" ? "text-yes" : "text-no"}`}>
                {dispute?.status === "upheld" ? "Verdict upheld" : "Verdict overturned"}
              </p>
              <p className="text-xs text-t-2">
                Community voted:{" "}
                <span className="font-bold text-yes">{yesVotes} YES</span>
                {" · "}
                <span className="font-bold text-no">{noVotes} NO</span>
              </p>
              {dispute?.resolution_verdict && (
                <p className="text-sm text-t-1 mt-1">
                  Final result: <span className="font-bold font-mono-num">{dispute.resolution_verdict.toUpperCase()}</span>
                </p>
              )}
            </div>
          )}

          {/* Live tally */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                Member votes
              </p>
              <p className="text-xs text-t-2 font-mono-num">
                {votes.length} / {memberCount} voted
              </p>
            </div>

            {/* Tally bar */}
            {votes.length > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden bg-bg-2">
                {yesVotes > 0 && (
                  <div
                    className="bg-yes transition-all"
                    style={{ width: `${(yesVotes / (yesVotes + noVotes)) * 100}%` }}
                  />
                )}
                {noVotes > 0 && (
                  <div
                    className="bg-no transition-all"
                    style={{ width: `${(noVotes / (yesVotes + noVotes)) * 100}%` }}
                  />
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono-num font-semibold text-yes">{yesVotes} YES</span>
              <span className="font-mono-num font-semibold text-no">{noVotes} NO</span>
            </div>

            {/* Member list */}
            <div className="space-y-2">
              {members.map((m) => {
                const memberVote = votes.find((v) => v.user_id === m.id);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-card bg-bg-1 border border-b-0 p-3"
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: (m.avatar_color ?? "#7B9EC8") + "22",
                        borderWidth: 1.5,
                        borderColor: m.avatar_color ?? "#7B9EC8",
                        color: m.avatar_color ?? "#7B9EC8",
                      }}
                    >
                      {getInitials(m.name)}
                    </div>
                    <span className="text-sm font-semibold text-t-0 flex-1 truncate">
                      {m.name}
                    </span>
                    {memberVote ? (
                      <span
                        className={`text-xs font-bold font-mono-num ${
                          memberVote.vote === "yes" ? "text-yes" : "text-no"
                        }`}
                      >
                        {memberVote.vote.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-t-2">waiting…</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
