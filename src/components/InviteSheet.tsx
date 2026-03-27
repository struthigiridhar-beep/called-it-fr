import { useState } from "react";

interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  referralStats: { count: number; coinsEarned: number };
}

export default function InviteSheet({ open, onClose, userId, referralStats }: InviteSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const referralUrl = `https://calledit.app/ref/${userId}`;
  const waMessage = `I've been calling it all along 🔮 Join me on Called It — prediction markets for people who actually know each other. ${referralUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "Called It", url: referralUrl }); } catch {}
    } else {
      copyLink();
    }
  };

  const btnStyle: React.CSSProperties = {
    background: "#1E1A17", border: "1px solid #2A2420", borderRadius: 11,
    flex: 1, padding: "10px 4px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 5, cursor: "pointer",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#171412", borderRadius: "20px 20px 0 0",
          borderTop: "1px solid #2A2420", padding: "0 16px 28px",
          maxWidth: 430, margin: "0 auto",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#2A2420", borderRadius: 99, margin: "14px auto 18px" }} />

        <p style={{ fontSize: 15, fontWeight: 700, color: "#EAE4DC", marginBottom: 3 }}>Invite friends to Called It</p>
        <p style={{ fontSize: 12, color: "#5C5248", lineHeight: 1.5, marginBottom: 16 }}>
          When they place their first bet, you earn 50 coins. No group needed — they can join a group after.
        </p>

        {/* Hero box */}
        <div style={{ background: "#1E1A17", borderRadius: 13, padding: 14, marginBottom: 16, textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#EAE4DC", marginBottom: 4 }}>Your referral link</p>
          <p style={{ fontSize: 11, color: "#5C5248", lineHeight: 1.5 }}>Anyone who signs up through this link is tracked to you.</p>
        </div>

        {/* Link box */}
        <div style={{ background: "#1A1714", border: "1px solid #2A2420", borderRadius: 10, padding: "10px 12px", marginBottom: 14, wordBreak: "break-all" }}>
          <span style={{ fontSize: 10, fontFamily: "monospace" }}>
            <span style={{ color: "#7B9EC8" }}>calledit.app/ref/</span>
            <span style={{ color: "#5C5248" }}>{userId}</span>
          </span>
        </div>

        {/* Share buttons */}
        <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, "_blank")}
            style={{ ...btnStyle, background: "#091A09", border: "1px solid #183018" }}
          >
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontSize: 10, color: "#7AB870" }}>WhatsApp</span>
          </button>
          <button onClick={copyLink} style={btnStyle}>
            <span style={{ fontSize: 16 }}>🔗</span>
            <span style={{ fontSize: 10, color: copied ? "#7AB870" : "#9A8E84" }}>
              {copied ? "Copied ✓" : "Copy link"}
            </span>
          </button>
          <button onClick={share} style={btnStyle}>
            <span style={{ fontSize: 16 }}>↗️</span>
            <span style={{ fontSize: 10, color: "#9A8E84" }}>Share</span>
          </button>
        </div>

        {/* Referral stats */}
        <p style={{ textAlign: "center", fontSize: 10, color: "#4A4038", lineHeight: 1.6 }}>
          {referralStats.count > 0 ? (
            <>
              You've brought in {referralStats.count} people · earned{" "}
              <span style={{ color: "#C8A860", fontFamily: "monospace" }}>{referralStats.coinsEarned}</span>
              {" "}in referral coins
            </>
          ) : (
            "Share your link to start earning referral coins"
          )}
        </p>
      </div>
    </div>
  );
}
