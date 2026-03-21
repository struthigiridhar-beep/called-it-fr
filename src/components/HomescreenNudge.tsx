import { useState, useEffect } from "react";

const LS_KEY = "calledit_homescreen_dismissed";

interface HomescreenNudgeProps {
  onContinue: () => void;
}

export function getDeviceInstructions(): { label: string; steps: string } | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) {
    return {
      label: "iOS",
      steps: "Tap Share → Add to Home Screen",
    };
  }
  if (/Android/.test(ua)) {
    return {
      label: "Android",
      steps: "Tap ⋮ → Add to Home screen",
    };
  }
  return null;
}

export function shouldShowNudge(): boolean {
  // Don't show if already installed as PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  return localStorage.getItem(LS_KEY) !== "true";
}

export default function HomescreenNudge({ onContinue }: HomescreenNudgeProps) {
  const [device, setDevice] = useState<{ label: string; steps: string } | null>(null);

  useEffect(() => {
    setDevice(getDeviceInstructions());
  }, []);

  const handleSkip = () => {
    localStorage.setItem(LS_KEY, "true");
    onContinue();
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 bg-bg-0">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* CI icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-bg-2 border border-b-1 flex items-center justify-center">
          <span className="text-2xl font-bold text-t-0">CI</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-t-0">You're in.</h1>
          <p className="text-t-1 text-sm leading-relaxed">
            Your bet is live. Now wait for your friends to disagree with you loudly and publicly.
          </p>
        </div>

        {/* Add to homescreen card */}
        <div className="rounded-card border border-coin-border bg-bg-1 p-4 text-left space-y-1">
          <p className="text-coin font-bold text-sm">Add to homescreen</p>
          <p className="text-t-1 text-sm leading-relaxed">
            Markets move fast. Add Called It to your homescreen so you never miss a verdict.
          </p>
          {device && (
            <p className="text-t-2 text-xs pt-1">{device.steps}</p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={onContinue}
            className="w-full h-12 rounded-button bg-yes text-white text-sm font-semibold hover:bg-yes/90 active:scale-[0.97] transition-all"
          >
            See my markets
          </button>
          <button
            onClick={handleSkip}
            className="w-full h-12 rounded-button border border-b-1 bg-bg-1 text-t-2 text-sm font-semibold hover:bg-bg-2 active:scale-[0.97] transition-all"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
