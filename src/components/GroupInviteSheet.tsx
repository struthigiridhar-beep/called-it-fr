import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Member {
  user_id: string;
  name: string;
  avatar_color: string;
  streak: number;
}

interface MarketPreview {
  id: string;
  question: string;
  yes_pool: number;
  no_pool: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function GroupInviteSheet({ open, onOpenChange, groupId, groupName }: Props) {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [markets, setMarkets] = useState<MarketPreview[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    if (!open || !groupId || !user) return;
    setLoading(true);

    (async () => {
      // Generate invite link
      const { data: link } = await supabase.rpc("generate_invite_link", {
        p_group_id: groupId,
        p_inviter_id: user.id,
      });
      if (link) setInviteLink(link as string);

      // Fetch members
      const { data: gm } = await supabase
        .from("group_members")
        .select("user_id, streak")
        .eq("group_id", groupId);

      if (gm?.length) {
        const userIds = gm.map((m) => m.user_id);
        const { data: users } = await supabase
          .from("users")
          .select("id, name, avatar_color")
          .in("id", userIds);

        const usersMap = new Map((users ?? []).map((u) => [u.id, u]));
        setMembers(
          gm.map((m) => ({
            user_id: m.user_id,
            name: usersMap.get(m.user_id)?.name ?? "??",
            avatar_color: usersMap.get(m.user_id)?.avatar_color ?? "#7B9EC8",
            streak: m.streak,
          }))
        );
      }

      // Fetch open markets
      const { data: mk } = await supabase
        .from("markets")
        .select("id, question, yes_pool, no_pool")
        .eq("group_id", groupId)
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(2);
      setMarkets(mk ?? []);

      // Resolved count
      const { count } = await supabase
        .from("markets")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("status", "resolved");
      setResolvedCount(count ?? 0);

      setLoading(false);
    })();
  }, [open, groupId, user]);

  // Dynamic headline
  const streakMember = members.find((m) => m.streak >= 3);
  const headline = streakMember
    ? `${streakMember.name} is on a ${streakMember.streak}-win streak. Come bet against them.`
    : resolvedCount >= 5
      ? `Your friends have called ${resolvedCount} things right. Are you in?`
      : "Your crew is betting on each other. You're not in it yet.";

  const waMessage = `There's already a market about you 👀 Join us on Called It — bet on things that'll actually happen. ${inviteLink}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Called It", url: inviteLink }); } catch {}
    } else {
      copyLink();
    }
  };

  const renderMarketCard = (m: MarketPreview) => {
    const total = m.yes_pool + m.no_pool;
    const yesPct = total > 0 ? Math.round((m.yes_pool / total) * 100) : 50;
    const noPct = 100 - yesPct;

    return (
      <div
        key={m.id}
        className="rounded-[13px] p-3.5"
        style={{ background: "#1E1A17" }}
      >
        <p className="text-sm font-semibold text-t-0 mb-2.5">{m.question}</p>
        <div className="flex h-1.5 rounded-full overflow-hidden">
          <div style={{ width: `${yesPct}%`, background: "#0E1820" }} />
          <div style={{ width: `${noPct}%`, background: "#221410" }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px] font-mono-num text-yes">{yesPct}% YES</span>
          <span className="text-[11px] font-mono-num text-no">{noPct}% NO</span>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-bg-0 border-t border-b-0 rounded-t-[20px] px-4 pb-7 max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Invite to group</SheetTitle>
          <SheetDescription>Share an invite link</SheetDescription>
        </SheetHeader>

        {/* Group header */}
        <div className="flex items-center gap-3 mt-2 mb-4">
          <div
            className="h-10 w-10 rounded-[10px] flex items-center justify-center text-base"
            style={{ background: "#272220", color: "#9A8E84" }}
          >
            {groupName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-bold text-t-0">{groupName}</p>
            <p className="text-xs" style={{ color: "#5C5248" }}>{members.length} members</p>
          </div>
        </div>

        {/* Overlapping avatars */}
        <div className="flex mb-4">
          {members.slice(0, 5).map((m, i) => (
            <div
              key={m.user_id}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-bg-0"
              style={{
                backgroundColor: m.avatar_color,
                color: "#100E0C",
                marginLeft: i > 0 ? -8 : 0,
                zIndex: 5 - i,
              }}
            >
              {getInitials(m.name)}
            </div>
          ))}
          {members.length > 5 && (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-bg-0"
              style={{ background: "#272220", color: "#9A8E84", marginLeft: -8 }}
            >
              +{members.length - 5}
            </div>
          )}
        </div>

        {/* Headline */}
        <p className="text-base font-bold text-t-0 leading-snug mb-1.5">{headline}</p>
        <p className="text-[13px] text-t-1 mb-4">Join to see the full picture.</p>

        {/* Market cards */}
        {loading ? (
          <div className="rounded-[13px] h-4 mb-2 animate-pulse" style={{ background: "#1E1A17" }} />
        ) : (
          <div className="space-y-2 mb-4">
            {markets.length > 0 && renderMarketCard(markets[0])}
            {/* Blurred teaser */}
            <div className="relative rounded-[13px] overflow-hidden">
              <div
                className="p-3.5 pointer-events-none select-none"
                style={{ background: "#1E1A17", filter: "blur(4px)", opacity: 0.5 }}
              >
                <p className="text-sm font-semibold text-t-0 mb-2.5">
                  {markets[1]?.question ?? "████████████"}
                </p>
                <div className="flex h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: "50%", background: "#0E1820" }} />
                  <div style={{ width: "50%", background: "#221410" }} />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                <span className="text-lg">🔒</span>
                <span className="text-xs" style={{ color: "#9A8E84" }}>Join to see more</span>
              </div>
            </div>
          </div>
        )}

        {/* Invite link */}
        <div
          className="rounded-[10px] border px-3.5 py-2.5 mb-3"
          style={{ background: "#1A1714", borderColor: "#2A2420" }}
        >
          <p className="text-[11px] font-mono-num break-all" style={{ color: "#5C5248" }}>
            {inviteLink ? (
              <>
                <span style={{ color: "#7B9EC8" }}>calledit.app/join/</span>
                {inviteLink.split("/join/")[1] ?? ""}
              </>
            ) : (
              "Generating link…"
            )}
          </p>
        </div>

        {/* Share buttons */}
        <div className="flex gap-[7px] mb-2">
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, "_blank")}
            className="flex-1 flex flex-col items-center gap-1.5 rounded-[11px] border py-2.5"
            style={{ background: "#091A09", borderColor: "#183018" }}
          >
            <span className="text-base">💬</span>
            <span className="text-[10px]" style={{ color: "#7AB870" }}>WhatsApp</span>
          </button>
          <button
            onClick={copyLink}
            className="flex-1 flex flex-col items-center gap-1.5 rounded-[11px] border py-2.5"
            style={{ background: "#1E1A17", borderColor: "#2A2420" }}
          >
            <span className="text-base">🔗</span>
            <span className="text-[10px]" style={{ color: copied ? "#7AB870" : "#9A8E84" }}>
              {copied ? "Copied ✓" : "Copy link"}
            </span>
          </button>
          <button
            onClick={share}
            className="flex-1 flex flex-col items-center gap-1.5 rounded-[11px] border py-2.5"
            style={{ background: "#1E1A17", borderColor: "#2A2420" }}
          >
            <span className="text-base">↗️</span>
            <span className="text-[10px]" style={{ color: "#9A8E84" }}>Share</span>
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={() => onOpenChange(false)}
          className="w-full text-center text-[13px] py-2 mt-1 cursor-pointer"
          style={{ color: "#4A4038" }}
        >
          Skip for now
        </button>
      </SheetContent>
    </Sheet>
  );
}
