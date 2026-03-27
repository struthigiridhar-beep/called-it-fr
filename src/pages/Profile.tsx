import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, betResult } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import EditProfileSheet from "@/components/EditProfileSheet";
import InviteSheet from "@/components/InviteSheet";

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  prophetic: { bg: "#241A30", color: "#A07FD8", border: "#382A50" },
  wildcard: { bg: "#201800", color: "#C8A860", border: "#362A04" },
  hyped: { bg: "#1E0906", color: "#C47860", border: "#38140C" },
  judge: { bg: "#0C1A0A", color: "#7AB870", border: "#203A18" },
  creator: { bg: "#0E1820", color: "#7B9EC8", border: "#162434" },
};

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSelf = userId === currentUser?.id;

  const {
    user, memberships, currentUserGroupIds, recentBets,
    settledRecord, streakHistory, referralStats,
    lifetimeXp, avgIntegrity, bestCrewRole, accuracy, loading,
  } = useProfile(userId, currentUser?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#100E0C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ width: "80%", height: 18, background: "#171412", borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100dvh", background: "#100E0C", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#5C5248" }}>Couldn't load profile</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 12, fontSize: 13, color: "#7B9EC8", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
      </div>
    );
  }

  const initials = user.name.split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ minHeight: "100dvh", background: "#100E0C" }}>
      {/* Sticky nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#100E0C", borderBottom: "1px solid #1A1714", padding: "13px 16px", display: "flex", alignItems: "center" }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: "#7B9EC8", background: "none", border: "none", cursor: "pointer" }}>←</button>
        <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: 14, fontWeight: 600, color: "#EAE4DC" }}>{user.name}</span>
        <div style={{ width: 20 }} />
      </div>

      {/* Header */}
      <div style={{ padding: "22px 16px 14px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: 99, backgroundColor: user.avatar_color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#100E0C" }}>
          {initials}
        </div>
        <p style={{ fontSize: 19, fontWeight: 700, color: "#EAE4DC", letterSpacing: -0.3, marginTop: 10, marginBottom: 3 }}>{user.name}</p>
        {user.status_text ? (
          <p style={{ fontSize: 12, color: "#9A8E84", fontStyle: "italic", marginBottom: 10 }}>{user.status_text}</p>
        ) : isSelf ? (
          <button onClick={() => setEditOpen(true)} style={{ fontSize: 12, color: "#4A4038", fontStyle: "italic", marginBottom: 10, background: "none", border: "none", cursor: "pointer" }}>Add a status...</button>
        ) : null}
        {bestCrewRole && (
          <span style={{
            borderRadius: 99, fontSize: 11, fontWeight: 600, padding: "3px 11px", marginBottom: 8,
            background: ROLE_STYLES[bestCrewRole.role]?.bg, color: ROLE_STYLES[bestCrewRole.role]?.color,
            border: `1px solid ${ROLE_STYLES[bestCrewRole.role]?.border}`,
          }}>
            {bestCrewRole.emoji} {bestCrewRole.label} · {bestCrewRole.groupName}
          </span>
        )}
        <p style={{ fontSize: 10, color: "#4A4038" }}>Member since {format(new Date(user.created_at), "MMM yyyy")}</p>
      </div>

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, padding: "0 14px 12px" }}>
        <StatCard label="Lifetime XP" value={lifetimeXp.toLocaleString()} unit="xp" />
        <StatCard
          label="Accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          unit={settledRecord.settled >= 3 ? `${settledRecord.settled} bets` : "< 3 bets"}
        />
        {isSelf ? (
          <StatCard label="Coins" value={(memberships[0]?.coins ?? 0).toLocaleString()} unit="this week" />
        ) : (
          <StatCard label="Bets" value={settledRecord.totalBets.toString()} unit="total" />
        )}
      </div>

      {/* Judge integrity */}
      <div style={{ margin: "0 14px 12px", background: "#171412", border: "1px solid #242018", borderRadius: 11, padding: "10px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#4A4038" }}>⚖️ Judge integrity</span>
          {avgIntegrity > 0 ? (
            <span>
              <span style={{ fontSize: 16, fontFamily: "monospace", color: "#C8A860" }}>{avgIntegrity}</span>
              <span style={{ fontSize: 9, color: "#5C5248" }}> / 100</span>
            </span>
          ) : (
            <span style={{ fontSize: 10, color: "#4A4038" }}>No verdicts yet</span>
          )}
        </div>
        {avgIntegrity > 0 && (
          <div style={{ height: 5, background: "#1E1A17", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#C8A860", width: `${avgIntegrity}%`, borderRadius: 99 }} />
          </div>
        )}
      </div>

      {/* Action strip */}
      <div style={{ display: "flex", gap: 7, padding: "0 14px 14px" }}>
        {isSelf ? (
          <>
            <ActionBtn icon="✏️" label="Edit profile" bg="#0E1820" border="#1E3048" color="#7B9EC8" onClick={() => setEditOpen(true)} />
            <ActionBtn icon="🔗" label="Invite friends" bg="#171412" border="#242018" color="#9A8E84" onClick={() => setInviteOpen(true)} />
          </>
        ) : (
          <>
            <ActionBtn icon="🪙" label="Send coins" bg="#1C1608" border="#362810" color="#C8A860" onClick={() => {}} />
            <ActionBtn icon="➕" label="Add to group" bg="#0E1820" border="#1E3048" color="#7B9EC8" onClick={() => {}} />
          </>
        )}
      </div>

      {/* Groups section */}
      <SectionLabel label={isSelf ? "Your groups" : "Groups"} />
      <div style={{ padding: "0 14px 4px" }}>
        {memberships.map((m) => {
          const isShared = currentUserGroupIds.has(m.group_id);
          const showLocked = !isSelf && !isShared;
          return (
            <div
              key={m.group_id}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 0", borderBottom: "1px solid #1A1714", opacity: showLocked ? 0.55 : 1 }}
              onClick={() => isShared || isSelf ? navigate(`/group/${m.group_id}`) : undefined}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#1E1A17", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#9A8E84", flexShrink: 0 }}>
                {m.group_name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#EAE4DC", marginBottom: 3 }}>{m.group_name}</p>
                {!showLocked && m.crew_role && ROLE_STYLES[m.crew_role] && (
                  <span style={{
                    borderRadius: 99, fontSize: 8, fontWeight: 700, padding: "1px 6px",
                    background: ROLE_STYLES[m.crew_role].bg, color: ROLE_STYLES[m.crew_role].color,
                    border: `1px solid ${ROLE_STYLES[m.crew_role].border}`,
                  }}>
                    {m.crew_role}
                  </span>
                )}
                {showLocked && <p style={{ fontSize: 10, color: "#3A3230" }}>Not in this group</p>}
                {!isSelf && isShared && (
                  <span style={{ display: "block", marginTop: 3, background: "#0C1A0A", border: "1px solid #203A18", borderRadius: 99, fontSize: 9, fontWeight: 600, color: "#7AB870", padding: "1px 7px", width: "fit-content" }}>
                    you're in this one
                  </span>
                )}
              </div>
              {showLocked ? (
                <span style={{ fontSize: 13, color: "#3A3230", flexShrink: 0 }}>🔒</span>
              ) : (
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#9A8E84", flexShrink: 0 }}>{m.xp} xp</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Recent bets */}
      <SectionLabel label="Recent bets" />
      <div style={{ padding: "0 14px 4px" }}>
        {recentBets.length === 0 ? (
          <p style={{ fontSize: 12, color: "#4A4038", padding: "12px 0" }}>No bets yet</p>
        ) : recentBets.map((bet) => {
          const result = betResult(bet);
          const isYes = bet.side === "yes";
          return (
            <div key={bet.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 0", borderBottom: "1px solid #1A1714" }}>
              <span style={{
                background: isYes ? "#0E1820" : "#221410",
                border: `1px solid ${isYes ? "#1E3048" : "#442820"}`,
                borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "2px 5px",
                color: isYes ? "#7B9EC8" : "#C47860", letterSpacing: "0.04em", flexShrink: 0,
              }}>
                {bet.side.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: "#9A8E84", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {bet.question ?? "—"}
              </span>
              <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, color: result.color, flexShrink: 0 }}>
                {result.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Streak history */}
      <SectionLabel label="Streak history" />
      <div style={{ padding: "0 14px 24px" }}>
        {streakHistory.length === 0 ? (
          <p style={{ fontSize: 12, color: "#4A4038" }}>No bets settled yet</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {streakHistory.map((s, i) => {
              const isActive = s.status === "active";
              const isPeak = !isActive && i === (streakHistory[0]?.status === "active" ? 1 : 0);
              if (isActive) {
                return <span key={i} style={{ background: "#1C1608", border: "1px solid #362810", borderRadius: 99, fontSize: 10, fontFamily: "monospace", color: "#C8A860", padding: "3px 9px", fontWeight: 600 }}>🔥 {s.length}× current</span>;
              }
              if (isPeak) {
                return <span key={i} style={{ background: "#1C1608", border: "1px solid #362810", borderRadius: 99, fontSize: 10, fontFamily: "monospace", color: "#C8A860", padding: "3px 9px", fontWeight: 600, opacity: 0.6 }}>{s.length}× peak</span>;
              }
              return <span key={i} style={{ background: "#1A1714", border: "1px solid #222018", borderRadius: 99, fontSize: 10, fontFamily: "monospace", color: "#3E3830", padding: "3px 9px" }}>{s.length}× RIP</span>;
            })}
          </div>
        )}
      </div>

      {/* Bottom sheets */}
      {isSelf && user && (
        <>
          <EditProfileSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            user={{ name: user.name, status_text: user.status_text, avatar_color: user.avatar_color }}
            userId={userId!}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile-user", userId] })}
          />
          <InviteSheet
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            userId={userId!}
            referralStats={referralStats}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{ background: "#171412", border: "1px solid #242018", borderRadius: 11, padding: "10px 8px", textAlign: "center" }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4A4038", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: "#EAE4DC", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 9, color: "#5C5248", marginTop: 2 }}>{unit}</p>
    </div>
  );
}

function ActionBtn({ icon, label, bg, border, color, onClick }: { icon: string; label: string; bg: string; border: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`, borderRadius: 11, flex: 1,
        padding: "11px 4px", display: "flex", flexDirection: "column", alignItems: "center",
        gap: 4, cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 10, color }}>{label}</span>
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 4px" }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#4A4038", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#1A1714" }} />
    </div>
  );
}
