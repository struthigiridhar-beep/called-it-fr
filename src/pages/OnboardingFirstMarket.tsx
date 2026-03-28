import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SUGGESTIONS = [
  "Will [Name] quit before Q3?",
  "Does [Name] make it to the gym 3× this week?",
  "Will the launch actually ship on time?",
  "Does [Name] reply within 5 minutes?",
  "Will [Name] cancel last minute?",
  "Does [Name] ask them out this month?",
];

const CATEGORIES = ["Work", "Social", "Life"];

const DEADLINES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "1w", hours: 168 },
  { label: "1mo", hours: 720 },
  { label: "6mo", hours: 4368 },
  { label: "1yr", hours: 8760 },
];

export default function OnboardingFirstMarket() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("groupId");

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Social");
  const [deadline, setDeadline] = useState("1w");
  const [loading, setLoading] = useState(false);

  const charCount = question.length;

  const handleSubmit = async () => {
    if (!question.trim() || !groupId || !user) return;
    setLoading(true);
    try {
      const hours = DEADLINES.find((d) => d.label === deadline)?.hours ?? 168;
      const deadlineDate = new Date(Date.now() + hours * 60 * 60 * 1000);

      await supabase.from("markets").insert({
        group_id: groupId,
        question: question.trim(),
        category: category || "Social",
        deadline: deadlineDate.toISOString(),
        min_bet: 10,
        created_by: user.id,
        status: "open" as const,
        yes_pool: 0,
        no_pool: 0,
        is_public: false,
        is_pinned: false,
      });

      navigate(`/group/${groupId}?showInvite=true`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const chipBase =
    "rounded-full border px-3.5 py-1.5 text-[13px] transition-all cursor-pointer select-none";
  const chipOff = "border-b-0 bg-bg-1 text-t-2";
  const chipOn = "border-t-2 bg-bg-2 text-t-0";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg-0 px-5 py-6">
      <div className="flex-1 overflow-y-auto">
        <p className="text-[13px] font-bold" style={{ color: "#4A4038" }}>
          Called It.
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-8">
          <div className="h-2 w-2 rounded-full bg-success flex items-center justify-center text-[6px] text-bg-0">✓</div>
          <div className="h-2 w-2 rounded-full bg-yes" />
        </div>

        <h1
          className="mt-5 text-[26px] font-extrabold text-t-0"
          style={{ letterSpacing: "-0.5px" }}
        >
          Drop the first market.
        </h1>
        <p className="mt-2.5 text-sm text-t-1 leading-relaxed">
          Make it about someone specific. The more real, the better.
        </p>

        {/* Textarea */}
        <div className="mt-8 relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 120))}
            placeholder="Will [Name] actually quit before Q3?"
            rows={3}
            className="w-full rounded-[13px] border px-4 py-3.5 text-[15px] text-t-0 outline-none resize-none placeholder:text-t-2 focus:border-t-2"
            style={{ background: "#1E1A17", borderColor: "#2A2420", minHeight: 80 }}
          />
          <span
            className="absolute bottom-2.5 right-3 text-[10px] font-mono-num"
            style={{ color: charCount > 100 ? "#C47860" : "#4A4038" }}
          >
            {charCount}/120
          </span>
        </div>

        {/* Suggestion pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setQuestion(s)}
              className="rounded-full border px-3 py-1 text-xs text-t-1"
              style={{ background: "#1E1A17", borderColor: "#2A2420" }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Category */}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase text-t-2 mb-2 tracking-wider">
            Category
          </p>
          <div className="flex gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`${chipBase} ${category === c ? chipOn : chipOff}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase text-t-2 mb-2 tracking-wider">
            Closes in
          </p>
          <div className="flex flex-wrap gap-2">
            {DEADLINES.map((d) => (
              <button
                key={d.label}
                onClick={() => setDeadline(d.label)}
                className={`${chipBase} ${deadline === d.label ? chipOn : chipOff}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={!question.trim() || loading}
          className="w-full rounded-[13px] py-[15px] text-base font-extrabold transition-all active:scale-[0.97] disabled:opacity-35 disabled:pointer-events-none"
          style={{
            background: "#EAE4DC",
            color: "#100E0C",
            letterSpacing: "-0.2px",
          }}
        >
          {loading ? "Posting…" : "Post it →"}
        </button>
      </div>
    </div>
  );
}
