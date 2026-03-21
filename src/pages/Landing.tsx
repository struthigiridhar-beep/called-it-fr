import { useState } from "react";
import { Navigate } from "react-router-dom";
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
type Step = "browse" | "betting" | "post-bet" | "auth";

export default function Landing() {
  const { user, signInWithEmail, signUpWithEmail } = useAuth();
  const { data: market, isLoading } = useFeaturedMarket();

  const [step, setStep] = useState<Step>("browse");
  const [betSide, setBetSide] = useState<Side>("yes");
  const [betAmount, setBetAmount] = useState(50);

  // Optimistic pool adjustments
  const [optimistic, setOptimistic] = useState<{ side: Side; amount: number } | null>(null);

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const yesPool = (market?.yes_pool ?? 0) + (optimistic?.side === "yes" ? optimistic.amount : 0);
  const noPool = (market?.no_pool ?? 0) + (optimistic?.side === "no" ? optimistic.amount : 0);

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
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

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
              Live right now
            </span>
            <span className="font-mono-num text-t-2">
              {(yesPool + noPool).toLocaleString()} coins in play
            </span>
          </div>
        )}

        {/* Featured market / skeleton */}
        {isLoading ? (
          <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
            <Skeleton className="h-3 w-24 bg-bg-2" />
            <Skeleton className="h-5 w-full bg-bg-2" />
            <Skeleton className="h-4 w-3/4 bg-bg-2" />
            <Skeleton className="h-1.5 w-full bg-bg-2 rounded-pill" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-11 rounded-button bg-bg-2" />
              <Skeleton className="h-11 rounded-button bg-bg-2" />
            </div>
          </div>
        ) : !market ? (
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
        ) : step === "post-bet" ? (
          /* Post-bet state */
          <div className="space-y-4">
            <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
              <p className="text-t-0 font-semibold text-[15px] leading-snug">
                {market.question}
              </p>
              <OddsBar yesPool={yesPool} noPool={noPool} />
              <div className="flex items-center justify-between text-[11px] text-t-2">
                <span className="font-mono-num text-yes font-semibold">
                  {Math.round((yesPool / (yesPool + noPool)) * 100)}% YES
                </span>
                <span className="font-mono-num">
                  {(yesPool + noPool).toLocaleString()} coins
                </span>
                <span className="font-mono-num text-no font-semibold">
                  {Math.round((noPool / (yesPool + noPool)) * 100)}% NO
                </span>
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

            {/* CTA */}
            <p className="text-center text-t-1 text-sm">
              Now make one about <span className="text-t-0 font-medium">your</span> crew.
            </p>
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

        {/* Auth section */}
        {(step === "post-bet" || step === "auth") && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-b-0" />
              <span className="text-xs text-t-2">sign up to lock your bet</span>
              <div className="h-px flex-1 bg-b-0" />
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
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
                className="w-full h-12 rounded-button bg-yes text-white hover:bg-yes/90 active:scale-[0.97] transition-all"
              >
                {authLoading ? "…" : isSignUp ? "Create account" : "Sign in"}
              </Button>
            </form>

            <button
              onClick={() => { setIsSignUp(!isSignUp); setAuthError(""); }}
              className="block w-full text-center text-xs text-t-2 hover:text-t-1 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        )}

        {/* Skip link */}
        {step !== "post-bet" && step !== "auth" && (
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
          onConfirm={handleConfirmBet}
        />
      )}
    </div>
  );
}
