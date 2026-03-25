import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, Flame } from "lucide-react";
import { toast } from "sonner";

const PRESETS: Record<string, string[]> = {
  bet_loss: [
    "You really looked at those odds and said 'yeah, I'll take the L.' Bold strategy.",
    "Even a coin flip would've given you better chances than that read.",
    "Tell me you don't understand probability without telling me.",
    "Your betting history should come with a warning label.",
  ],
  streak_break: [
    "That streak was the only impressive thing about your record. RIP.",
    "Streak's dead. Guess it was just luck all along.",
    "From hero to zero in one bet. That's almost impressive.",
    "The streak carried you. Now we see the real you.",
  ],
};

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const RoastComposer = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { groupId, toUserId } = useParams<{ groupId: string; toUserId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const trigger = searchParams.get("trigger") || "bet_loss";
  const reason = searchParams.get("reason") || "";
  const targetName = searchParams.get("name") || "Someone";
  const targetColor = searchParams.get("color") || "#7B9EC8";

  const presets = PRESETS[trigger] || PRESETS.bet_loss;

  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const activeMessage = customMode ? customText : (selectedPreset !== null ? presets[selectedPreset] : "");

  const handleSend = async () => {
    if (!activeMessage.trim() || !user || !groupId || !toUserId) return;
    setSending(true);
    try {
      // 1. Get sender name
      const { data: senderUser } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      // 2. Insert roast
      const { data: roast, error: roastErr } = await supabase
        .from("roasts")
        .insert({
          from_user: user.id,
          to_user: toUserId,
          group_id: groupId,
          message: activeMessage.trim(),
          trigger_type: trigger,
        })
        .select("id")
        .single();

      if (roastErr) throw roastErr;

      // 3. Insert notification for recipient
      await supabase.from("notifications").insert({
        user_id: toUserId,
        type: "roast_received",
        payload: {
          from_name: senderUser?.name || "Someone",
          from_user_id: user.id,
          message: activeMessage.trim(),
          group_id: groupId,
          roast_id: roast?.id,
        },
      });

      // Feed event is created by the DB trigger on roasts insert

      setSent(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to send roast");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div ref={ref} className="min-h-[100dvh] bg-bg-0 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-roast-bg border-2 border-roast flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-roast" />
        </div>
        <h1 className="text-xl font-bold text-t-0 mb-1">Roast sent.</h1>
        <p className="text-sm text-t-2 mb-6">
          {targetName} can see it now. The group can too.
        </p>

        <div className="w-full max-w-sm rounded-card border border-roast-border bg-roast-bg p-4 mb-8">
          <p className="text-xs text-t-2 mb-1">To: {targetName}</p>
          <p className="text-sm text-roast italic leading-relaxed">"{activeMessage}"</p>
        </div>

        <button
          onClick={() => { setSent(false); setSelectedPreset(null); setCustomText(""); setCustomMode(false); }}
          className="w-full max-w-sm h-12 rounded-button bg-roast-bg border border-roast-border text-roast font-semibold text-sm mb-3 active:scale-[0.97] transition-all"
        >
          🔥 Roast again
        </button>
        <button
          onClick={() => navigate(`/group/${groupId}`)}
          className="w-full max-w-sm h-12 rounded-button border border-b-1 text-t-2 text-sm active:scale-[0.97] transition-all"
        >
          ← Back to feed
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-[100dvh] bg-bg-0 flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 pt-safe-top pb-32">
        {/* Header */}
        <header className="pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-t-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-t-0">Roast {targetName}</h1>
        </header>

        {/* Target card */}
        <div className="flex items-center gap-3 mt-3 rounded-card bg-bg-1 border border-b-0 p-3">
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{ backgroundColor: targetColor }}
          >
            {getInitials(targetName)}
          </div>
          <div className="min-w-0">
            <p className="text-t-0 font-semibold text-sm">{targetName}</p>
            {reason && <p className="text-xs text-t-2 truncate">{reason}</p>}
          </div>
        </div>

        {/* Presets / Custom toggle */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-t-2">
            {trigger === "streak_break" ? "STREAK BREAK ROASTS" : "BET LOSS ROASTS"}
          </h2>
          <button
            onClick={() => setCustomMode(!customMode)}
            className="text-xs text-roast font-semibold"
          >
            ✏️ {customMode ? "Use a preset instead" : "Write your own"}
          </button>
        </div>

        {customMode ? (
          <div className="space-y-2">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, 140))}
              placeholder="Write your roast… (max 140 chars)"
              maxLength={140}
              className="w-full min-h-[100px] rounded-card bg-bg-1 border border-b-1 p-3 text-sm text-t-0 placeholder:text-t-2 focus:outline-none focus:border-roast-border resize-none"
            />
            <p className="text-[10px] text-t-2 text-right">{customText.length}/140</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presets.map((line, i) => {
              const selected = selectedPreset === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedPreset(i)}
                  className={`w-full text-left rounded-card border p-3 transition-all ${
                    selected
                      ? "border-roast bg-roast-bg"
                      : "border-b-0 bg-bg-1"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      selected ? "border-roast" : "border-b-2"
                    }`}>
                      {selected && <div className="h-2 w-2 rounded-full bg-roast" />}
                    </div>
                    <p className="text-sm text-t-0 leading-relaxed">{line}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Live preview */}
        {activeMessage && (
          <div className="mt-6">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-t-2 mb-2">LIVE PREVIEW</h3>
            <div className="rounded-card border border-roast-border bg-roast-bg p-4">
              <p className="text-xs text-t-2 mb-1">To: {targetName}</p>
              <p className="text-xs text-roast/70 mb-2">@you</p>
              <p className="text-sm text-roast italic leading-relaxed">"{activeMessage}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Send button */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-0 border-t border-b-0 p-4 pb-safe-bottom z-50">
        <button
          onClick={handleSend}
          disabled={!activeMessage.trim() || sending}
          className="w-full h-12 rounded-button bg-roast text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40"
        >
          <Flame className="h-4 w-4" />
          {sending ? "Sending…" : "Send roast 🔥"}
        </button>
      </div>
    </div>
  );
});

RoastComposer.displayName = "RoastComposer";

export default RoastComposer;
