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
  onConfirm: (side: Side, amount: number) => void;
}

const PRESETS = [25, 50, 100];

export default function BetSheet({
  open,
  onOpenChange,
  initialSide,
  question,
  onConfirm,
}: BetSheetProps) {
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState<number>(50);

  // Reset when side changes from parent
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSide(initialSide);
      setAmount(50);
    }
    onOpenChange(next);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-bg-1 border-b-1 pb-8">
        <DrawerHeader className="text-left px-5 pb-1">
          <DrawerTitle className="text-t-0 text-base">Place your bet</DrawerTitle>
          <DrawerDescription className="text-t-2 text-xs line-clamp-2">
            {question}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-5 space-y-5">
          {/* Side toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-button bg-bg-2">
            <button
              onClick={() => setSide("yes")}
              className={`h-9 rounded-button text-sm font-semibold transition-all ${
                side === "yes"
                  ? "bg-yes-bg border border-yes-border text-yes"
                  : "text-t-2 hover:text-t-1"
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={`h-9 rounded-button text-sm font-semibold transition-all ${
                side === "no"
                  ? "bg-no-bg border border-no-border text-no"
                  : "text-t-2 hover:text-t-1"
              }`}
            >
              NO
            </button>
          </div>

          {/* Amount presets */}
          <div className="space-y-2">
            <span className="text-xs text-t-2">Amount</span>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`h-10 rounded-button text-sm font-mono-num font-semibold transition-all ${
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
                className={`h-10 rounded-button text-sm font-semibold transition-all ${
                  amount === -1
                    ? "bg-coin-bg border border-coin-border text-coin"
                    : "bg-bg-2 border border-b-0 text-t-1 hover:text-t-0"
                }`}
              >
                All in
              </button>
            </div>
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
            Bet {amount === -1 ? "all" : amount} coins on{" "}
            <span className="uppercase">{side}</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
