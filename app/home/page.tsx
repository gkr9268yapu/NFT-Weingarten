"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { setAvailability, createMatch, updateMatch, deleteMatch, deleteUserDoc } from "@/lib/firebaseDB";
import Navbar from "@/components/Navbar";
import MatchCard from "@/components/MatchCard";
import DetailModal from "@/components/DetailModal";
import MatchFormModal from "@/components/MatchFormModal";
import type { Match } from "@/lib/types";

const EMPTY_FORM = {
  title: "", team1: "", team2: "", date: "", time: "",
  venue: "", coach: "", description: "", expiryDate: "",
  image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
  available: [] as string[], notAvailable: [] as string[],
};

export default function HomePage() {
  const { currentUser, users, matches, loading } = useApp();
  const router = useRouter();

  const [detailMatch, setDetailMatch] = useState<Match | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  // ✅ All hooks BEFORE any conditional return
  useEffect(() => {
    if (!loading && !currentUser) router.push("/");
  }, [loading, currentUser, router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>⚽</div>
  );
  if (!currentUser) return null;

  const today = new Date().toISOString().split("T")[0];
  const activeMatches = matches.filter(m => m.expiryDate >= today);
  const liveDetail = detailMatch ? (matches.find(m => m.id === detailMatch.id) ?? detailMatch) : null;

  const handleAvailability = async (id: string, status: "available" | "notAvailable") => {
    const m = matches.find(x => x.id === id);
    if (!m) return;
    await setAvailability(id, currentUser.name, status, { available: m.available, notAvailable: m.notAvailable });
  };

  const handleAdd = async () => {
    if (!newForm.title || !newForm.team1 || !newForm.team2) return;
    setBusy(true);
    try {
      await createMatch({ ...newForm, available: [], notAvailable: [] });
      // Notify all players about new match
      const { sendPushToAll } = await import("@/lib/notifications");
      await sendPushToAll(
        currentUser.id,
        "📅 New Match Added",
        `${newForm.team1} vs ${newForm.team2} — ${newForm.date}`,
        "/home"
      ).catch(() => { });
      setShowAdd(false);
      setNewForm(EMPTY_FORM);
    } finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    if (!editMatch) return;
    setBusy(true);
    try {
      const { id, ...data } = editMatch;
      await updateMatch(id, data);
      // Notify all players that match was updated
      const { sendPushToAll } = await import("@/lib/notifications");
      await sendPushToAll(
        currentUser.id,
        "📅 Match Updated",
        `${editMatch.team1} vs ${editMatch.team2} — ${editMatch.date}`,
        "/home"
      ).catch(() => { });
      setEditMatch(null);
    } finally { setBusy(false); }
  };

  const handleDeleteMatch = async (id: string) => {
    if (confirm("Delete this match?")) await deleteMatch(id);
  };

  const handleDeleteUser = async (uid: string) => {
    if (confirm("Remove this player?")) await deleteUserDoc(uid);
  };

  type FormData = Omit<Match, "id">;

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 28px" }} className="page-main">
        <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 50, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1 }}>
              Upcoming <span style={{ color: "#00e676" }}>Matches</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.38)", marginTop: 8 }}>Mark your availability for upcoming games</p>
          </div>
          {currentUser.role === "host" && (
            <button onClick={() => setShowAdd(true)} style={{
              background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a",
              border: "none", padding: "13px 26px", borderRadius: 12,
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16,
              boxShadow: "0 4px 20px rgba(0,230,118,.3)",
            }}>+ Add Match</button>
          )}
        </div>

        <div className="fade-in">
          {activeMatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "100px 0", color: "rgba(255,255,255,.2)" }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>⚽</div>
              <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, letterSpacing: 1 }}>No upcoming matches</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 28 }}>
              {activeMatches.map(m => (
                <MatchCard key={m.id} match={m} currentUser={currentUser}
                  onAvailability={handleAvailability}
                  onDetail={setDetailMatch}
                  onEdit={setEditMatch}
                  onDelete={handleDeleteMatch}
                />
              ))}
            </div>
          )}
        </div>

        {currentUser.role === "host" && (
          <div className="fade-in" style={{ marginTop: 64 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 32, fontWeight: 800, marginBottom: 22, letterSpacing: 1, textTransform: "uppercase" }}>
              Manage <span style={{ color: "#00e676" }}>Players</span>
            </h2>
            <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, overflow: "hidden" }}>
              {users.filter(u => u.role === "user").map((u, i, arr) => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 26px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#0070ff,#00e676)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15 }}>{u.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>{u.email}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteUser(u.id)} style={{ background: "rgba(255,82,82,.12)", border: "1px solid rgba(255,82,82,.25)", color: "#ff5252", padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Remove</button>
                </div>
              ))}
              {users.filter(u => u.role === "user").length === 0 && (
                <p style={{ padding: "24px", color: "rgba(255,255,255,.25)", fontSize: 14 }}>No players registered yet.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {liveDetail && <DetailModal match={liveDetail} onClose={() => setDetailMatch(null)} />}
      {showAdd && (
        <MatchFormModal title="Add New Match" btnLabel={busy ? "Creating…" : "CREATE MATCH"}
          btnColor="linear-gradient(135deg,#00e676,#00c853)"
          data={newForm as FormData}
          onChange={d => setNewForm(d as typeof newForm)}
          onSubmit={handleAdd} onClose={() => setShowAdd(false)}
        />
      )}
      {editMatch && (
        <MatchFormModal title="Edit Match" btnLabel={busy ? "Saving…" : "SAVE CHANGES"}
          btnColor="linear-gradient(135deg,#0070ff,#0050cc)"
          data={editMatch}
          onChange={d => setEditMatch(prev => prev ? { ...prev, ...d } : prev)}
          onSubmit={handleSaveEdit} onClose={() => setEditMatch(null)}
        />
      )}
    </div>
  );
}