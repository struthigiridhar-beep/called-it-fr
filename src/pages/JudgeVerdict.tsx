import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, AlertTriangle, Check } from "lucide-react";
import OddsBar from "@/components/OddsBar";
import BottomNav from "@/components/BottomNav";
import RevealCeremony from "@/components/RevealCeremony";
import { toast } from "sonner";

type VerdictChoice = "yes" | "no" | null;

export default function JudgeVerdict() {
  const { groupId, marketId } = useParams<{ groupId: string; marketId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const uid = user?.id;

  const [choice, setChoice] = useState<VerdictChoice>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCeremony, setShowCeremony] = useState(false);

  // Fetch market
  const { data: market } = useQuery({
    queryKey: ["market", marketId],
    enabled: !!marketId,
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId!)
        .single();
      return data;
    },
  });

  // Fetch group
  const { data: group } = useQuery({
    queryKey: ["group-info", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("id, name").eq("id", groupId!).single();
      return data;
    },
  });

  // Fetch verdict row
  const { data: verdict } = useQuery({
    queryKey: ["verdict", marketId, uid],
    enabled: !!marketId && !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("verdicts")
        .select("*")
        .eq("market_id", marketId!)
        .eq("judge_id", uid!)
        .single();
      return data;
    },
  });

  // Fetch bets aggregate
  const { data: betsAgg } = useQuery({
    queryKey: ["bets-agg", marketId],
    enabled: !!marketId,
    queryFn: async () => {
      const { data } = await supabase
        .from("bets")
        .select("side, user_id")
        .eq("market_id", marketId!);
      const rows = data ?? [];
      const yesUsers = new Set(rows.filter((b) => b.side === "yes").map((b) => b.user_id));
      const noUsers = new Set(rows.filter((b) => b.side === "no").map((b) => b.user_id));
      return { yesBettors: yesUsers.size, noBettors: noUsers.size };
    },
  });

  // User's own bet on this market
  const { data: userBet } = useQuery({
    queryKey: ["user-bet", marketId, uid],
    enabled: !!marketId && !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("bets")
        .select("side, amount")
        .eq("market_id", marketId!)
        .eq("user_id", uid!);
      if (!data?.length) return null;
      const total = data.reduce((s, b) => s + b.amount, 0);
      return { side: data[0].side, amount: total };
    },
  });

  // Judge integrity
  const { data: membership } = useQuery({
    queryKey: ["judge-membership", groupId, uid],
    enabled: !!groupId && !!uid,
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("judge_integrity")
        .eq("group_id", groupId!)
        .eq("user_id", uid!)
        .single();
      return data;
    },
  });

  // Fetch judge user name
  const { data: judgeUser } = useQuery({
    queryKey: ["user-name", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("name").eq("id", uid!).single();
      return data;
    },
  });

  const integrity = membership?.judge_integrity ?? 1;
  const integrityPct = Math.round(Number(integrity) * 100);
  const hasConflict = !!userBet;
  const isCommitted = verdict?.status === "committed";

  if (!market || !verdict) {
    return (
      <div className="min-h-[100dvh] bg-bg-0 flex items-center justify-center">
        <p className="text-t-2 text-sm">Loading…</p>
      </div>
    );
  }

  const total = market.yes_pool + market.no_pool;
  const yesPct = total > 0 ? Math.round((market.yes_pool / total) * 100) : 50;
  const noPct = 100 - yesPct;

  const handleCommit = async () => {
    if (!choice || !uid || !verdict) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("verdicts")
        .update({
          verdict: choice,
          status: "committed",
          committed_at: new Date().toISOString(),
        })
        .eq("id", verdict.id);
      if (error) throw error;

      // Update market status to resolved
      await supabase
        .from("markets")
        .update({ status: "resolved" })
        .eq("id", market.id);

      queryClient.invalidateQueries({ queryKey: ["verdict"] });
      queryClient.invalidateQueries({ queryKey: ["market"] });
      queryClient.invalidateQueries({ queryKey: ["pending-verdicts"] });
      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
      queryClient.invalidateQueries({ queryKey: ["group-market-verdicts"] });
      setShowCeremony(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to commit verdict");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Committed view ──────────────────────────────────────
  if (isCommitted) {
    return (
      <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to={`/group/${groupId}`} className="text-t-2 hover:text-t-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-bold text-t-0 flex-1">Verdict committed</h1>
            <div className="flex items-center gap-1.5 rounded-pill bg-success-bg border border-success-border px-2.5 py-1">
              <Shield className="h-3 w-3 text-success" />
              <span className="text-xs font-semibold text-success">{integrityPct}%</span>
            </div>
          </div>

          {/* Your verdict card */}
          <div className="rounded-card border border-b-0 bg-bg-1 p-5 space-y-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Your verdict</p>
            <div className={`text-5xl font-bold ${verdict.verdict === "yes" ? "text-yes" : "text-no"}`}>
              {verdict.verdict?.toUpperCase()}
            </div>
            <p className="text-sm text-t-1">{market.question}</p>
            <div className="flex items-center justify-center gap-2 text-xs text-t-2">
              <span>Judge: {judgeUser?.name ?? "You"}</span>
              <span>·</span>
              <span className="text-success">{integrityPct}% integrity</span>
            </div>
          </div>

          {/* 12h flag window */}
          <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">12h flag window</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-t-1">Flags so far</span>
              <span className="font-mono-num font-semibold text-t-0">0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-t-1">Your stake status</span>
              <span className="font-semibold text-t-0">{hasConflict ? "Frozen" : "No stake"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-t-1">Integrity on the line</span>
              <span className="font-mono-num font-semibold text-coin">{integrityPct}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => setShowCeremony(true)}
              className="w-full h-12 rounded-button bg-bg-2 border border-b-0 text-sm font-semibold text-t-1"
            >
              View verdict
            </button>
            <Link
              to={`/group/${groupId}`}
              className="block w-full h-12 rounded-button bg-yes text-white text-sm font-semibold text-center leading-[48px]"
            >
              Back to markets
            </Link>
          </div>
        </div>
        {showCeremony && groupId && marketId && (
          <RevealCeremony
            open={showCeremony}
            onClose={() => setShowCeremony(false)}
            marketId={marketId}
            groupId={groupId}
            groupName={group?.name ?? "Group"}
            initialState={3}
          />
        )}
        <BottomNav />
      </div>
    );
  }

  // ─── Voting view ──────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28 px-4 pt-4 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to={`/group/${groupId}`} className="text-t-2 hover:text-t-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-t-0">Judge assignment</h1>
            <p className="text-xs text-t-2">{group?.name ?? "Group"}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-pill bg-success-bg border border-success-border px-2.5 py-1">
            <Shield className="h-3 w-3 text-success" />
            <span className="text-xs font-semibold text-success">{integrityPct}%</span>
          </div>
        </div>

        {/* Assignment badge */}
        <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-yes-bg border border-yes-border text-yes">
              <span className="h-1.5 w-1.5 rounded-full bg-yes" />
              Randomly assigned
            </span>
            <span className="text-xs text-t-2 ml-auto">
              {hasConflict ? "Smallest stake" : "You didn't bet"}
            </span>
          </div>
        </div>

        {/* Market card */}
        <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-coin-bg border border-coin-border text-coin">
            Market closed · awaiting verdict
          </span>
          <p className="text-[15px] font-semibold text-t-0 leading-snug">{market.question}</p>
          <OddsBar yesPool={market.yes_pool} noPool={market.no_pool} />
          <div className="flex items-center justify-between text-xs text-t-2">
            <span>
              <span className="font-mono-num font-semibold text-yes">{yesPct}%</span>
              <span className="ml-1">· {betsAgg?.yesBettors ?? 0} bettors</span>
            </span>
            <span className="font-mono-num">{total.toLocaleString()} c</span>
            <span>
              <span className="font-mono-num font-semibold text-no">{noPct}%</span>
              <span className="ml-1">· {betsAgg?.noBettors ?? 0} bettors</span>
            </span>
          </div>
        </div>

        {/* Conflict status */}
        <div className={`rounded-card border p-4 flex items-center gap-3 ${
          hasConflict
            ? "bg-coin-bg border-coin-border"
            : "bg-success-bg border-success-border"
        }`}>
          {hasConflict ? (
            <>
              <AlertTriangle className="h-5 w-5 text-coin shrink-0" />
              <div>
                <p className="text-sm font-semibold text-coin">Conflict noted</p>
                <p className="text-xs text-coin/70">
                  You bet {userBet.amount} c on {userBet.side.toUpperCase()} · stake frozen until verdict
                </p>
              </div>
            </>
          ) : (
            <>
              <Check className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-semibold text-success">No conflict</p>
                <p className="text-xs text-success/70">You have no position in this market</p>
              </div>
            </>
          )}
        </div>

        {/* YES / NO verdict buttons */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Your verdict</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setChoice("yes")}
              className={`h-14 rounded-button text-sm font-semibold transition-all ${
                choice === "yes"
                  ? "bg-yes-bg border-2 border-yes text-yes"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              YES — {yesPct}%
            </button>
            <button
              onClick={() => setChoice("no")}
              className={`h-14 rounded-button text-sm font-semibold transition-all ${
                choice === "no"
                  ? "bg-no-bg border-2 border-no text-no"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              NO — {noPct}%
            </button>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleCommit}
          disabled={!choice || submitting}
          className={`w-full h-12 rounded-button font-semibold text-sm transition-all ${
            choice
              ? choice === "yes"
                ? "bg-yes text-white active:scale-[0.97]"
                : "bg-no text-white active:scale-[0.97]"
              : "bg-bg-2 border border-b-0 text-t-2 cursor-not-allowed"
          }`}
        >
          {choice
            ? `Commit: ${choice.toUpperCase()} — ${choice === "yes" ? "it happened" : "it didn't"}`
            : "Select YES or NO to commit"}
        </button>

        {/* How judging works */}
        <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">How judging works</p>
          <div className="space-y-3">
            {[
              { n: 1, title: "Integrity score", desc: "Your integrity score starts at 100%. Overturned verdicts reduce it. High integrity = more trust + bonus coins." },
              { n: 2, title: "12h flag window", desc: "After you commit, other bettors have 12 hours to flag your verdict. If 50%+ flag it, a dispute is opened." },
              { n: 3, title: "Bonus for surviving", desc: "If your verdict survives the flag window with no dispute, you earn bonus coins and XP." },
            ].map((r) => (
              <div key={r.n} className="flex gap-3">
                <span className="h-6 w-6 rounded-full bg-bg-2 border border-b-0 flex items-center justify-center text-xs font-semibold text-t-1 shrink-0">
                  {r.n}
                </span>
                <div>
                  <p className="text-sm font-semibold text-t-0">{r.title}</p>
                  <p className="text-xs text-t-2 leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Reveal Ceremony */}
      {showCeremony && groupId && marketId && (
        <RevealCeremony
          open={showCeremony}
          onClose={() => {
            setShowCeremony(false);
            navigate(`/group/${groupId}`);
          }}
          marketId={marketId}
          groupId={groupId}
          groupName={group?.name ?? "Group"}
          initialState={3}
        />
      )}
      <BottomNav />
    </div>
  );
}
