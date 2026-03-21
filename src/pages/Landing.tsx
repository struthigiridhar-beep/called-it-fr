import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeaturedMarket } from "@/hooks/useFeaturedMarket";
import MarketCard from "@/components/MarketCard";
import BetSheet from "@/components/BetSheet";
import OddsBar from "@/components/OddsBar";
import HomescreenNudge, { shouldShowNudge } from "@/components/HomescreenNudge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Side = "yes" | "no";
type Step = "browse" | "betting" | "create-bet" | "auth" | "homescreen-nudge" | "bet-placed" | "market-live";
type AuthMode = "signup" | "signin";

interface PendingBet {
  side: Side;
  amount: number;
  marketId: string;
  question: string;
  yesPct: number;
}

interface PendingMarket {
  question: string;
}

export default function Landing() {
  const { user, signUp, signIn } = useAuth();
  const { data: market, isLoading } = useFeaturedMarket();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("browse");
  const [betSide, setBetSide] = useState<Side>("yes");
  const [pendingBet, setPendingBet] = useState<PendingBet | null>(null);
  const [pendingMarket, setPendingMarket] = useState<PendingMarket | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");

  // Auth
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // On auth: if user becomes authenticated while on auth step, advance
  useEffect(() => {
    if (!user) return;
    if (step === "auth") {
      if (shouldShowNudge()) {
        setStep("homescreen-nudge");
      } else if (pendingBet) {
        setStep("bet-placed");
      } else if (pendingMarket) {
        setStep("market-live");
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [user]);

  // Redirect authenticated users with no pending actions
  if (user && !["bet-placed", "market-live", "auth", "homescreen-nudge"].includes(step)) {
    return <Navigate to="/home" replace />;
  }

  const yesPool = market?.yes_pool ?? 0;
  const noPool = market?.no_pool ?? 0;
  const total = yesPool + noPool;
  const yesPct = total > 0 ? Math.round((yesPool / total) * 100) : 50;
  const noPct = 100 - yesPct;

  const handlePickSide = (side: Side) => {
    setBetSide(side);
    setStep("betting");
  };

  const handleConfirmBet = (side: Side, amount: number) => {
    if (!market) return;
    const realAmount = amount === -1 ? 500 : amount;
    const bet: PendingBet = {
      side,
      amount: realAmount,
      marketId: market.id,
      question: market.question,
      yesPct,
    };
    setPendingBet(bet);
    setStep("auth");
  };

  const handleCreateBet = () => {
    if (customQuestion.length < 5) return;
    setPendingMarket({ question: customQuestion });
    setStep("auth");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      // useEffect above will handle step transition once user is set
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const shareLink = `${window.location.origin}/join/demo`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareLink); } catch {}
  };

  const MarketSkeleton = () => (
    <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
      <Skeleton className="h-3 w-24 bg-bg-2 animate-pulse" />
      <Skeleton className="h-5 w-full bg-bg-2 animate-pulse" />
      <Skeleton className="h-4 w-3/4 bg-bg-2 animate-pulse" />
      <Skeleton className="h-1.5 w-full bg-bg-2 rounded-pill animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-button bg-bg-2 animate-pulse" />
        <Skeleton className="h-11 rounded-button bg-bg-2 animate-pulse" />
      </div>
    </div>
  );

  // ─── HOMESCREEN NUDGE ───
  if (step === "homescreen-nudge") {
    return (
      <HomescreenNudge
        onContinue={() => {
          if (pendingBet) {
            setStep("bet-placed");
          } else if (pendingMarket) {
            setStep("market-live");
          } else {
            navigate("/home", { replace: true });
          }
        }}
      />
    );
  }

  // ─── BET PLACED (Screen 5a) ───
  if (step === "bet-placed" && pendingBet) {
    const odds = pendingBet.yesPct;
    return (
      <div className="flex min-h-[100dvh] flex-col px-5 bg-bg-0 pt-14">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-t-0">Bet placed.</h1>

          {/* YOUR POSITION card */}
          <div className="rounded-card border border-yes-border bg-bg-1 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-yes">
              Your position
            </p>
            <p className="text-t-0 font-semibold text-[15px] leading-snug">
              {pendingBet.question}
            </p>
            <OddsBar yesPool={pendingBet.yesPct} noPool={100 - pendingBet.yesPct} />
            <div className="flex items-center justify-between text-sm">
              <span className={`font-semibold ${pendingBet.side === "yes" ? "text-yes" : "text-no"}`}>
                {pendingBet.side.toUpperCase()} · <span className="font-mono-num">{pendingBet.amount}</span> coins
              </span>
              <span className="font-mono-num text-t-2">
                {pendingBet.side === "yes" ? odds : 100 - odds}% odds
              </span>
            </div>
          </div>

          {/* Gold CTA card */}
          <div className="rounded-card border border-coin-border bg-coin-bg p-4 space-y-2">
            <h2 className="text-coin font-bold text-[15px]">Now make one about your crew</h2>
            <p className="text-t-1 text-sm leading-relaxed">
              Will Priya quit? Does your launch slip? Create a bet and share the link — they come to you.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate("/home")}
              className="w-full h-12 rounded-button border border-coin-border bg-bg-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
            >
              Create your own bet →
            </button>
            <button
              onClick={() => navigate("/home")}
              className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-2 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
            >
              Explore the app
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MARKET LIVE (Screen 5b) ───
  if (step === "market-live" && pendingMarket) {
    return (
      <div className="flex min-h-[100dvh] flex-col px-5 bg-bg-0 pt-14">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-t-0">You're live.</h1>

          <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
            <p className="text-t-0 font-bold text-[15px] leading-snug">
              {pendingMarket.question}
            </p>
            <p className="text-t-1 text-sm leading-relaxed">
              Your market is live. Share the link — they have to join to see the odds.
            </p>
            <div className="rounded-button bg-bg-2 border border-b-0 px-3 py-2.5 text-xs font-mono-num text-t-2 truncate">
              {shareLink}
            </div>
            <div className="flex gap-2">
              {["WhatsApp", "Copy link", "iMessage"].map((label) => (
                <button
                  key={label}
                  onClick={label === "Copy link" ? copyLink : undefined}
                  className="flex-1 h-9 rounded-button bg-bg-2 border border-b-0 text-t-1 text-xs font-medium hover:text-t-0 hover:border-b-1 transition-all active:scale-[0.97]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-t-1 text-sm">
            You start with 500 coins. Place a bet on your own market too.
          </p>

          <button
            onClick={() => navigate("/home")}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            See my markets
          </button>
        </div>
      </div>
    );
  }

  // ─── AUTH (Screen 3a / 3b) ───
  if (step === "auth") {
    const isBetFlow = !!pendingBet;
    return (
      <div className="flex min-h-[100dvh] flex-col px-5 bg-bg-0 pt-14">
        <div className="w-full max-w-sm mx-auto space-y-6 flex-1 flex flex-col">
          {/* Pending bet card */}
          {pendingBet && (
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                Your pending bet
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${pendingBet.side === "yes" ? "text-yes" : "text-no"}`}>
                  {pendingBet.side.toUpperCase()}
                </span>
                <span className="text-sm font-mono-num text-coin font-semibold">
                  {pendingBet.amount}
                </span>
                <span className="text-t-1 text-sm truncate flex-1">
                  {pendingBet.question}
                </span>
              </div>
            </div>
          )}

          {/* Pending market card */}
          {pendingMarket && (
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
                Your market
              </p>
              <p className="text-t-0 font-bold text-[15px] leading-snug">
                {pendingMarket.question}
              </p>
              <p className="text-t-1 text-sm">
                Goes live the moment you sign in. Your link is ready.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">
              {isBetFlow ? "Save your bet." : "One step to go live."}
            </h1>
            <p className="text-t-1 text-sm">
              {authMode === "signup"
                ? "Create an account to lock it in."
                : "Sign in to your account."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-button bg-bg-2 border-b-0 text-t-0 placeholder:text-t-2"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 rounded-button bg-bg-2 border-b-0 text-t-0 placeholder:text-t-2"
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

          <div className="flex-1" />
        </div>
      </div>
    );
  }

  // ─── CREATE BET ───
  if (step === "create-bet") {
    return (
      <div className="flex min-h-[100dvh] flex-col px-5 bg-bg-0 pt-14">
        <div className="w-full max-w-sm mx-auto space-y-6 flex-1 flex flex-col">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">Create your own bet</h1>
            <p className="text-t-1 text-sm">
              Write a yes/no question about someone you know. Share the link — they have to join to see the odds.
            </p>
          </div>

          <Input
            placeholder="Will [person] [do something] by [when]?"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            className="h-12 rounded-button bg-bg-2 border-b-0 text-t-0 placeholder:text-t-2"
          />

          <div className="flex-1" />

          <div className="pb-8 space-y-3">
            <button
              onClick={handleCreateBet}
              disabled={customQuestion.length < 5}
              className="w-full h-12 rounded-button bg-success text-white text-sm font-semibold hover:bg-success/90 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              Continue →
            </button>
            <button
              onClick={() => setStep("browse")}
              className="w-full text-center text-sm text-t-2 hover:text-t-1 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── BROWSE (Screen 1) ───
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 bg-bg-0">
      <div className="w-full max-w-sm space-y-6 py-12">
        {/* Brand */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-t-0" style={{ lineHeight: 1.05 }}>
            Called It.
          </h1>
          <p className="text-t-1 text-sm">
            Prediction markets for people who actually know each other.
          </p>
        </div>

        {/* Live indicator */}
        {market && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live now
            </span>
            <span className="font-mono-num text-t-2">
              {total.toLocaleString()} coins in play
            </span>
          </div>
        )}

        {/* Featured market */}
        {isLoading || !market ? (
          <MarketSkeleton />
        ) : (
          <MarketCard
            question={market.question}
            category={market.category}
            yesPool={yesPool}
            noPool={noPool}
            deadline={market.deadline}
            onYes={() => handlePickSide("yes")}
            onNo={() => handlePickSide("no")}
            isPublic={market.is_public}
          />
        )}

        {/* Create your own bet card */}
        <button
          onClick={() => setStep("create-bet")}
          className="w-full rounded-card border border-b-1 bg-bg-1 p-4 flex items-center justify-between text-left hover:bg-bg-2 active:scale-[0.98] transition-all"
        >
          <span className="text-t-1 text-sm">Create your own bet instead</span>
          <span className="text-t-2 text-sm">›</span>
        </button>
      </div>

      {/* Bet drawer */}
      {market && (
        <BetSheet
          open={step === "betting"}
          onOpenChange={(o) => { if (!o) setStep("browse"); }}
          initialSide={betSide}
          question={market.question}
          yesPct={yesPct}
          noPct={noPct}
          onConfirm={handleConfirmBet}
        />
      )}
    </div>
  );
}
