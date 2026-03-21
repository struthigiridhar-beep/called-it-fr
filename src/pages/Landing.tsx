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
  const { user, signInWithEmail, signUpWithEmail } = useAuth();
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
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
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
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
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
            className="block w-full text-center text-sm text-t-2 hover:text-t-1 transition-colors"
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
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <p className="text-t-0 font-semibold text-[15px] leading-snug">
                {market.question}
              </p>
              <OddsBar yesPool={yesPool} noPool={noPool} />
              <div className="flex items-center justify-between text-[11px] text-t-2">
                <span className="font-mono-num text-yes font-semibold">{yesPct}% YES</span>
                <span className="font-mono-num">{total.toLocaleString()} coins</span>
                <span className="font-mono-num text-no font-semibold">{noPct}% NO</span>
              </div>
              <div className="text-center py-1">
                <p className="text-xs text-t-1">
                  You bet <span className="font-mono-num text-coin font-semibold">{betAmount}</span> coins on{" "}
                  <span className={betSide === "yes" ? "text-yes font-semibold" : "text-no font-semibold"}>
                    {betSide.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            {/* Reactions */}
            <div className="flex justify-center">
              <ReactionPills />
            </div>

            {/* CTA to "your turn" */}
            <p className="text-center text-t-1 text-sm">
              Now make one about <span className="text-t-0 font-medium">your</span> crew.
            </p>

            <Button
              onClick={() => setStep("your-turn")}
              className="w-full h-12 rounded-button bg-success text-white hover:bg-success/90 active:scale-[0.97] transition-all font-semibold"
            >
              Create a market
            </Button>

            <button
              onClick={() => setStep("auth")}
              className="block w-full text-center text-sm text-t-2 hover:text-t-1 transition-colors"
            >
              Skip — sign up now
            </button>
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
