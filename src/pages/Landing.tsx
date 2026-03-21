import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeaturedMarket } from "@/hooks/useFeaturedMarket";
import MarketCard from "@/components/MarketCard";
import BetSheet from "@/components/BetSheet";
import ReactionPills from "@/components/ReactionPills";
import OddsBar from "@/components/OddsBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Side = "yes" | "no";
type Step = "browse" | "betting" | "post-bet" | "your-turn" | "auth" | "welcome";

const PROMPTS = [
  "Will [name] quit soon?",
  "Does our launch slip?",
  "Gym 3x this week?",
  "Still single by summer?",
];

export default function Landing() {
  const { user, signInWithOtp, signInWithGoogle } = useAuth();
  const { data: market, isLoading } = useFeaturedMarket();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("browse");
  const [betSide, setBetSide] = useState<Side>("yes");
  const [betAmount, setBetAmount] = useState(25);

  // Optimistic pool adjustments
  const [optimistic, setOptimistic] = useState<{ side: Side; amount: number } | null>(null);

  // "Your turn" prompt state
  const [customPrompt, setCustomPrompt] = useState("");
  const [shareReady, setShareReady] = useState(false);

  // Auth form state
  const [email, setEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  if (user && step === "welcome") {
    // show welcome screen
  } else if (user) {
    return <Navigate to="/home" replace />;
  }

  const yesPool = (market?.yes_pool ?? 0) + (optimistic?.side === "yes" ? optimistic.amount : 0);
  const noPool = (market?.no_pool ?? 0) + (optimistic?.side === "no" ? optimistic.amount : 0);
  const total = yesPool + noPool;
  const yesPct = total > 0 ? Math.round((yesPool / total) * 100) : 50;
  const noPct = 100 - yesPct;

  const handlePickSide = (side: Side) => {
    setBetSide(side);
    setStep("betting");
  };

  const handleConfirmBet = (side: Side, amount: number) => {
    const realAmount = amount === -1 ? 100 : amount;
    setBetSide(side);
    setBetAmount(realAmount);
    setOptimistic({ side, amount: realAmount });
    setStep("post-bet");
  };

  const handleSelectPrompt = (prompt: string) => {
    setCustomPrompt(prompt);
    setShareReady(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithOtp(email);
      setStep("welcome");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const shareLink = `${window.location.origin}/join/demo`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {}
  };

  // ─── Skeleton loader ───
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

  // ─── WELCOME SCREEN (post-auth) ───
  if (step === "welcome") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 bg-bg-0">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Logo */}
          <div className="mx-auto h-16 w-16 rounded-card border border-b-1 bg-bg-1 flex items-center justify-center">
            <span className="text-xl font-bold text-t-0">CI</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-t-0">You're in.</h1>
            <p className="text-t-1 text-sm">
              Your bet is live. Now wait for your friends to disagree with you loudly and publicly.
            </p>
          </div>

          {/* Add to homescreen prompt */}
          <div className="rounded-card border border-coin-border bg-coin-bg p-4 text-left space-y-1">
            <p className="text-coin font-semibold text-sm">Add to homescreen</p>
            <p className="text-t-1 text-xs">
              Markets move fast. Add Called It to your homescreen so you never miss a verdict.
            </p>
          </div>

          <Button
            onClick={() => navigate("/home")}
            className="w-full h-12 rounded-button bg-success text-white hover:bg-success/90 active:scale-[0.97] transition-all font-semibold"
          >
            See my markets
          </Button>

          <button
            onClick={() => navigate("/home")}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    );
  }

  // ─── YOUR TURN SCREEN (post-bet) ───
  if (step === "your-turn") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center px-5 bg-bg-0 pt-14">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-t-0">
              Your turn. What do you know?
            </h1>
            <p className="text-t-1 text-sm">
              Make a bet about someone you know. Share the link. Watch the coins flow.
            </p>
          </div>

          {/* Prompt picker */}
          <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
              Pick a prompt or write your own
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSelectPrompt(p)}
                  className={`px-3 py-2 rounded-pill text-xs font-medium transition-all border ${
                    customPrompt === p
                      ? "border-b-2 bg-bg-2 text-t-0"
                      : "border-b-0 bg-bg-2 text-t-1 hover:text-t-0"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <Input
              placeholder="Will [person] [do something] by [when]?"
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setShareReady(e.target.value.length > 5);
              }}
              className="h-12 rounded-button bg-bg-2 border-b-0 text-t-0 placeholder:text-t-2 text-sm"
            />
          </div>

          {/* Share section */}
          {shareReady && (
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-yes flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {user ? (user.email?.slice(0, 2).toUpperCase() ?? "CI") : "CI"}
                </div>
                <div>
                  <p className="text-t-1 text-xs">
                    Your link is ready. Send it — they have to join to see the odds.
                  </p>
                </div>
              </div>

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
          )}

          {/* Skip to auth */}
          <button
            onClick={() => setStep("auth")}
            className="w-full h-12 rounded-button bg-bg-1 border border-b-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            Skip — explore the app →
          </button>
        </div>
      </div>
    );
  }

  // ─── AUTH SCREEN (standalone) ───
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

  // ─── MAIN LANDING (browse + post-bet) ───
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
        {market && step === "browse" && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live right now
            </span>
            <span className="font-mono-num text-t-2">
              {total.toLocaleString()} coins in play
            </span>
          </div>
        )}

        {/* Featured market / skeleton */}
        {isLoading || !market ? (
          <MarketSkeleton />
        ) : step === "post-bet" ? (
          /* Post-bet state */
          <div className="space-y-4">
            {/* Compact bet summary */}
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-t-1 text-sm leading-snug flex-1">
                  {market.question}
                </p>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-sm ${betSide === "yes" ? "text-yes" : "text-no"}`}>
                    {betSide.toUpperCase()}
                  </p>
                  <p className="font-mono-num text-t-2 text-xs">{betAmount} coins</p>
                </div>
              </div>
              <OddsBar yesPool={yesPool} noPool={noPool} />
              <div className="flex items-center justify-between text-[11px] text-t-2">
                <span className="font-mono-num text-yes font-semibold">{yesPct}% YES</span>
                <span className="font-mono-num">{(total + 1).toLocaleString()} votes</span>
                <span className="font-mono-num text-no font-semibold">{noPct}% NO</span>
              </div>
            </div>

            {/* Reactions */}
            <div className="flex justify-center">
              <ReactionPills />
            </div>

            {/* Gold CTA card */}
            <div className="rounded-card border border-coin-border bg-coin-bg p-4 space-y-3">
              <h2 className="text-coin font-bold text-[15px]">Now make one about your crew</h2>
              <p className="text-t-1 text-sm leading-relaxed">
                Will Priya quit by Q3? Does your launch slip? Create a bet, share the link, watch them argue about it.
              </p>
              <button
                onClick={() => setStep("your-turn")}
                className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-0 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
              >
                Create your own bet →
              </button>
            </div>

            {/* Auth card */}
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <p className="text-t-1 text-sm">
                Save your vote + coins — takes 10 seconds.
              </p>
              <button
                onClick={() => signInWithGoogle()}
                className="w-full h-12 rounded-button border border-b-1 bg-bg-2 text-t-0 text-sm font-semibold hover:bg-bg-3 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
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

        {/* Skip link (browse state only) */}
        {step === "browse" && (
          <button
            onClick={() => setStep("auth")}
            className="block w-full text-center text-sm text-t-1 hover:text-t-0 transition-colors"
          >
            Skip → browse the app
          </button>
        )}
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
