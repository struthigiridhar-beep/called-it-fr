import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MarketCard from "@/components/MarketCard";
import BetSheet from "@/components/BetSheet";
import OddsBar from "@/components/OddsBar";
import HomescreenNudge, { shouldShowNudge } from "@/components/HomescreenNudge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Side = "yes" | "no";
type Step = "preview" | "auth" | "homescreen-nudge" | "joined";
type AuthMode = "signup" | "signin";

const PENDING_BET_KEY = "calledit_pending_bet";

interface PendingBet {
  groupId: string;
  marketId: string;
  side: Side;
  amount: number;
}

function savePendingBet(bet: PendingBet) {
  localStorage.setItem(PENDING_BET_KEY, JSON.stringify(bet));
}

function loadPendingBet(groupId: string): PendingBet | null {
  try {
    const raw = localStorage.getItem(PENDING_BET_KEY);
    if (!raw) return null;
    const bet = JSON.parse(raw) as PendingBet;
    if (bet.groupId === groupId) return bet;
    return null;
  } catch {
    return null;
  }
}

function clearPendingBet() {
  localStorage.removeItem(PENDING_BET_KEY);
}

export default function JoinGroup() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("ref");
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();

  const [step, setStep] = useState<Step>("preview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Bet state
  const [betOpen, setBetOpen] = useState(false);
  const [betSide, setBetSide] = useState<Side>("yes");
  const [pendingBet, setPendingBet] = useState<{ side: Side; amount: number } | null>(null);
  const [joinProcessed, setJoinProcessed] = useState(false);

  // Fetch group
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["join-group", groupId],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").eq("id", groupId!).single();
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch inviter info
  const { data: invite } = useQuery({
    queryKey: ["invite", inviteCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("invites")
        .select("*, users:created_by(name, avatar_color)")
        .eq("code", inviteCode!)
        .single();
      return data;
    },
    enabled: !!inviteCode,
  });

  // Fetch group markets
  const { data: markets } = useQuery({
    queryKey: ["join-markets", groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from("markets")
        .select("*")
        .eq("group_id", groupId!)
        .eq("status", "open")
        .order("yes_pool", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!groupId,
  });

  // Fetch member avatars + count
  const { data: members } = useQuery({
    queryKey: ["join-members", groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("user_id, users:user_id(name, avatar_color)")
        .eq("group_id", groupId!)
        .limit(4);
      return data ?? [];
    },
    enabled: !!groupId,
  });

  const { data: memberCount } = useQuery({
    queryKey: ["join-member-count", groupId],
    queryFn: async () => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId!);
      return count ?? 0;
    },
    enabled: !!groupId,
  });

  // On mount: check for pending bet from localStorage (magic link return)
  useEffect(() => {
    if (!groupId) return;
    const saved = loadPendingBet(groupId);
    if (saved) {
      setPendingBet({ side: saved.side, amount: saved.amount });
    }
  }, [groupId]);

  // Auto-join group when user becomes authenticated
  useEffect(() => {
    if (!user || !groupId || joinProcessed) return;
    setJoinProcessed(true);

    (async () => {
      // Join group
      await supabase
        .from("group_members")
        .upsert(
          { user_id: user.id, group_id: groupId, coins: 500 },
          { onConflict: "user_id,group_id" }
        );

      // Credit inviter 50 coins
      if (invite) {
        await supabase.from("transactions").insert({
          user_id: (invite as any).created_by,
          type: "bonus" as const,
          amount: 50,
          reference_id: user.id,
        });
      }

      // Place pending bet if exists
      const saved = loadPendingBet(groupId);
      const bet = saved ?? pendingBet;
      const marketId = saved?.marketId ?? firstMarket?.id;

      if (bet && marketId) {
        await supabase.from("bets").insert({
          user_id: user.id,
          market_id: marketId,
          side: bet.side,
          amount: bet.amount,
        });
        // Update market pools optimistically
        if (bet.side === "yes") {
          await supabase
            .from("markets")
            .update({ yes_pool: (firstMarket?.yes_pool ?? 0) + bet.amount })
            .eq("id", marketId);
        } else {
          await supabase
            .from("markets")
            .update({ no_pool: (firstMarket?.no_pool ?? 0) + bet.amount })
            .eq("id", marketId);
        }
        setPendingBet(bet);
      }

      clearPendingBet();
      setStep("joined");
    })();
  }, [user, groupId]);

  const handleBetConfirm = (side: Side, amount: number) => {
    const realAmount = amount === -1 ? 100 : amount;
    const bet = { side, amount: realAmount };
    setPendingBet(bet);
    setBetOpen(false);
    setStep("auth");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      // Save pending bet to localStorage before auth
      if (pendingBet && groupId && firstMarket) {
        savePendingBet({
          groupId,
          marketId: firstMarket.id,
          side: pendingBet.side,
          amount: pendingBet.amount,
        });
      }
      if (authMode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // useEffect above handles step transition once user is set
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const inviterName = (invite as any)?.users?.name;
  const inviterColor = (invite as any)?.users?.avatar_color;
  const firstMarket = markets?.[0];
  const hiddenCount = Math.max(0, (markets?.length ?? 0) - 1);
  const fmTotal = (firstMarket?.yes_pool ?? 0) + (firstMarket?.no_pool ?? 0);
  const fmYesPct = fmTotal > 0 ? Math.round(((firstMarket?.yes_pool ?? 0) / fmTotal) * 100) : 50;
  const fmNoPct = 100 - fmYesPct;

  // ─── SCREEN 4: JOINED ───
  if (step === "joined") {
    const bet = pendingBet;
    const updatedYes = (firstMarket?.yes_pool ?? 0) + (bet?.side === "yes" ? bet.amount : 0);
    const updatedNo = (firstMarket?.no_pool ?? 0) + (bet?.side === "no" ? bet.amount : 0);
    const updatedTotal = updatedYes + updatedNo;
    const updatedYesPct = updatedTotal > 0 ? Math.round((updatedYes / updatedTotal) * 100) : 50;
    const updatedNoPct = 100 - updatedYesPct;

    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5 py-10">
        <div className="w-full max-w-sm mx-auto space-y-5">
          {/* Success banner */}
          <div className="w-full rounded-card border border-success-border bg-success-bg p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success flex items-center justify-center shrink-0">
              <svg className="h-5 w-5 text-bg-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-success font-semibold text-sm">You're in {group?.name}.</p>
              {inviterName && (
                <p className="text-coin text-xs">{inviterName} earns 50 coins for inviting you</p>
              )}
            </div>
          </div>

          {/* YOUR BET IS LIVE card */}
          {bet && firstMarket && (
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-success">
                Your bet is live
              </span>
              <p className="text-t-0 font-semibold text-[15px] leading-snug">
                {firstMarket.question}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-t-2">Your position:</span>
                <span className={`font-semibold ${bet.side === "yes" ? "text-yes" : "text-no"}`}>
                  {bet.side.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-t-2">Amount:</span>
                <span className="font-mono-num text-coin font-semibold">{bet.amount} coins</span>
              </div>
              <OddsBar yesPool={updatedYes} noPool={updatedNo} />
              <div className="flex items-center justify-between text-[11px] text-t-2">
                <span className="font-mono-num text-yes font-semibold">{updatedYesPct}% YES</span>
                <span className="font-mono-num">{updatedTotal.toLocaleString()} votes</span>
                <span className="font-mono-num text-no font-semibold">{updatedNoPct}% NO</span>
              </div>
            </div>
          )}

          {/* Inviter referral card */}
          {inviterName && (
            <div className="w-full rounded-card border border-b-1 bg-bg-1 p-4 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-t-0 shrink-0"
                style={{ backgroundColor: inviterColor ?? "hsl(var(--yes))" }}
              >
                {inviterName.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-t-1 text-xs leading-relaxed flex-1">
                {inviterName} invited you — they earn 50 coins each time you bet
              </p>
              <span className="font-mono-num text-coin font-bold text-sm shrink-0">+50 c</span>
            </div>
          )}

          <p className="text-center text-t-2 text-xs">
            You start with 500 coins. Use them wisely.
          </p>

          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="w-full h-12 rounded-button bg-bg-1 border border-b-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            See all markets
          </button>
        </div>
      </div>
    );
  }

  // ─── SCREEN 3: AUTH (email/password) ───
  if (step === "auth") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-start justify-start px-5 pt-14 bg-bg-0">
        <div className="w-full max-w-sm space-y-6">
          {/* Pending bet summary */}
          {pendingBet && firstMarket && (
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-coin">
                Your pending bet
              </span>
              <div className="flex items-start justify-between gap-3">
                <p className="text-t-1 text-sm leading-snug flex-1">
                  {firstMarket.question}
                </p>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm ${pendingBet.side === "yes" ? "text-yes" : "text-no"}`}>
                    {pendingBet.side.toUpperCase()}
                  </p>
                  <p className="font-mono-num text-t-2 text-xs">{pendingBet.amount} coins</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">One step to get in.</h1>
            <p className="text-t-1 text-sm">
              {authMode === "signup"
                ? "Create an account to join the group."
                : "Sign in to your account."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-button bg-bg-1 border-b-0 text-t-0 placeholder:text-t-2"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-button bg-bg-1 border-b-0 text-t-0 placeholder:text-t-2"
            />
            {authError && <p className="text-sm text-no">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-12 rounded-button bg-yes text-white hover:bg-yes/90 active:scale-[0.97] transition-all font-semibold text-sm disabled:opacity-50"
            >
              {authLoading
                ? "Loading…"
                : authMode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="text-center text-[11px] text-t-2">
            {authMode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => { setAuthMode("signin"); setAuthError(""); }} className="text-yes hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button onClick={() => { setAuthMode("signup"); setAuthError(""); }} className="text-yes hover:underline">
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // ─── SCREEN 1: GROUP PREVIEW ───
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5 py-10">
      <div className="w-full max-w-sm mx-auto space-y-6">
        {/* Inviter header */}
        {groupLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 bg-bg-2" />
            <Skeleton className="h-3 w-32 bg-bg-2" />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {inviterName && (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-t-0 shrink-0"
                style={{ backgroundColor: inviterColor ?? "hsl(var(--yes))" }}
              >
                {inviterName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-t-0 font-semibold text-sm">
                {inviterName ? `${inviterName} invited you` : "You've been invited"}
              </p>
              <p className="text-t-2 text-xs">
                to {group?.name ?? "…"} · {memberCount} members
              </p>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-t-0 leading-tight">
            There's already a market about you.
          </h1>
          <p className="text-t-1 text-sm">
            Join to see what your friends are actually predicting — and bet back.
          </p>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-wider text-coin">
          What's live in this group
        </p>

        {/* First market with "About you" badge */}
        {firstMarket ? (
          <div className="relative">
            <div className="absolute -top-2 right-3 z-10 bg-bg-2 border border-b-1 text-t-1 text-[10px] font-semibold px-2.5 py-1 rounded-pill">
              About you
            </div>
            <MarketCard
              question={firstMarket.question}
              category={firstMarket.category}
              yesPool={firstMarket.yes_pool}
              noPool={firstMarket.no_pool}
              deadline={firstMarket.deadline}
              onYes={() => { setBetSide("yes"); setBetOpen(true); }}
              onNo={() => { setBetSide("no"); setBetOpen(true); }}
              yesLabel="YES — join to bet"
              noLabel="NO — join to bet"
            />
          </div>
        ) : (
          <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
            <Skeleton className="h-5 w-full bg-bg-2 animate-pulse" />
            <Skeleton className="h-3 w-3/4 bg-bg-2 animate-pulse" />
            <Skeleton className="h-1.5 w-full bg-bg-2 rounded-pill animate-pulse" />
          </div>
        )}

        {/* Blurred locked markets */}
        {hiddenCount > 0 && (
          <div className="relative rounded-card border border-b-0 bg-bg-1 p-4 overflow-hidden">
            <div className="blur-sm opacity-40 space-y-2">
              <Skeleton className="h-4 w-full bg-bg-2" />
              <Skeleton className="h-3 w-2/3 bg-bg-2" />
              <Skeleton className="h-1.5 w-full bg-bg-2 rounded-pill" />
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <div className="flex items-center gap-2 text-t-2">
                <span className="text-base">🔒</span>
                <span className="text-xs">{hiddenCount} more markets — join to unlock</span>
              </div>
            </div>
          </div>
        )}

        {/* Member avatars */}
        {members && members.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.map((m: any, i: number) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full border-2 border-bg-0 flex items-center justify-center text-[9px] font-bold text-t-0"
                  style={{ backgroundColor: m.users?.avatar_color ?? "hsl(var(--yes))" }}
                >
                  {(m.users?.name ?? "?").slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-t-2">
              {memberCount} already inside
            </span>
          </div>
        )}

        {/* Join button */}
        <button
          onClick={() => setStep(user ? "joined" : "auth")}
          className="w-full h-12 rounded-button bg-bg-1 border border-b-1 text-t-0 hover:bg-bg-2 active:scale-[0.97] transition-all font-semibold text-base"
        >
          Join {group?.name ?? "group"}
        </button>
      </div>

      {/* Bet drawer */}
      {firstMarket && (
        <BetSheet
          open={betOpen}
          onOpenChange={setBetOpen}
          initialSide={betSide}
          question={firstMarket.question}
          yesPct={fmYesPct}
          noPct={fmNoPct}
          onConfirm={handleBetConfirm}
          referralMode
        />
      )}
    </div>
  );
}
