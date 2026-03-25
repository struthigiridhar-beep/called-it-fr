import React from "react";

interface OddsBarProps {
  yesPool: number;
  noPool: number;
}

const OddsBar = React.forwardRef<HTMLDivElement, OddsBarProps>(
  ({ yesPool, noPool }, ref) => {
    const total = yesPool + noPool;
    const yesPct = total > 0 ? Math.round((yesPool / total) * 100) : 50;
    const noPct = 100 - yesPct;

    return (
      <div ref={ref} className="flex items-center gap-2">
        <span className="font-mono-num text-xs font-semibold text-yes">
          {yesPct}%
        </span>
        <div className="flex-1 h-1.5 rounded-pill overflow-hidden flex bg-bg-2">
          <div
            className="h-full bg-yes transition-all duration-300"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="h-full bg-no transition-all duration-300"
            style={{ width: `${noPct}%` }}
          />
        </div>
        <span className="font-mono-num text-xs font-semibold text-no">
          {noPct}%
        </span>
      </div>
    );
  }
);

OddsBar.displayName = "OddsBar";

export default OddsBar;
