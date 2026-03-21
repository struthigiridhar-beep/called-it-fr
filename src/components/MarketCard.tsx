import OddsBar from "./OddsBar";
import { format } from "date-fns";

interface MarketCardProps {
  question: string;
  category: string;
  yesPool: number;
  noPool: number;
  deadline: string;
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
  isPublic?: boolean;
}

export default function MarketCard({
  question,
  category,
  yesPool,
  noPool,
  deadline,
  onYes,
  onNo,
  yesLabel = "YES",
  noLabel = "NO",
  isPublic,
}: MarketCardProps) {
  const total = yesPool + noPool;
  const deadlineLabel = (() => {
    try {
      return "closes " + format(new Date(deadline), "MMM d");
    } catch {
      return "";
    }
  })();

  return (
    <div className="rounded-card border border-b-1 bg-bg-1 p-4 space-y-3">
      {/* Category badge */}
      <div className="flex items-center gap-2">
        {isPublic && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-coin border border-coin-border bg-coin-bg px-2 py-0.5 rounded-pill">
            Public bet
          </span>
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
          {category}
        </span>
      </div>

      {/* Question */}
      <p className="text-t-0 font-semibold text-[15px] leading-snug">{question}</p>

      {/* Odds bar */}
      <OddsBar yesPool={yesPool} noPool={noPool} />

      {/* Stats row */}
      <div className="flex items-center justify-between text-[11px] text-t-2">
        <span className="font-mono-num text-yes font-semibold">
          {Math.round(total > 0 ? (yesPool / total) * 100 : 50)}% YES
        </span>
        <span className="font-mono-num">
          {total.toLocaleString()} coins · {deadlineLabel}
        </span>
        <span className="font-mono-num text-no font-semibold">
          {Math.round(total > 0 ? (noPool / total) * 100 : 50)}% NO
        </span>
      </div>

      {/* YES / NO buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onYes}
          className="h-11 rounded-button bg-yes-bg border border-yes-border text-yes font-semibold text-sm hover:bg-yes/10 active:scale-[0.97] transition-all"
        >
          {yesLabel}
        </button>
        <button
          onClick={onNo}
          className="h-11 rounded-button bg-no-bg border border-no-border text-no font-semibold text-sm hover:bg-no/10 active:scale-[0.97] transition-all"
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}
