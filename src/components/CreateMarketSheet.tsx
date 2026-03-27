import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { Calendar, ChevronLeft, Check } from "lucide-react";
import OddsBar from "@/components/OddsBar";

type Visibility = "group" | "all_groups" | "public";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  groupName: string;
  seedQuestion?: string;
  isStreakBreak?: boolean;
}

const SUGGESTION_PILLS = [
  "Will [name] quit?",
  "Launch slip?",
  "Gym 3× week?",
  "Still single?",
  "Hit the OKR?",
];

const MIN_BET_PRESETS = [10, 50, 100, 200];
const CATEGORIES = ["Work", "Social", "Life milestone"] as const;

const DEADLINE_OPTIONS = [
  { label: "24h", sub: "Tomorrow", days: 1 },
  { label: "3d", sub: "This week", days: 3 },
  { label: "1w", sub: "Next week", days: 7 },
  { label: "2w", sub: "2 weeks", days: 14 },
  { label: "1mo", sub: "This month", days: 30 },
  { label: "3mo", sub: "Quarter", days: 90 },
] as const;

function getMinBetCopy(val: number) {
  if (val <= 25) return "Low stakes — casual fun";
  if (val <= 75) return "Balanced — keeps it serious";
  if (val <= 150) return "High stakes — drama guaranteed";
  return "Maximum stakes — all or nothing";
}

function deadlineDaysToDate(days: number) {
  return addDays(new Date(), days);
}

export default function CreateMarketSheet({ open, onOpenChange, groupId, groupName, seedQuestion, isStreakBreak }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1
  const [question, setQuestion] = useState(seedQuestion ?? "");
  const [minBet, setMinBet] = useState(50);

  // Step 2
  const [category, setCategory] = useState<string>("Work");
  const [deadlineDays, setDeadlineDays] = useState<number | null>(7);
  const [customDate, setCustomDate] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Step 3
  const [visibility, setVisibility] = useState<Visibility>("group");
  const [notify, setNotify] = useState(true);

  // Posting
  const [posting, setPosting] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setQuestion(seedQuestion ?? "");
    setMinBet(50);
    setCategory("Work");
    setDeadlineDays(7);
    setCustomDate("");
    setShowCustom(false);
    setVisibility("group");
    setNotify(true);
    setPosting(false);
  }, [seedQuestion]);

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const deadline = deadlineDays
    ? deadlineDaysToDate(deadlineDays)
    : customDate
    ? new Date(customDate)
    : addDays(new Date(), 7);

  const deadlineLabel = deadlineDays
    ? DEADLINE_OPTIONS.find((d) => d.days === deadlineDays)?.label ?? `${deadlineDays}d`
    : customDate
    ? format(new Date(customDate), "MMM d")
    : "1w";

  const isPublic = visibility === "public";

  const canNext = () => {
    if (step === 1) return question.trim().length >= 5;
    if (step === 2) return !!category && (deadlineDays !== null || !!customDate);
    if (step === 3) return true;
    return true;
  };

  const postMarket = async () => {
    if (!user?.id || posting) return;
    setPosting(true);
    try {
      const { data: market, error } = await supabase
        .from("markets")
        .insert({
          question: question.trim(),
          min_bet: minBet,
          category: category.toLowerCase(),
          deadline: deadline.toISOString(),
          group_id: groupId,
          created_by: user.id,
          is_public: isPublic,
          is_pinned: false,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Notify group members if toggle is on
      if (notify && market) {
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .neq("user_id", user.id);

        if (members?.length) {
          await supabase.functions.invoke("send-notification", {
            body: {
              notifications: members.map((m) => ({
                user_id: m.user_id,
                type: "new_market",
                payload: {
                  market_id: market.id,
                  question: question.trim(),
                  group_name: groupName,
                  creator_name: user.email?.split("@")[0] ?? "Someone",
                },
              })),
            },
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["group-markets"] });
      queryClient.invalidateQueries({ queryKey: ["public-markets"] });
      handleOpenChange(false);
      toast.success("Market is live!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post market");
    } finally {
      setPosting(false);
    }
  };

  const stepLabels = [
    "The question + stakes",
    "Category + deadline",
    "Who sees it",
    "Looks right?",
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[92dvh] rounded-t-[20px] bg-bg-0 border-t border-b-0 p-0 flex flex-col">
        <SheetTitle className="sr-only">New market</SheetTitle>

        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="h-8 w-8 rounded-full bg-bg-2 flex items-center justify-center text-t-1">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="h-8 w-8" />
            )}
            <h2 className="text-lg font-bold text-t-0">
              {step === 4 ? "Preview" : "New market"}
            </h2>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mt-3">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-pill transition-colors ${
                  s < step ? "bg-success" : s === step ? "bg-yes" : "bg-bg-3"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-t-2 mt-1.5">
            Step {step} of 4 — {stepLabels[step - 1]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {step === 1 && <Step1
            question={question}
            setQuestion={setQuestion}
            minBet={minBet}
            setMinBet={setMinBet}
            isStreakBreak={isStreakBreak}
          />}
          {step === 2 && <Step2
            category={category}
            setCategory={setCategory}
            deadlineDays={deadlineDays}
            setDeadlineDays={setDeadlineDays}
            customDate={customDate}
            setCustomDate={setCustomDate}
            showCustom={showCustom}
            setShowCustom={setShowCustom}
          />}
          {step === 3 && <Step3
            visibility={visibility}
            setVisibility={setVisibility}
            notify={notify}
            setNotify={setNotify}
            groupName={groupName}
          />}
          {step === 4 && <Step4
            question={question}
            minBet={minBet}
            category={category}
            deadlineLabel={deadlineLabel}
            groupName={groupName}
            visibility={visibility}
            notify={notify}
          />}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 pt-2 space-y-2 border-t border-b-0">
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="w-full h-12 rounded-button border border-b-1 bg-transparent text-t-0 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={postMarket}
              disabled={posting}
              className="w-full h-12 rounded-button border border-b-1 bg-transparent text-t-0 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {posting ? "Posting…" : "Post market"}
            </button>
          )}
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full h-12 rounded-button bg-transparent text-t-1 font-semibold text-sm active:scale-[0.98] transition-all"
            >
              Back
            </button>
          )}
          {step === 4 && (
            <button
              onClick={() => setStep(1)}
              className="w-full h-12 rounded-button bg-transparent text-t-1 font-semibold text-sm active:scale-[0.98] transition-all"
            >
              Edit
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---- Step 1: Question + Stakes ---- */
function Step1({ question, setQuestion, minBet, setMinBet, isStreakBreak }: {
  question: string; setQuestion: (q: string) => void;
  minBet: number; setMinBet: (v: number) => void;
  isStreakBreak?: boolean;
}) {
  return (
    <div className="space-y-6 pt-4">
      {isStreakBreak && (
        <div className="rounded-card bg-bg-1 border border-b-0 px-4 py-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-coin" />
          <span className="text-xs text-t-1">From your streak-break unlock</span>
        </div>
      )}

      {/* Question */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
          What are you predicting?
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 120))}
          placeholder="Will Priya quit before the end of Q2?"
          className="w-full min-h-[100px] rounded-card bg-bg-1 border border-b-0 px-4 py-3 text-[15px] text-t-0 placeholder:text-t-2 resize-none focus:outline-none focus:border-b-1"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-t-2">Clearly answerable YES or NO</span>
          <span className="text-xs text-t-2 font-mono-num">{question.length}/120</span>
        </div>
      </div>

      {/* Min bet */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
          Minimum bet to enter
        </label>
        <div className="rounded-card bg-bg-1 border border-b-0 px-4 py-4 space-y-3">
          <div>
            <span className="text-3xl font-bold font-mono-num text-t-0">{minBet}</span>
            <span className="text-lg text-t-1 ml-2">c</span>
          </div>
          <p className="text-xs text-coin">{getMinBetCopy(minBet)}</p>

          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={minBet}
            onChange={(e) => setMinBet(Number(e.target.value))}
            className="w-full accent-t-1"
          />

          <div className="grid grid-cols-4 gap-2">
            {MIN_BET_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setMinBet(v)}
                className={`h-9 rounded-pill text-sm font-semibold transition-all ${
                  minBet === v
                    ? "bg-bg-3 border border-b-2 text-t-0"
                    : "bg-bg-2 border border-b-0 text-t-1"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestion pills */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">
          Need a prompt?
        </label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_PILLS.map((pill) => (
            <button
              key={pill}
              onClick={() => setQuestion(pill)}
              className={`rounded-pill px-3 py-1.5 text-xs font-medium border transition-all ${
                question === pill
                  ? "bg-bg-3 border-b-2 text-t-0"
                  : "bg-bg-1 border-b-0 text-t-1"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- Step 2: Category + Deadline ---- */
function Step2({ category, setCategory, deadlineDays, setDeadlineDays, customDate, setCustomDate, showCustom, setShowCustom }: {
  category: string; setCategory: (c: string) => void;
  deadlineDays: number | null; setDeadlineDays: (d: number | null) => void;
  customDate: string; setCustomDate: (d: string) => void;
  showCustom: boolean; setShowCustom: (s: boolean) => void;
}) {
  return (
    <div className="space-y-6 pt-4">
      {/* Category */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-pill px-4 py-2 text-sm font-medium border transition-all ${
                category === c
                  ? "bg-bg-3 border-b-2 text-t-0"
                  : "bg-bg-1 border-b-0 text-t-1"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Deadline</label>
        <div className="grid grid-cols-3 gap-2">
          {DEADLINE_OPTIONS.map((d) => (
            <button
              key={d.days}
              onClick={() => { setDeadlineDays(d.days); setShowCustom(false); setCustomDate(""); }}
              className={`rounded-card py-3 text-center border transition-all ${
                deadlineDays === d.days && !showCustom
                  ? "bg-bg-3 border-yes-border text-t-0"
                  : "bg-bg-1 border-b-0 text-t-1"
              }`}
            >
              <div className="text-base font-bold">{d.label}</div>
              <div className="text-[10px] text-t-2 mt-0.5">{d.sub}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setShowCustom(true); setDeadlineDays(null); }}
          className={`w-full rounded-card py-3 px-4 border flex items-center gap-2 text-sm transition-all ${
            showCustom ? "bg-bg-3 border-yes-border text-t-0" : "bg-bg-1 border-b-0 text-t-1"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Pick a specific date
        </button>

        {showCustom && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
            className="w-full rounded-card bg-bg-1 border border-b-0 px-4 py-3 text-t-0 text-sm"
          />
        )}
      </div>
    </div>
  );
}

/* ---- Step 3: Visibility + Notify ---- */
function Step3({ visibility, setVisibility, notify, setNotify, groupName }: {
  visibility: Visibility; setVisibility: (v: Visibility) => void;
  notify: boolean; setNotify: (n: boolean) => void;
  groupName: string;
}) {
  const options: { key: Visibility; title: string; desc: string }[] = [
    { key: "group", title: "This group only", desc: `Only ${groupName} members can see and bet` },
    { key: "all_groups", title: "All my groups", desc: "Cross-post to all groups you're in" },
    { key: "public", title: "Public — anyone can bet", desc: "Visible to everyone on Called It" },
  ];

  return (
    <div className="space-y-6 pt-4">
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Visibility</label>
        <div className="space-y-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setVisibility(o.key)}
              className={`w-full rounded-card p-4 border text-left flex items-start gap-3 transition-all ${
                visibility === o.key
                  ? "bg-bg-2 border-yes-border"
                  : "bg-bg-1 border-b-0"
              }`}
            >
              <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                visibility === o.key ? "border-yes bg-yes" : "border-b-1 bg-transparent"
              }`}>
                {visibility === o.key && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-t-0">{o.title}</p>
                <p className="text-xs text-t-1 mt-0.5">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {visibility === "public" && (
          <div className="rounded-card bg-coin-bg border border-coin-border px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="h-2 w-2 rounded-full bg-coin mt-1.5 shrink-0" />
              <p className="text-xs text-coin">
                Anyone on Called It can see and bet on this market. It will appear on the public discover feed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Notifications</label>
        <div className="rounded-card bg-bg-1 border border-b-0 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-t-0">Ping the group</p>
            <p className="text-xs text-t-1 mt-0.5">Push notification to all members</p>
          </div>
          <button
            onClick={() => setNotify(!notify)}
            className={`relative h-7 w-12 rounded-pill transition-colors ${notify ? "bg-yes" : "bg-bg-3"}`}
          >
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${notify ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        <div className="rounded-card bg-coin-bg border border-coin-border px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="h-2 w-2 rounded-full bg-coin mt-1.5 shrink-0" />
            <p className="text-xs text-coin">
              If this market is about someone in the group, they can see all bets — including who bet what.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Step 4: Preview ---- */
function Step4({ question, minBet, category, deadlineLabel, groupName, visibility, notify }: {
  question: string; minBet: number; category: string;
  deadlineLabel: string; groupName: string;
  visibility: Visibility; notify: boolean;
}) {
  const visLabel = visibility === "group" ? "This group only" : visibility === "all_groups" ? "All my groups" : "Public";

  return (
    <div className="space-y-5 pt-4">
      {/* Preview card */}
      <div className="rounded-card border border-b-0 bg-bg-1 p-4 space-y-3 relative">
        <span className="absolute -top-2 right-3 rounded-pill px-2 py-0.5 text-[10px] font-bold bg-success-bg border border-success-border text-success uppercase">
          New
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium bg-bg-2 border border-b-0 text-t-1">
            {groupName}
          </span>
          <span className="inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium bg-no-bg border border-no-border text-no">
            {category}
          </span>
        </div>

        <p className="text-[15px] font-semibold text-t-0 leading-snug">{question}</p>

        <OddsBar yesPool={0} noPool={0} />

        <div className="flex items-center justify-between text-xs text-t-2">
          <span className="font-mono-num font-semibold text-yes">50%</span>
          <span>Closes in {deadlineLabel}</span>
          <span className="font-mono-num font-semibold text-no">50%</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="h-11 rounded-button text-sm font-semibold bg-yes-bg border border-yes-border text-yes flex items-center justify-center">YES</div>
          <div className="h-11 rounded-button text-sm font-semibold bg-no-bg border border-no-border text-no flex items-center justify-center">NO</div>
        </div>

        <div className="rounded-card bg-coin-bg border border-coin-border px-3 py-2 flex items-center gap-2 text-xs text-coin">
          <span className="h-1.5 w-1.5 rounded-full bg-coin" />
          Min bet: {minBet} coins to enter
        </div>
      </div>

      {/* Summary table */}
      <div className="rounded-card bg-bg-1 border border-b-0 p-4 space-y-3">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-t-2">Summary</h4>
        {[
          ["Min bet", `${minBet} coins`],
          ["Category", category],
          ["Closes", deadlineLabel],
          ["Group", groupName],
          ["Visibility", visLabel],
          ["Notify", notify ? "Yes" : "No"],
          ["Judge assigned", "At close · randomly"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-t-1">{label}</span>
            <span className="text-t-0 font-semibold">{value}</span>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-card bg-bg-1 border border-b-0 px-4 py-3 flex items-center gap-2 text-xs text-t-2">
        <span>⏱</span>
        <span>Can't edit once live. You can close it early.</span>
      </div>
    </div>
  );
}
