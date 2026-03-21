import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MarketCard from "@/components/MarketCard";
import BetSheet from "@/components/BetSheet";
import OddsBar from "@/components/OddsBar";
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
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [step, setStep] = useState<Step>("preview");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Bet state
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
  const inviterColor = (invite as any)?.users?.avatar_color;
  const firstMarket = markets?.[0];
  const hiddenCount = Math.max(0, (markets?.length ?? 0) - 1);
  const fmTotal = (firstMarket?.yes_pool ?? 0) + (firstMarket?.no_pool ?? 0);
  const fmYesPct = fmTotal > 0 ? Math.round(((firstMarket?.yes_pool ?? 0) / fmTotal) * 100) : 50;
  const fmNoPct = 100 - fmYesPct;
  const startingBalance = 500 - betAmount;

  // ─── SCREEN 4: JOINED — BET PLACED ───
  if (step === "joined" && hasBet) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-t-0">Bet placed.</h1>
            <p className="text-t-1 text-sm">
              <span className={betSide === "yes" ? "text-yes font-semibold" : "text-no font-semibold"}>
                {betSide.toUpperCase()}
              </span>
              {" · "}
              <span className="font-mono-num">{betAmount}</span> coins. They'll see it.
            </p>
            <p className="text-t-2 text-sm">Everyone will.</p>
          </div>

          {/* Starting balance */}
          <div className="w-full rounded-card border border-coin-border bg-coin-bg px-4 py-3 flex items-center justify-between">
            <span className="text-coin text-sm font-medium">Your starting balance</span>
            <span className="font-mono-num text-coin font-bold text-lg">
              {startingBalance} <span className="text-sm font-normal">coins</span>
            </span>
          </div>

          {/* Now start your own */}
          <div className="w-full rounded-card border border-coin-border bg-coin-bg p-4 space-y-1">
            <p className="text-success font-semibold text-sm">Now start your own</p>
            <p className="text-t-1 text-xs leading-relaxed">
              Create a bet, send the link to your people. They'll come in to prove you wrong.
            </p>
          </div>

          <Button
            onClick={() => navigate(`/group/${groupId}`)}
            className="w-full h-12 rounded-button bg-success text-bg-0 hover:bg-success/90 active:scale-[0.97] transition-all font-semibold text-base"
          >
            Create a market
          </Button>

          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-1 text-sm font-medium hover:text-t-0 transition-colors"
          >
            Browse all markets
          </button>
        </div>
      </div>
    );
  }

  // ─── SCREEN 3: JOINED — NO BET ───
  if (step === "joined") {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center pt-14 space-y-5">
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
                <p className="text-coin text-xs">
                  {inviterName} gets 50 coins for the invite
                </p>
              )}
            </div>
          </div>

          {/* Featured market with "ABOUT YOU" badge */}
          {firstMarket && (
            <div className="w-full space-y-3">
              <div className="rounded-card border border-coin-border bg-coin-bg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-coin" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-coin">
                    There's a market about you
                  </span>
                </div>

                <p className="text-t-0 font-semibold text-[15px] leading-snug">
                  {firstMarket.question}
                </p>

                <OddsBar yesPool={firstMarket.yes_pool} noPool={firstMarket.no_pool} />

                <div className="flex items-center justify-between text-[11px] text-t-2">
                  <span className="font-mono-num text-yes font-semibold">{fmYesPct}% YES</span>
                  <span className="font-mono-num">
                    {fmTotal.toLocaleString()} coins · {/* bets count */}
                  </span>
                  <span className="font-mono-num text-no font-semibold">{fmNoPct}% NO</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setBetSide("yes"); setBetOpen(true); }}
                    className="h-12 rounded-button bg-yes-bg border border-yes-border text-yes font-semibold text-sm hover:bg-yes/10 active:scale-[0.97] transition-all leading-tight"
                  >
                    YES — they're right
                  </button>
                  <button
                    onClick={() => { setBetSide("no"); setBetOpen(true); }}
                    className="h-12 rounded-button bg-no-bg border border-no-border text-no font-semibold text-sm hover:bg-no/10 active:scale-[0.97] transition-all leading-tight"
                  >
                    NO — prove them wrong
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Referral info */}
          {inviterName && (
            <div className="w-full rounded-card border border-b-1 bg-bg-1 p-4 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-t-0 shrink-0"
                style={{ backgroundColor: inviterColor ?? "hsl(var(--yes))" }}
              >
                {inviterName.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-t-1 text-xs leading-relaxed flex-1">
                {inviterName} invited you. He earns 50 coins every time you place a bet.
              </p>
              <span className="font-mono-num text-coin font-bold text-sm shrink-0">+50 c</span>
            </div>
          )}

          <p className="text-center text-t-2 text-xs">
            You start with 500 coins. Use them wisely.
          </p>

          {/* Bottom CTA */}
          <div className="flex-1" />
          <button
            onClick={() => navigate(`/group/${groupId}`)}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-1 text-sm font-medium hover:text-t-0 transition-colors mb-10"
          >
            See all markets first
          </button>
        </div>

        {/* Bet drawer for post-join betting */}
        {firstMarket && (
          <BetSheet
            open={betOpen}
            onOpenChange={setBetOpen}
            initialSide={betSide}
            question={firstMarket.question}
            yesPct={fmYesPct}
            noPct={fmNoPct}
            onConfirm={(side, amount) => {
              handleBetConfirm(side, amount);
            }}
          />
        )}
      </div>
    );
  }

  // ─── SCREEN 2: AUTH ───
  if (step === "auth") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-start justify-start px-5 pt-16 bg-bg-0">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">One tap to join.</h1>
            <p className="text-t-1 text-sm">
              Sign in to save your bets, track your coins, and let the group know you're in.
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => signInWithGoogle()}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-0 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-b-0" />
            <span className="text-t-2 text-xs">or</span>
            <div className="flex-1 h-px bg-b-0" />
          </div>

          {/* Email form */}
          <form onSubmit={handleAuth} className="space-y-3">
            {isSignUp && (
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-button bg-bg-1 border-b-0 text-t-0 placeholder:text-t-2"
              />
            )}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-button bg-bg-1 border-b-0 text-t-0 placeholder:text-t-2"
            />
            {!isSignUp && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-button bg-bg-1 border-b-0 text-t-0 placeholder:text-t-2"
              />
            )}
            {authError && <p className="text-sm text-no">{authError}</p>}
            <Button
              type="submit"
              disabled={authLoading}
              className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-0 hover:bg-bg-2 active:scale-[0.97] transition-all font-semibold"
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
            {/* "About you" floating badge */}
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
          onClick={() => setStep(user ? "joined" : "auth")}
          className="w-full h-12 rounded-button bg-bg-1 border border-b-1 text-t-0 hover:bg-bg-2 active:scale-[0.97] transition-all font-semibold text-base"
        >
          Join {group?.name ?? "group"}
        </Button>
      </div>

      {/* Bet drawer */}
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
