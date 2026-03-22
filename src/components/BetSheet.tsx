import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useState, useEffect } from "react";

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
  /** Market min bet — defaults to 1 for legacy usage */
  minBet?: number;
  /** User's current coin balance */
  userCoins?: number;
  /** Group or context name shown in sheet header pill */
  groupName?: string;
  /** Total pool (yes_pool + no_pool) */
  totalPool?: number;
  /** Pool for the currently selected side */
  yesSidePool?: number;
  noSidePool?: number;
  /** If the user already has a position, lock to that side */
  lockedSide?: Side;
}

export default function BetSheet({
  open,
  onOpenChange,
  initialSide,
  question,
  yesPct,
  noPct,
  onConfirm,
  referralMode = false,
  minBet = 1,
  userCoins = 500,
  groupName,
  totalPool = 0,
  yesSidePool = 0,
  noSidePool = 0,
  lockedSide,
}: BetSheetProps) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState<number>(minBet);

  const sidePool = side === "yes" ? yesSidePool : noSidePool;

  useEffect(() => {
    if (open) {
      setSide(initialSide);
      setAmount(Math.min(minBet, userCoins));
    }
  }, [open, initialSide, minBet, userCoins]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const presets = [minBet, minBet * 2, minBet * 4];
  const filteredPresets = presets.filter((p) => p <= userCoins);
  const allInAmount = userCoins;

  const belowMin = amount < minBet;
  const potentialReturn =
    sidePool + amount > 0
      ? Math.round((amount / (sidePool + amount)) * (totalPool + amount))
      : 0;

  const snapToMin = () => setAmount(Math.min(minBet, userCoins));

  // For referral mode, use legacy presets
  if (referralMode) {
    const LEGACY_PRESETS = [25, 50, 100];
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="bg-bg-1 border-b-1 pb-8">
          <DrawerHeader className="text-left px-5 pb-1">
            <DrawerTitle className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
              Bet on {side.toUpperCase()} before joining
            </DrawerTitle>
            <DrawerDescription className="sr-only">{question}</DrawerDescription>
          </DrawerHeader>
          <div className="px-5 space-y-5">
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
            <div className="grid grid-cols-4 gap-2">
              {LEGACY_PRESETS.map((p) => (
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
            <button
              onClick={() => onConfirm(side, amount)}
              className={`w-full h-12 rounded-button font-semibold text-sm active:scale-[0.97] transition-all ${
                side === "yes"
                  ? "bg-yes text-white hover:bg-yes/90"
                  : "bg-no text-white hover:bg-no/90"
              }`}
            >
              Join + bet <span className="font-mono-num">{amount === -1 ? "all" : amount}</span> coins on{" "}
              <span className="uppercase">{side}</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-bg-1 border-b-1 pb-8">
        <DrawerHeader className="text-left px-5 pb-1">
          <DrawerDescription className="sr-only">{question}</DrawerDescription>
          {/* Group pill + question */}
          <div className="space-y-2">
            {groupName && (
              <span className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-medium bg-[#272220] border border-[#38302A] text-[#9A8E84]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9A8E84]/50" />
                {groupName}
              </span>
            )}
            <DrawerTitle className="text-base font-semibold text-t-0">
              {question}
            </DrawerTitle>
          </div>
        </DrawerHeader>

        <div className="px-5 space-y-5 mt-2">
          {/* Separator */}
          <div className="h-px bg-b-0" />

          {/* Side toggle with odds */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("yes")}
              className={`h-12 rounded-button text-sm font-semibold transition-all ${
                side === "yes"
                  ? "bg-yes-bg border border-yes-border text-yes"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              YES — <span className="font-mono-num">{yesPct}%</span>
            </button>
            <button
              onClick={() => setSide("no")}
              className={`h-12 rounded-button text-sm font-semibold transition-all ${
                side === "no"
                  ? "bg-no-bg border border-no-border text-no"
                  : "bg-bg-2 border border-b-0 text-t-2 hover:text-t-1"
              }`}
            >
              NO — <span className="font-mono-num">{noPct}%</span>
            </button>
          </div>

          {/* Amount label */}
          <div className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
            Amount
          </div>

          {/* Big amount display */}
          <div className="text-center">
            <span className={`text-5xl font-bold font-mono-num ${belowMin ? "text-coin" : "text-t-0"}`}>
              {amount}
            </span>
            <p className="text-sm text-t-2 mt-1">coins</p>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2">
            {filteredPresets.map((p) => (
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
              onClick={() => setAmount(allInAmount)}
              className={`h-11 rounded-button text-xs font-mono-num font-semibold transition-all leading-tight ${
                amount === allInAmount
                  ? "bg-coin-bg border border-coin-border text-coin"
                  : "bg-bg-2 border border-b-0 text-t-1 hover:text-t-0"
              }`}
            >
              all in
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={Math.min(minBet, userCoins)}
            max={userCoins}
            value={Math.min(amount, userCoins)}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 bg-bg-2 rounded-pill appearance-none cursor-pointer accent-t-1"
          />

          {/* Potential return */}
          <div className="flex items-center justify-between rounded-button bg-bg-2 border border-b-0 px-4 py-3">
            <span className="text-sm text-t-2">Potential return</span>
            <span className="text-sm font-mono-num font-semibold text-coin">
              ~{potentialReturn} c
            </span>
          </div>

          {/* Min bet warning */}
          {belowMin && (
            <div className="space-y-2">
              <div className="rounded-button bg-coin-bg border border-coin-border px-4 py-2.5 text-xs text-coin text-center">
                Min bet is {minBet} coins (set by creator)
              </div>
              <button
                onClick={snapToMin}
                className="w-full h-10 rounded-button bg-coin-bg border border-coin-border text-coin text-sm font-semibold"
              >
                Snap to minimum — {minBet} c
              </button>
            </div>
          )}

          {/* Confirm button */}
          {!belowMin && (
            <button
              onClick={() => onConfirm(side, amount)}
              className={`w-full h-12 rounded-button font-semibold text-sm active:scale-[0.97] transition-all ${
                side === "yes"
                  ? "bg-yes text-white hover:bg-yes/90"
                  : "bg-no text-white hover:bg-no/90"
              }`}
            >
              Confirm {side.toUpperCase()} · <span className="font-mono-num">{amount}</span> c
            </button>
          )}

          {/* Footer: coin balance */}
          <p className="text-center text-[11px] text-t-2">
            <span className="font-mono-num">{userCoins}</span> coins left · resets Monday
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
