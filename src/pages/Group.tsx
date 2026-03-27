import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import OddsBar from "@/components/OddsBar";
import BetSheet from "@/components/BetSheet";
import CreateMarketSheet from "@/components/CreateMarketSheet";
import RevealCeremony from "@/components/RevealCeremony";
import { toast } from "sonner";
import { Plus, Flag, AlertTriangle, Gavel } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useGroupMarkets } from "@/hooks/useGroupMarkets";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useJudgeAssignment } from "@/hooks/useJudgeAssignment";
import { useGroupFeed } from "@/hooks/useGroupFeed";
import FeedCard from "@/components/FeedCard";
import FeedReactions from "@/components/FeedReactions";
import { isToday, isYesterday, format as fmtDate } from "date-fns";
import { useGroupLeaderboard, type LeaderboardEntry } from "@/hooks/useGroupLeaderboard";
import { useActiveDispute } from "@/hooks/useActiveDispute";
import { useQuery } from "@tanstack/react-query";
import { getISOWeek } from "date-fns";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ChevronDown } from "lucide-react";

type Tab = "markets" | "feed" | "board" | "create";
type Side = "yes" | "no";

const ADMIN_EMAIL = "struthigiridhar@gmail.com";

interface MarketRow {
  id: string;
  question: string;
  yes_pool: number;
  no_pool: number;
  min_bet: number;
  deadline: string;
  status: string;
  is_public: boolean;
  is_pinned: boolean;
  group_id: string | null;
  created_at: string;
  created_by: string | null;
  category: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatDeadline(d: string) {
  try {
    return format(new Date(d), "MMM d");
  } catch {
    return "";
  }
}

export default function Group() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("markets");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMarket, setSheetMarket] = useState<MarketRow | null>(null);
  const [sheetSide, setSheetSide] = useState<Side>("yes");
  const [createOpen, setCreateOpen] = useState(false);
  const [revealMarketId, setRevealMarketId] = useState<string | null>(null);
  const [resolveMarket, setResolveMarket] = useState<MarketRow | null>(null);
  const [resolving, setResolving] = useState(false);

  const uid = user?.id;
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Group info (kept inline — single small query)
  const { data: group } = useQuery({
    queryKey: ["group-info", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("id, name").eq("id", groupId!).single();
      return data;
    },
  });

  // Custom hooks
  const { markets: groupMarkets, publicMarkets, userBets, verdicts: marketVerdicts, disputes, userFlags, memberCount } = useGroupMarkets(groupId, uid);
  const { balance: userCoins } = useUserBalance(uid, groupId);
  const { pendingMarkets: pendingVerdicts } = useJudgeAssignment(groupId, uid);
  const { events, reactions, users: feedUsers } = useGroupFeed(groupId);
  const feedUsersMap = new Map(feedUsers.map((u) => [u.id, u]));
  const { leaderboard, mostOverconfidentId } = useGroupLeaderboard(groupId);
  const { activeDispute } = useActiveDispute(groupId);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // User data for first_bet_at
  const { data: userData } = useQuery({
    queryKey: ["user-data", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data } = await supabase.from("users").select("first_bet_at").eq("id", uid!).single();
      return data;
    },
  });

  const betsByMarket = new Map(Object.entries(userBets));

  // First bet market detection
  const rawUserBets = Object.entries(userBets).map(([marketId, bet]) => ({ market_id: marketId, ...bet }));
  const firstBetMarketId = (() => {
    if (!userData?.first_bet_at) return null;
    const publicBetMarkets = rawUserBets.filter((b) =>
      publicMarkets.some((m) => m.id === b.market_id)
    );
    return publicBetMarkets.length ? publicBetMarkets[0]?.market_id ?? null : null;
  })();

  const statusOrder = (s: string) => s === "open" ? 0 : s === "closed" ? 1 : 2;

  const sortedGroupMarkets = [...groupMarkets].sort((a, b) => {
    const so = statusOrder(a.status) - statusOrder(b.status);
    if (so !== 0) return so;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const sortedPublicMarkets = [...publicMarkets].sort((a, b) => {
    if (a.id === firstBetMarketId) return -1;
    if (b.id === firstBetMarketId) return 1;
    const so = statusOrder(a.status) - statusOrder(b.status);
    if (so !== 0) return so;
    return (b.yes_pool + b.no_pool) - (a.yes_pool + a.no_pool);
  });

  const openSheet = (market: MarketRow, side: Side) => {
    const existingPosition = betsByMarket.get(market.id);
    setSheetMarket(market);
    setSheetSide(existingPosition ? existingPosition.side : side);
    setSheetOpen(true);
  };

  const handleFlag = async (verdictId: string) => {
    if (!uid) return;
    try {
      const { data, error } = await supabase.rpc("flag_verdict", {
        _verdict_id: verdictId,
        _user_id: uid,
      });
      if (error) throw error;
      toast.success(`Flagged (${(data as any)?.flags}/${(data as any)?.threshold} needed)`);
      queryClient.invalidateQueries({ queryKey: ["group-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["user-dispute-flags"] });
      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to flag");
    }
  };

  const confirmBet = async (side: Side, amount: number) => {
    if (!sheetMarket || !uid) return;

    const existingPosition = betsByMarket.get(sheetMarket.id);
    if (existingPosition && existingPosition.side !== side) {
      toast.error(`You already bet ${existingPosition.side.toUpperCase()}. You can only top up.`);
      return;
    }

    const finalAmount = Math.min(amount, userCoins);
    if (finalAmount <= 0) {
      toast.error("Not enough coins");
      return;
    }
    try {
      const { error: betErr } = await supabase.from("bets").insert({
        market_id: sheetMarket.id,
        user_id: uid,
        side,
        amount: finalAmount,
      });
      if (betErr) throw betErr;

      const poolCol = side === "yes" ? "yes_pool" : "no_pool";
      const currentPool = side === "yes" ? sheetMarket.yes_pool : sheetMarket.no_pool;
      await supabase
        .from("markets")
        .update({ [poolCol]: currentPool + finalAmount })
        .eq("id", sheetMarket.id);

      const newBalance = Math.max(0, userCoins - finalAmount);
      await supabase
        .from("group_members")
        .update({ coins: newBalance })
        .eq("group_id", sheetMarket.group_id ?? groupId!)
        .eq("user_id", uid);

      await supabase.from("transactions").insert({
        user_id: uid,
        amount: -finalAmount,
        type: "bet" as const,
        reference_id: sheetMarket.id,
      });

      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
      queryClient.invalidateQueries({ queryKey: ["public-markets"] });
      queryClient.invalidateQueries({ queryKey: ["user-bets"] });
      queryClient.invalidateQueries({ queryKey: ["group-membership"] });

      setSheetOpen(false);
      toast.success(`Bet ${finalAmount} coins on ${side.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to place bet");
    }
  };

  const handleAdminResolve = async (market: MarketRow, verdict: "yes" | "no") => {
    if (!uid || !isAdmin) return;
    setResolving(true);
    try {
      const { error: vErr } = await supabase.from("verdicts").insert({
        judge_id: uid,
        market_id: market.id,
        verdict,
        status: "committed",
      });
      if (vErr) throw vErr;

      const { error: rErr } = await supabase.rpc("resolve_market", {
        _market_id: market.id,
        _judge_id: uid,
      });
      if (rErr) throw rErr;

      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
      queryClient.invalidateQueries({ queryKey: ["public-markets"] });
      queryClient.invalidateQueries({ queryKey: ["group-market-verdicts"] });
      setResolveMarket(null);
      toast.success(`Resolved → ${verdict.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to resolve");
    } finally {
      setResolving(false);
    }
  };

  const renderMarketCard = (m: MarketRow, isPublic: boolean) => {
    const total = m.yes_pool + m.no_pool;
    const yesPct = total > 0 ? Math.round((m.yes_pool / total) * 100) : 50;
    const noPct = 100 - yesPct;
    const position = betsByMarket.get(m.id);
    const isFirstBet = m.id === firstBetMarketId;
    const estReturn = position
      ? Math.round(
          (position.amount /
            (position.side === "yes" ? m.yes_pool : m.no_pool || 1)) *
            total
        )
      : 0;

    const isResolved = m.status === "resolved";
    const isClosed = m.status === "closed";
    const verdictRow = marketVerdicts.find((v) => v.market_id === m.id);
    const isDisputed = m.status === "disputed";
    const disputeRow = verdictRow ? disputes.find((d) => d.verdict_id === verdictRow.id) : null;
    const hasFlagged = disputeRow ? userFlags.some((f) => f.dispute_id === disputeRow.id) : false;
    const flagThreshold = Math.floor(memberCount / 2) + 1;
    const canFlag = isResolved && verdictRow?.status === "committed" && verdictRow?.committed_at &&
      (new Date().getTime() - new Date(verdictRow.committed_at).getTime()) < 12 * 60 * 60 * 1000;

    return (
      <div key={m.id} className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3">
        {/* Capsule row */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPublic ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-yes-bg border border-yes-border text-yes">
              <span className="h-1.5 w-1.5 rounded-full bg-yes" />
              Public bet
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-bg-2 border border-b-1 text-t-1">
              <span className="h-1.5 w-1.5 rounded-full bg-t-2" />
              {group?.name ?? "Group"}
            </span>
          )}
          {isResolved && verdictRow?.verdict && (
            <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold ${
              verdictRow.verdict === "yes"
                ? "bg-yes-bg border border-yes-border text-yes"
                : "bg-no-bg border border-no-border text-no"
            }`}>
              Verdict: {verdictRow.verdict.toUpperCase()}
            </span>
          )}
          {isClosed && !isResolved && !isDisputed && (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-coin-bg border border-coin-border text-coin">
              Closed · awaiting verdict
            </span>
          )}
          {isDisputed && (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold bg-no-bg border border-no-border text-no">
              <AlertTriangle className="h-3 w-3" />
              Disputed
            </span>
          )}
          {isFirstBet && (
            <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-yes-bg border border-yes-border text-yes">
              Your first bet
            </span>
          )}
          {!isResolved && !isClosed && !isDisputed && (
            <span className="text-xs text-t-2 ml-auto">
              closes {formatDeadline(m.deadline)}
            </span>
          )}
        </div>

        <p className="text-[15px] font-semibold text-t-0 leading-snug">{m.question}</p>

        <OddsBar yesPool={m.yes_pool} noPool={m.no_pool} />

        <div className="flex items-center justify-between text-xs text-t-2">
          <span className="font-mono-num font-semibold text-yes">{yesPct}%</span>
          <span className="font-mono-num">{total.toLocaleString()} c</span>
          <span className="font-mono-num font-semibold text-no">{noPct}%</span>
        </div>

        {m.status === "open" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openSheet(m, "yes")}
              className="h-11 rounded-button text-sm font-semibold bg-yes-bg border border-yes-border text-yes active:scale-[0.97] transition-all"
            >
              YES
            </button>
            <button
              onClick={() => openSheet(m, "no")}
              className="h-11 rounded-button text-sm font-semibold bg-no-bg border border-no-border text-no active:scale-[0.97] transition-all"
            >
              NO
            </button>
          </div>
        )}

        {isClosed && !isResolved && (() => {
          const hasCommittedVerdict = marketVerdicts.some(
            (v) => v.market_id === m.id && v.status === "committed"
          );
          if (hasCommittedVerdict) {
            return (
              <button
                onClick={() => setRevealMarketId(m.id)}
                className="w-full h-11 rounded-button text-sm font-semibold bg-bg-2 border border-b-0 text-t-1 active:scale-[0.97] transition-all"
              >
                View result
              </button>
            );
          }
          // Admin resolve for public markets
          if (isPublic && isAdmin) {
            return (
              <button
                onClick={() => setResolveMarket(m)}
                className="w-full h-11 rounded-button text-sm font-semibold bg-coin-bg border border-coin-border text-coin flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              >
                <Gavel className="h-4 w-4" />
                Resolve
              </button>
            );
          }
          const isJudgeForMarket = pendingVerdicts.some((v) => v.id === m.id);
          if (isJudgeForMarket) {
            return (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/group/${groupId}/judge/${m.id}`)}
                  className="h-11 rounded-button text-sm font-semibold bg-coin-bg border border-coin-border text-coin active:scale-[0.97] transition-all"
                >
                  Pass verdict
                </button>
                <button
                  onClick={() => setRevealMarketId(m.id)}
                  className="h-11 rounded-button text-sm font-semibold bg-bg-2 border border-b-0 text-t-1 active:scale-[0.97] transition-all"
                >
                  Reveal →
                </button>
              </div>
            );
          }
          return (
            <button
              onClick={() => setRevealMarketId(m.id)}
              className="w-full h-11 rounded-button text-sm font-semibold bg-coin-bg border border-coin-border text-coin active:scale-[0.97] transition-all"
            >
              Reveal →
            </button>
          );
        })()}

        {isResolved && (
          <div className="space-y-2">
            <button
              onClick={() => setRevealMarketId(m.id)}
              className="w-full h-11 rounded-button text-sm font-semibold bg-bg-2 border border-b-0 text-t-1 active:scale-[0.97] transition-all"
            >
              View result
            </button>
            {canFlag && !hasFlagged && (
              <button
                onClick={() => verdictRow && handleFlag(verdictRow.id)}
                className="w-full h-9 rounded-button text-xs font-semibold bg-no-bg border border-no-border text-no flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all"
              >
                <Flag className="h-3 w-3" />
                Flag this verdict ({disputeRow?.flags ?? 0}/{flagThreshold})
              </button>
            )}
            {canFlag && hasFlagged && (
              <p className="text-xs text-t-2 text-center">
                You've flagged this verdict ({disputeRow?.flags ?? 0}/{flagThreshold})
              </p>
            )}
          </div>
        )}

        {isDisputed && disputeRow && (
          <button
            onClick={() => navigate(`/group/${groupId}/dispute/${disputeRow.id}`)}
            className="w-full h-11 rounded-button text-sm font-semibold bg-no-bg border border-no-border text-no flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
            Join re-vote →
          </button>
        )}

        {position && (
          <div className="flex items-center justify-between text-xs text-t-2 pt-1 border-t border-b-0">
            <span>
              Your position: {position.side.toUpperCase()} · <span className="font-mono-num">{position.amount}</span> c
            </span>
            <span className="font-mono-num font-semibold text-coin">
              {isResolved ? "" : `~${estReturn} c est.`}
            </span>
          </div>
        )}
      </div>
    );
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "markets", label: "Markets" },
    { key: "feed", label: "Feed" },
    { key: "board", label: "Board" },
  ];

  const handleTabChange = (t: Tab) => {
    if (t === "create") {
      setCreateOpen(true);
      return;
    }
    setTab(t);
  };

  return (
    <div className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="sticky top-0 z-10 bg-bg-0 px-4 pt-4 space-y-3">
          <h2 className="text-lg font-bold text-t-0">{group?.name ?? "Group"}</h2>

          <div className="flex items-center gap-4 border-b border-b-0">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`pb-2.5 text-sm font-semibold transition-colors ${
                  tab === t.key
                    ? "text-t-0 border-b-2 border-t-0"
                    : "text-t-2 border-b-2 border-transparent"
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-3 pb-2.5">
              <div className="flex items-center gap-1.5 rounded-pill bg-coin-bg border border-coin-border px-3 py-1">
                <span className="text-sm font-bold font-mono-num text-coin">{userCoins.toLocaleString()}</span>
                <span className="text-xs text-coin">c</span>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-sm font-semibold text-yes flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {tab === "markets" && (
            <>
              {pendingVerdicts.length > 0 && (
                <button
                  onClick={() => navigate(`/group/${groupId}/judge/${pendingVerdicts[0]?.id}`)}
                  className="w-full rounded-card bg-coin-bg border border-coin-border p-4 space-y-2 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-coin-bg border border-coin-border flex items-center justify-center text-sm font-semibold text-coin shrink-0">
                      {getInitials(user?.email ?? "JU")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-coin">You're the judge</p>
                      <p className="text-xs text-coin/70">
                        Commit verdict → · <span className="font-mono-num">{pendingVerdicts.length}</span> pending
                      </p>
                    </div>
                    <span className="text-2xl font-bold font-mono-num text-coin">
                      {pendingVerdicts.length}
                    </span>
                  </div>
                  <p className="text-sm text-t-1 italic">
                    "{pendingVerdicts[0]?.question}"
                  </p>
                </button>
              )}

              {groupMarkets.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Your Group</h3>
                  {sortedGroupMarkets.map((m) => renderMarketCard(m, false))}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Public · everyone can bet</h3>
                  <span className="rounded-pill px-2.5 py-1 text-[10px] font-semibold text-t-1 border border-b-1 bg-bg-2">Global</span>
                </div>
                {sortedPublicMarkets.map((m) => renderMarketCard(m, true))}
                {sortedPublicMarkets.length === 0 && (
                  <p className="text-sm text-t-2">No public markets yet.</p>
                )}
              </div>
            </>
          )}

          {tab === "feed" && (
            <div className="mt-4 space-y-1">
              {events.length === 0 ? (
                <p className="text-sm text-t-1">Nothing here yet.</p>
              ) : (
                (() => {
                  let lastDateLabel = "";
                  return events.map((e) => {
                    const d = e.created_at ? new Date(e.created_at) : null;
                    let dateLabel = "";
                    if (d) {
                      dateLabel = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : fmtDate(d, "MMM d");
                    }
                    const showSeparator = dateLabel !== lastDateLabel;
                    lastDateLabel = dateLabel;
                    const eventReactions = reactions.filter((r) => r.target_id === e.id);

                    return (
                      <div key={e.id}>
                        {showSeparator && dateLabel && (
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2 pt-4 pb-2">
                            {dateLabel}
                          </p>
                        )}
                        <div className="rounded-card border border-b-0 bg-bg-1 p-3 space-y-2.5">
                          <FeedCard
                            event={e}
                            users={feedUsersMap}
                            onYes={(mId) => {
                              const m = [...groupMarkets, ...publicMarkets].find((x) => x.id === mId);
                              if (m) openSheet(m, "yes");
                            }}
                            onNo={(mId) => {
                              const m = [...groupMarkets, ...publicMarkets].find((x) => x.id === mId);
                              if (m) openSheet(m, "no");
                            }}
                          />
                          <FeedReactions
                            eventId={e.id}
                            groupId={groupId!}
                            reactions={eventReactions}
                            userId={uid}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}

            </div>
          )}

          {tab === "board" && (
            <div className="mt-4 space-y-3">
              <h3 className="text-base font-semibold text-t-0">Leaderboard</h3>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-t-1">No data yet.</p>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </div>

      {sheetMarket && (
        <BetSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          initialSide={sheetSide}
          question={sheetMarket.question}
          yesPct={
            (sheetMarket.yes_pool + sheetMarket.no_pool) > 0
              ? Math.round((sheetMarket.yes_pool / (sheetMarket.yes_pool + sheetMarket.no_pool)) * 100)
              : 50
          }
          noPct={
            (sheetMarket.yes_pool + sheetMarket.no_pool) > 0
              ? Math.round((sheetMarket.no_pool / (sheetMarket.yes_pool + sheetMarket.no_pool)) * 100)
              : 50
          }
          onConfirm={confirmBet}
          minBet={sheetMarket.min_bet}
          userCoins={userCoins}
          groupName={sheetMarket.is_public ? undefined : (group?.name ?? undefined)}
          totalPool={sheetMarket.yes_pool + sheetMarket.no_pool}
          yesSidePool={sheetMarket.yes_pool}
          noSidePool={sheetMarket.no_pool}
          lockedSide={betsByMarket.get(sheetMarket.id)?.side}
        />
      )}

      <CreateMarketSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupId={groupId!}
        groupName={group?.name ?? "Group"}
      />

      {revealMarketId && (
        <RevealCeremony
          open={!!revealMarketId}
          onClose={() => setRevealMarketId(null)}
          marketId={revealMarketId}
          groupId={groupId!}
          groupName={group?.name ?? "Group"}
          initialState={
            groupMarkets.find((m) => m.id === revealMarketId)?.status === "resolved"
            || marketVerdicts.some((v) => v.market_id === revealMarketId && v.status === "committed")
              ? 3 : 1
          }
        />
      )}

      {/* Admin resolve sheet for public markets */}
      <Sheet open={!!resolveMarket} onOpenChange={(open) => !open && setResolveMarket(null)}>
        <SheetContent side="bottom" className="bg-bg-0 border-t border-b-1 rounded-t-[20px] px-6 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="text-t-0 text-base font-bold">Resolve Market</SheetTitle>
            <SheetDescription className="text-t-2 text-sm">
              {resolveMarket?.question}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-t-2">
              <span>Total pool</span>
              <span className="font-mono-num font-semibold text-coin">
                {((resolveMarket?.yes_pool ?? 0) + (resolveMarket?.no_pool ?? 0)).toLocaleString()} c
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={resolving}
                onClick={() => resolveMarket && handleAdminResolve(resolveMarket, "yes")}
                className="h-12 rounded-button text-sm font-bold bg-yes-bg border border-yes-border text-yes active:scale-[0.97] transition-all disabled:opacity-50"
              >
                YES wins
              </button>
              <button
                disabled={resolving}
                onClick={() => resolveMarket && handleAdminResolve(resolveMarket, "no")}
                className="h-12 rounded-button text-sm font-bold bg-no-bg border border-no-border text-no active:scale-[0.97] transition-all disabled:opacity-50"
              >
                NO wins
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
}
