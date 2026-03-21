import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MarketCard from "@/components/MarketCard";
import BetSheet from "@/components/BetSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Side = "yes" | "no";
type Step = "preview" | "auth" | "joined";

export default function JoinGroup() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("ref");
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail } = useAuth();

  const [step, setStep] = useState<Step>("preview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Bet state for referral
  const [betOpen, setBetOpen] = useState(false);
  const [betSide, setBetSide] = useState<Side>("yes");
  const [betAmount, setBetAmount] = useState(0);
  const [hasBet, setHasBet] = useState(false);

  // Fetch group
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["join-group", groupId],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("*").eq("id", groupId!).single();
      return data;
    },
    enabled: !!groupId,
  });

  // Fetch inviter info via invite code
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

  // Fetch group markets (first 3 open)
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

  // Join group after auth
  useEffect(() => {
    if (!user || !groupId || step === "joined") return;
    (async () => {
      await supabase
        .from("group_members")
        .upsert({ user_id: user.id, group_id: groupId }, { onConflict: "user_id,group_id" });
      if (invite) {
        await supabase.from("transactions").insert({
          user_id: (invite as any).created_by,
          type: "bonus" as const,
          amount: 50,
          reference_id: user.id,
        });
      }
      setStep("joined");
    })();
  }, [user, groupId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (isSignUp) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBetConfirm = (side: Side, amount: number) => {
    const realAmount = amount === -1 ? 100 : amount;
    setBetSide(side);
    setBetAmount(realAmount);
    setHasBet(true);
    setBetOpen(false);
  };

  const inviterName = (invite as any)?.users?.name;
  const firstMarket = markets?.[0];
  const hiddenCount = Math.max(0, (markets?.length ?? 0) - 1);
  const fmTotal = (firstMarket?.yes_pool ?? 0) + (firstMarket?.no_pool ?? 0);
  const fmYesPct = fmTotal > 0 ? Math.round(((firstMarket?.yes_pool ?? 0) / fmTotal) * 100) : 50;
  const fmNoPct = 100 - fmYesPct;

  // ─── JOINED CONFIRMATION ───
  if (step === "joined") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center space-y-6">
          {hasBet ? (
            <>
              {/* Bet placed confirmation */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-t-0">Bet placed.</h1>
                <p className="text-t-1 text-sm">
                  <span className={betSide === "yes" ? "text-yes font-semibold" : "text-no font-semibold"}>
                    {betSide.toUpperCase()}
                  </span>
                  {" · "}
                  <span className="font-mono-num text-coin">{betAmount}</span> coins. They'll see it.
                </p>
                <p className="text-t-2 text-xs">Everyone will.</p>
              </div>

              {/* Starting balance */}
              <div className="w-full rounded-card border border-coin-border bg-coin-bg p-4 flex items-center justify-between">
                <span className="text-coin text-sm font-medium">Your starting balance</span>
                <span className="font-mono-num text-coin font-bold">
                  {(100 - betAmount > 0 ? 100 - betAmount : 0) + 400} coins
                </span>
              </div>

              {/* Now start your own */}
              <div className="w-full rounded-card border border-no-border bg-no-bg p-4 space-y-1">
                <p className="text-no font-semibold text-sm">Now start your own</p>
                <p className="text-t-1 text-xs">
                  Create a bet, send the link to your people. They'll come in to prove you wrong.
                </p>
              </div>

              <Button
                onClick={() => navigate(`/group/${groupId}`)}
                className="w-full h-12 rounded-button bg-success text-white hover:bg-success/90 active:scale-[0.97] transition-all font-semibold"
              >
                Create a market
              </Button>

              <button
                onClick={() => navigate(`/group/${groupId}`)}
                className="block w-full text-center text-sm text-t-2 hover:text-t-1 transition-colors"
              >
                Browse all markets
              </button>
            </>
          ) : (
            <>
              {/* You're in confirmation */}
              <div className="mx-auto h-16 w-16 rounded-card border border-b-1 bg-bg-1 flex items-center justify-center">
                <span className="text-xl font-bold text-t-0">CI</span>
              </div>

              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-t-0">You're in.</h1>
                <p className="text-t-1 text-sm">
                  Your bet is live. Now wait for your friends to disagree with you loudly and publicly.
                </p>
              </div>

              {inviterName && (
                <p className="text-center text-xs text-t-2">
                  {inviterName} invited you — they earn <span className="font-mono-num text-coin">50</span> coins each time you bet
                </p>
              )}

              <div className="w-full rounded-card border border-coin-border bg-coin-bg p-4 text-left space-y-1">
                <p className="text-coin font-semibold text-sm">Add to homescreen</p>
                <p className="text-t-1 text-xs">
                  Markets move fast. Add Called It to your homescreen so you never miss a verdict.
                </p>
              </div>

              <Button
                onClick={() => navigate(`/group/${groupId}`)}
                className="w-full h-12 rounded-button bg-success text-white hover:bg-success/90 active:scale-[0.97] transition-all font-semibold"
              >
                See my markets
              </Button>

              <button
                onClick={() => navigate(`/group/${groupId}`)}
                className="block w-full text-center text-sm text-t-2 hover:text-t-1 transition-colors"
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── AUTH SCREEN ───
  if (step === "auth") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 bg-bg-0">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">One tap to join.</h1>
            <p className="text-t-1 text-sm">
              Sign in to save your bets, track your coins, and let the group know you're in.
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
            <Button
              type="submit"
              disabled={authLoading}
              className="w-full h-12 rounded-button bg-yes text-white hover:bg-yes/90 active:scale-[0.97] transition-all font-semibold"
            >
              {authLoading ? "…" : isSignUp ? "Join with email" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-[11px] text-t-2">
            No spam. Just your friends roasting you when you're wrong.
          </p>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
            className="block w-full text-center text-xs text-t-2 hover:text-t-1 transition-colors"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  // ─── GROUP PREVIEW ───
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
                style={{ backgroundColor: (invite as any)?.users?.avatar_color ?? "hsl(var(--yes))" }}
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

        {/* First market */}
        {firstMarket ? (
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
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">{hiddenCount} more markets hidden until you join</span>
              </div>
              <span className="font-mono-num text-t-2 text-xs">+{hiddenCount}</span>
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
              {memberCount} already inside · betting live
            </span>
          </div>
        )}

        {/* Join button */}
        <Button
          onClick={() => setStep("auth")}
          className="w-full h-12 rounded-button bg-yes text-white hover:bg-yes/90 active:scale-[0.97] transition-all font-semibold"
        >
          Join {group?.name ?? "group"}
        </Button>
      </div>

      {/* Bet drawer (opens before auth, redirects to auth on confirm) */}
      {firstMarket && (
        <BetSheet
          open={betOpen}
          onOpenChange={(o) => {
            setBetOpen(o);
            if (!o && hasBet) setStep("auth");
          }}
          initialSide={betSide}
          question={firstMarket.question}
          yesPct={fmYesPct}
          noPct={fmNoPct}
          onConfirm={(side, amount) => {
            handleBetConfirm(side, amount);
            setStep("auth");
          }}
        />
      )}
    </div>
  );
}
