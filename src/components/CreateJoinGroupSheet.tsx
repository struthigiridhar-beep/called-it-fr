import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateJoinGroupSheet({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleCreate = async () => {
    if (!groupName.trim() || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("groups")
        .insert({ name: groupName.trim(), created_by: user.id, is_public: false })
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("group_members").insert({
        user_id: user.id,
        group_id: data.id,
        coins: 500,
        xp: 0,
        streak: 0,
        judge_integrity: 0,
      });

      onOpenChange(false);
      navigate(`/group/${data.id}?showInvite=true`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setJoining(true);
    setJoinError("");
    try {
      // Parse code from link or raw code
      let code = joinCode.trim();
      if (code.includes("/")) {
        const parts = code.split("/").filter(Boolean);
        code = parts[parts.length - 1];
        // Strip query params
        code = code.split("?")[0];
      }

      const { data: invite, error } = await supabase
        .from("invites")
        .select("id, group_id, uses")
        .eq("code", code)
        .single();

      if (error || !invite) {
        setJoinError("Invalid code. Check the link and try again.");
        return;
      }

      await supabase
        .from("invites")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      await supabase.from("group_members").upsert(
        {
          user_id: user.id,
          group_id: invite.group_id,
          coins: 500,
          xp: 0,
          streak: 0,
          judge_integrity: 0,
        },
        { onConflict: "user_id,group_id" }
      );

      onOpenChange(false);
      navigate(`/group/${invite.group_id}`);
    } catch (err) {
      console.error(err);
      setJoinError("Something went wrong. Try again.");
    } finally {
      setJoining(false);
    }
  };

  const inputStyle =
    "w-full rounded-[13px] border px-3.5 py-3 text-sm text-t-0 outline-none placeholder:text-t-2 focus:border-t-2";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-bg-0 border-t border-b-0 rounded-t-[20px] px-4 pb-8">
        <SheetHeader className="sr-only">
          <SheetTitle>Create or Join Group</SheetTitle>
          <SheetDescription>Create a new group or join with a code</SheetDescription>
        </SheetHeader>

        {/* Create */}
        <div className="mt-2">
          <p className="text-[13px] font-semibold text-t-0 mb-2.5">Create a new group</p>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className={inputStyle}
            style={{ background: "#1E1A17", borderColor: "#2A2420" }}
          />
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || creating}
            className="w-full mt-3 rounded-[10px] py-[11px] text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-35"
            style={{ background: "#EAE4DC", color: "#100E0C" }}
          >
            {creating ? "Creating…" : "Create →"}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "#1E1A17" }} />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-[11px] bg-bg-0" style={{ color: "#4A4038" }}>or</span>
          </div>
        </div>

        {/* Join */}
        <div>
          <p className="text-[13px] font-semibold text-t-0 mb-2.5">Join with a code or link</p>
          <input
            value={joinCode}
            onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
            placeholder="Paste a link or code"
            className={inputStyle}
            style={{ background: "#1E1A17", borderColor: "#2A2420" }}
          />
          {joinError && (
            <p className="text-xs mt-1.5" style={{ color: "#C47860" }}>{joinError}</p>
          )}
          <button
            onClick={handleJoin}
            disabled={!joinCode.trim() || joining}
            className="w-full mt-3 rounded-[10px] py-[11px] text-sm font-semibold border transition-all active:scale-[0.97] disabled:opacity-35"
            style={{ background: "#171412", borderColor: "#2A2420", color: "#EAE4DC" }}
          >
            {joining ? "Joining…" : "Join group →"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
