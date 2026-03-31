import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function OnboardingCreateGroup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passedQuestion = searchParams.get("question") || "";
  const fromHome = searchParams.get("from") === "home";

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (!user) {
      setError("Session expired. Please sign in again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data, error: insertError } = await supabase
        .from("groups")
        .insert({ name: name.trim(), created_by: user.id, is_public: false })
        .select("id")
        .single();
      if (insertError) throw insertError;

      await supabase.from("group_members").insert({
        user_id: user.id,
        group_id: data.id,
        coins: 500,
        xp: 0,
        streak: 0,
        judge_integrity: 1,
      });

      if (passedQuestion) {
        // Flow B: had a custom question → go create the market
        const params = new URLSearchParams({ groupId: data.id, question: passedQuestion });
        navigate(`/onboarding/first-market?${params.toString()}`);
      } else {
        // Flow A + from=home: no pending question → skip market creation, go straight to group
        navigate(`/group/${data.id}?tab=feed&showInvite=true`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5 py-6">
      <div>
        <p className="text-[13px] font-bold" style={{ color: "#4A4038" }}>
          Called It.
        </p>
        {!fromHome && (
          <div className="flex gap-1.5 mt-8">
            <div className="h-2 w-2 rounded-full" style={{ background: "#7B9EC8" }} />
            <div className="h-2 w-2 rounded-full" style={{ background: "#2A2420" }} />
          </div>
        )}
        <h1
          className="mt-5 text-[26px] font-extrabold text-t-0"
          style={{ letterSpacing: "-0.5px" }}
        >
          {fromHome ? "Create a group." : "Now make it personal."}
        </h1>
        <p className="mt-2.5 text-sm text-t-1 leading-relaxed">
          {fromHome
            ? "Name your group and invite your crew to start betting."
            : "Create a group for your crew — the people you actually want to bet against."}
        </p>
        <div className="mt-8">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fantasy F1 league, flat 4, work rivals..."
            className="w-full rounded-[13px] border px-4 py-3.5 text-base text-t-0 outline-none ring-0 focus:ring-0 focus:outline-none placeholder:text-t-2"
            style={{
              background: "#1E1A17",
              borderColor: name ? "#4A4038" : "#2A2420",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#4A4038")}
            onBlur={(e) => { if (!name) e.target.style.borderColor = "#2A2420"; }}
          />
          <p className="mt-2 text-xs" style={{ color: "#4A4038" }}>
            You can always rename it later.
          </p>
          {error && (
            <p className="mt-2 text-xs" style={{ color: "#C47860" }}>{error}</p>
          )}
        </div>
      </div>
      <div className="mt-auto">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          className="w-full rounded-[13px] py-[15px] text-base font-extrabold transition-all active:scale-[0.97] disabled:opacity-35 disabled:pointer-events-none"
          style={{ background: "#EAE4DC", color: "#100E0C", letterSpacing: "-0.2px" }}
        >
          {loading ? "Creating…" : "Create group →"}
        </button>
      </div>
    </div>
  );
}
