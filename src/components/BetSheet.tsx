import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useState } from "react";

type Side = "yes" | "no";

interface BetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSide: Side;
  question: string;
  yesPct: number;
  noPct: number;
  onConfirm: (side: Side, amount: number) => void;
  /** When true, changes header/CTA for the referral join flow */
  referralMode?: boolean;
}

const PRESETS = [25, 50, 100];

export default function BetSheet({
  open,
  onOpenChange,
  initialSide,
  question,
  yesPct,
  noPct,
  onConfirm,
  referralMode = false,
}: BetSheetProps) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState<number>(25);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSide(initialSide);
      setAmount(25);
    }
    onOpenChange(next);
  };

  const displayAmount = amount === -1 ? "all" : amount;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-bg-1 border-b-1 pb-8">
        <DrawerHeader className="text-left px-5 pb-1">
          <DrawerTitle className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
            {referralMode
              ? `Bet on ${side.toUpperCase()} before joining`
              : `How much on ${side.toUpperCase()}?`}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{question}</DrawerDescription>
        </DrawerHeader>

        <div className="px-5 space-y-5">
          {/* Side toggle with odds */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("yes")}
              className={`h-11 rounded-button text-sm font-semibold transition-all ${
                side === "yes"
                  ? "bg-yes-bg border border-yes-border text-yes"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              YES — <span className="font-mono-num">{yesPct}%</span>
            </button>
            <button
              onClick={() => setSide("no")}
              className={`h-11 rounded-button text-sm font-semibold transition-all ${
                side === "no"
                  ? "bg-no-bg border border-no-border text-no"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              NO — <span className="font-mono-num">{noPct}%</span>
            </button>
          </div>

          {/* Amount presets */}
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`h-11 rounded-button text-sm font-mono-num font-semibold transition-all ${
                  amount === p
                    ? "bg-coin-bg border border-coin-border text-coin"
                    : "bg-bg-2 border border-b-0 text-t-1 hover:text-t-0"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setAmount(-1)}
              className={`h-11 rounded-button text-xs font-mono-num font-semibold transition-all leading-tight ${
                amount === -1
                  ? "bg-coin-bg border border-coin-border text-coin"
                  : "bg-bg-2 border border-b-0 text-t-1 hover:text-t-0"
              }`}
            >
              all{"\n"}in
            </button>
          </div>

          {/* Confirm */}
          <button
            onClick={() => onConfirm(side, amount)}
            className={`w-full h-12 rounded-button font-semibold text-sm active:scale-[0.97] transition-all ${
              side === "yes"
                ? "bg-yes text-white hover:bg-yes/90"
                : "bg-no text-white hover:bg-no/90"
            }`}
          >
            {referralMode ? (
              <>
                Join + bet <span className="font-mono-num">{displayAmount}</span> coins on{" "}
                <span className="uppercase">{side}</span>
              </>
            ) : (
              <>
                Bet <span className="font-mono-num">{displayAmount}</span> coins on{" "}
                <span className="uppercase">{side}</span>
              </>
            )}
          </button>

          {/* Helper text */}
          {!referralMode && (
            <p className="text-center text-[11px] text-t-2">
              No account needed to vote — save it after
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
