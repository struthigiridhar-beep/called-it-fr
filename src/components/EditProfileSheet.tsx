import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  user: { name: string; status_text: string | null; avatar_color: string };
  userId: string;
  onSaved: (updated: { name: string; status_text: string | null; avatar_color: string }) => void;
}

const SWATCHES = ["#7B9EC8", "#C47860", "#7AB870", "#C8A860", "#A07FD8", "#9A8E84"];

export default function EditProfileSheet({ open, onClose, user, userId, onSaved }: EditProfileSheetProps) {
  const [name, setName] = useState(user.name);
  const [statusText, setStatusText] = useState(user.status_text ?? "");
  const [color, setColor] = useState(user.avatar_color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const initials = name.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("users")
      .update({ name: name.trim(), status_text: statusText.trim() || null, avatar_color: color })
      .eq("id", userId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    toast.success("Saved");
    onSaved({ name: name.trim(), status_text: statusText.trim() || null, avatar_color: color });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={onClose}>
      {/* Overlay */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />
      {/* Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#171412", borderRadius: "20px 20px 0 0",
          borderTop: "1px solid #2A2420", padding: "0 16px 28px",
          maxWidth: 430, margin: "0 auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "#2A2420", borderRadius: 99, margin: "14px auto 18px" }} />

        {/* Avatar preview */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div
            style={{
              width: 54, height: 54, borderRadius: 99, backgroundColor: color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "#100E0C",
            }}
          >
            {initials || "??"}
          </div>
        </div>

        <p style={{ fontSize: 15, fontWeight: 700, color: "#EAE4DC", marginBottom: 3 }}>Edit profile</p>
        <p style={{ fontSize: 12, color: "#5C5248", lineHeight: 1.5, marginBottom: 18 }}>
          Name and status are visible to everyone in your groups.
        </p>

        {/* Display name */}
        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5C5248", marginBottom: 6, display: "block" }}>
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%", background: "#1E1A17", border: "1px solid #2A2420", borderRadius: 10,
            padding: "10px 12px", fontSize: 13, color: "#EAE4DC", marginBottom: 14, outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4A4038")}
          onBlur={(e) => (e.target.style.borderColor = "#2A2420")}
        />

        {/* Status */}
        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5C5248", marginBottom: 6, display: "block" }}>
          Status
        </label>
        <input
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          placeholder="What's your vibe?"
          style={{
            width: "100%", background: "#1E1A17", border: "1px solid #2A2420", borderRadius: 10,
            padding: "10px 12px", fontSize: 13, color: "#EAE4DC", marginBottom: 14, outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#4A4038")}
          onBlur={(e) => (e.target.style.borderColor = "#2A2420")}
        />

        {/* Avatar colour */}
        <label style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#5C5248", marginBottom: 8, display: "block" }}>
          Avatar colour
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {SWATCHES.map((s) => (
            <button
              key={s}
              onClick={() => setColor(s)}
              style={{
                width: 30, height: 30, borderRadius: 99, backgroundColor: s, border: "none", cursor: "pointer",
                boxShadow: color === s ? `0 0 0 2.5px #100E0C, 0 0 0 4px #EAE4DC` : "none",
              }}
            />
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", background: "#7B9EC8", color: "#0A1420", borderRadius: 11,
            padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {error && <p style={{ fontSize: 12, color: "#C47860", marginTop: 8, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}
