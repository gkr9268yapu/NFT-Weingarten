"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import Navbar from "@/components/Navbar";
import {
    listenCalendarSessions,
    listenPlayerStats,
    listenPlayerStatsMultiMonth,
    computeStats,
    addCalendarSession,
    deleteCalendarSession,
    updateSessionStats,
} from "@/lib/playerDB";
import type { CalendarSession, SessionType, ComputedPlayerStats, PlayerSessionStats } from "@/lib/playerTypes";
import type { User } from "@/lib/types";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getMonthKey(year: number, month: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

export default function PlayersPage() {
    const { currentUser, users, loading } = useApp();
    const router = useRouter();

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [sessionType, setSessionType] = useState<SessionType>("training");

    // Menu state
    const [showMenu, setShowMenu] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editTab, setEditTab] = useState<"calendar" | "stats">("calendar");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [customActive, setCustomActive] = useState(false);
    const [customMonths, setCustomMonths] = useState<string[]>([]);

    // Calendar
    const [sessions, setSessions] = useState<CalendarSession[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [addingSession, setAddingSession] = useState(false);

    // Stats
    const [allStats, setAllStats] = useState<any[]>([]);
    const [computed, setComputed] = useState<ComputedPlayerStats[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<ComputedPlayerStats | null>(null);
    const [editingStats, setEditingStats] = useState<{ sessionId: string; sessionLabel: string } | null>(null);
    const [statsForm, setStatsForm] = useState<Record<string, PlayerSessionStats>>({});

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !currentUser) router.push("/");
    }, [loading, currentUser, router]);

    // Listen calendar sessions for current view month
    useEffect(() => {
        const month = getMonthKey(viewYear, viewMonth);
        const unsub = listenCalendarSessions(month, setSessions);
        return () => unsub();
    }, [viewYear, viewMonth]);

    // Listen player stats
    useEffect(() => {
        const month = getMonthKey(viewYear, viewMonth);
        const months = customActive ? customMonths : [month];
        if (months.length === 0) return;
        const unsub = months.length === 1
            ? listenPlayerStats(months[0], sessionType, setAllStats)
            : listenPlayerStatsMultiMonth(months, sessionType, setAllStats);
        return () => unsub();
    }, [viewYear, viewMonth, sessionType, customActive, customMonths]);

    // Compute stats whenever data changes
    useEffect(() => {
        const month = getMonthKey(viewYear, viewMonth);
        const months = customActive ? customMonths : [month];
        const result = computeStats(users, allStats, sessions, sessionType, months);
        setComputed(result);
    }, [users, allStats, sessions, sessionType, customActive, customMonths, viewYear, viewMonth]);

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showMenu]);

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
        </div>
    );
    if (!currentUser) return null;

    const isHost = currentUser.role === "host";
    const monthKey = getMonthKey(viewYear, viewMonth);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
        setCustomActive(false);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
        setCustomActive(false);
    };

    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        const months: string[] = [];
        const [fy, fm] = customFrom.split("-").map(Number);
        const [ty, tm] = customTo.split("-").map(Number);
        let cy = fy, cm = fm - 1;
        while (cy < ty || (cy === ty && cm < tm)) {
            months.push(getMonthKey(cy, cm));
            cm++; if (cm > 11) { cm = 0; cy++; }
        }
        months.push(getMonthKey(ty, tm - 1));
        setCustomMonths(months);
        setCustomActive(true);
        setShowCustom(false);
    };

    // Calendar helpers
    const typeSessions = sessions.filter(s => s.type === sessionType);
    const trainingCount = sessions.filter(s => s.type === "training").length;
    const mainCount = sessions.filter(s => s.type === "main").length;

    const handleAddSession = async (day: number, type: SessionType) => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const existing = sessions.filter(s => s.type === type);
        const label = type === "training"
            ? `Training Day ${existing.length + 1}`
            : `Main Match Day ${existing.length + 1}`;
        setAddingSession(true);
        await addCalendarSession({ date: dateStr, type, label, month: monthKey });
        setAddingSession(false);
        setSelectedDay(null);
    };

    const handleDeleteSession = async (id: string) => {
        await deleteCalendarSession(id);
    };

    // Stats editing
    const openStatsEdit = (session: CalendarSession) => {
        const players = users.filter(u => u.role === "user");
        const initial: Record<string, PlayerSessionStats> = {};
        for (const p of players) {
            const playerStat = allStats.find(s => s.playerId === p.id);
            initial[p.id] = playerStat?.sessions?.[session.id] ?? {
                attended: false, goals: 0, manOfMatch: 0, mvpPoints: 0,
            };
        }
        setStatsForm(initial);
        setEditingStats({ sessionId: session.id, sessionLabel: session.label });
    };

    const handleSaveStats = async () => {
        if (!editingStats) return;
        const players = users.filter(u => u.role === "user");
        for (const player of players) {
            await updateSessionStats(
                player.id, player.name, monthKey, sessionType,
                editingStats.sessionId, statsForm[player.id]
            );
        }
        setEditingStats(null);
    };

    // Medal colors
    const medal = (rank: number) => {
        if (rank === 0) return "#FFD700";
        if (rank === 1) return "#C0C0C0";
        if (rank === 2) return "#CD7F32";
        return "rgba(255,255,255,.3)";
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

    return (
        <div style={{ background: "#070d1a", minHeight: "100dvh" }}>
            <Navbar />
            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 20px 40px" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 48, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1 }}>
                            Players <span style={{ color: "#00e676" }}>Stats</span>
                        </h1>
                        {/* Training / Main toggle */}
                        <div style={{ display: "flex", background: "rgba(255,255,255,.06)", borderRadius: 20, padding: 3, border: "1px solid rgba(255,255,255,.1)" }}>
                            {(["training", "main"] as SessionType[]).map(t => (
                                <button key={t} onClick={() => setSessionType(t)}
                                    style={{ padding: "6px 16px", borderRadius: 18, border: "none", background: sessionType === t ? "#00e676" : "transparent", color: sessionType === t ? "#070d1a" : "rgba(255,255,255,.5)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: .5, transition: "all .2s" }}>
                                    {t === "training" ? "Training" : "Main Match"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Month switcher */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "6px 14px" }}>
                            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>←</button>
                            <span style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, minWidth: 100, textAlign: "center" }}>
                                {customActive ? `${customFrom} → ${customTo}` : `${MONTHS[viewMonth]} ${viewYear}`}
                            </span>
                            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>→</button>
                        </div>

                        {/* Three dots menu */}
                        <div ref={menuRef} style={{ position: "relative" }}>
                            <button onClick={() => setShowMenu(!showMenu)}
                                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                ⋮
                            </button>
                            {showMenu && (
                                <div style={{ position: "absolute", right: 0, top: 42, background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, overflow: "hidden", minWidth: 150, boxShadow: "0 12px 40px rgba(0,0,0,.7)", zIndex: 200 }}>
                                    <button onClick={() => { setShowMenu(false); setShowCustom(true); }}
                                        style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#fff", fontSize: 14, textAlign: "left", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                        📅 Custom Range
                                    </button>
                                    {isHost && (
                                        <button onClick={() => { setShowMenu(false); setShowEdit(true); }}
                                            style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#fff", fontSize: 14, textAlign: "left", cursor: "pointer" }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                            ✏️ Edit
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Players list */}
                <div style={{ background: "rgba(255,255,255,.03)", border: "2px solid rgba(255,82,82,.3)", borderRadius: 20, overflow: "hidden" }}>
                    {/* Table header */}
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                        <div style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>Rank</div>
                        <div style={{ color: "#ff5252", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>Name</div>
                        <div style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>Position</div>
                    </div>

                    {computed.length === 0 ? (
                        <div style={{ padding: "60px 24px", textAlign: "center", color: "rgba(255,255,255,.3)", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18 }}>
                            No player data for this period
                        </div>
                    ) : computed.map((player, idx) => (
                        <div key={player.playerId}
                            onClick={() => setSelectedPlayer(player)}
                            style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,.05)", cursor: "pointer", transition: "background .15s", alignItems: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                            {/* Rank */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: idx < 3 ? medal(idx) : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 14, color: idx < 3 ? "#070d1a" : "rgba(255,255,255,.5)" }}>
                                    {idx + 1}
                                </div>
                            </div>

                            {/* Name + photo */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", border: `2px solid ${medal(idx)}`, flexShrink: 0 }}>
                                    {player.photoURL ? (
                                        <img src={player.photoURL} alt={player.playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>
                                            {player.playerName[0]}
                                        </div>
                                    )}
                                </div>
                                <span style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700 }}>{player.playerName}</span>
                            </div>

                            {/* Position */}
                            <div style={{ color: "rgba(255,255,255,.6)", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16 }}>
                                {player.position ?? "—"}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── PLAYER BANNER MODAL ───────────────────────── */}
            {selectedPlayer && (
                <div onClick={() => setSelectedPlayer(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()}
                        style={{ background: "linear-gradient(135deg,#6b7db3 0%,#8b9dc3 100%)", borderRadius: 20, padding: 32, width: "100%", maxWidth: 600, boxShadow: "0 20px 60px rgba(0,0,0,.8)", position: "relative" }}>
                        <button onClick={() => setSelectedPlayer(null)}
                            style={{ position: "absolute", top: 16, right: 16, background: "rgba(0,0,0,.3)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>

                        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                            {/* Left — photo + position + MVP */}
                            <div style={{ flexShrink: 0 }}>
                                <div style={{ color: "#1a2540", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                                    {selectedPlayer.position ?? "Player"}
                                </div>
                                <div style={{ width: 140, height: 140, borderRadius: "50%", overflow: "hidden", border: "4px solid rgba(255,255,255,.3)" }}>
                                    {selectedPlayer.photoURL ? (
                                        <img src={selectedPlayer.photoURL} alt={selectedPlayer.playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 48, color: "#fff" }}>
                                            {selectedPlayer.playerName[0]}
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 20 }}>⭐</span>
                                    <span style={{ color: "#1a2540", fontWeight: 700, fontSize: 14 }}>MVP Points: {selectedPlayer.mvpPoints}</span>
                                </div>
                            </div>

                            {/* Right — name + stats */}
                            <div style={{ flex: 1 }}>
                                <h2 style={{ color: "#1a2540", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, marginBottom: 24, lineHeight: 1 }}>
                                    {selectedPlayer.playerName}
                                </h2>
                                {[
                                    { label: "Attendance", value: `${selectedPlayer.attendance}%` },
                                    { label: "Goal Score", value: selectedPlayer.goals },
                                    { label: "Man of the Match", value: selectedPlayer.manOfMatch },
                                    { label: "Total Points", value: selectedPlayer.totalPoints },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(26,37,64,.2)" }}>
                                        <span style={{ color: "#1a2540", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700 }}>{label}:</span>
                                        <span style={{ color: "#1a2540", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900 }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CUSTOM DATE RANGE MODAL ───────────────────── */}
            {showCustom && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                            <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900 }}>Custom Range</h3>
                            <button onClick={() => setShowCustom(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>From</label>
                            <input type="month" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>To</label>
                            <input type="month" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={handleCustomApply} disabled={!customFrom || !customTo}
                            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer", opacity: !customFrom || !customTo ? 0.5 : 1 }}>
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {/* ── HOST EDIT MODAL ───────────────────────────── */}
            {showEdit && isHost && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>

                        {/* Modal header */}
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <div style={{ display: "flex", gap: 8 }}>
                                {(["calendar", "stats"] as const).map(tab => (
                                    <button key={tab} onClick={() => setEditTab(tab)}
                                        style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: editTab === tab ? "#00e676" : "rgba(255,255,255,.06)", color: editTab === tab ? "#070d1a" : "rgba(255,255,255,.5)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", textTransform: "capitalize" }}>
                                        {tab === "calendar" ? "📅 Calendar" : "📊 Player Stats"}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

                            {/* ── CALENDAR TAB ── */}
                            {editTab === "calendar" && (
                                <div>
                                    <div style={{ marginBottom: 20 }}>
                                        <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                                            {MONTHS[viewMonth]} {viewYear}
                                        </h3>
                                        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>
                                            Click a day to add a Training or Main Match session
                                        </p>
                                    </div>

                                    {/* Calendar grid */}
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 20 }}>
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                            <div key={d} style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 11, fontWeight: 700, padding: "4px 0" }}>{d}</div>
                                        ))}
                                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                            const daySessions = sessions.filter(s => s.date === dateStr);
                                            const hasTraining = daySessions.some(s => s.type === "training");
                                            const hasMain = daySessions.some(s => s.type === "main");
                                            return (
                                                <div key={day} onClick={() => setSelectedDay(day)}
                                                    style={{ aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: selectedDay === day ? "rgba(0,230,118,.15)" : "rgba(255,255,255,.04)", border: selectedDay === day ? "1px solid #00e676" : "1px solid rgba(255,255,255,.06)", position: "relative" }}>
                                                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{day}</span>
                                                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                                                        {hasTraining && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e676" }} />}
                                                        {hasMain && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5252" }} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Day actions */}
                                    {selectedDay && (
                                        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                                            <div style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>
                                                {MONTHS[viewMonth]} {selectedDay}, {viewYear}
                                            </div>
                                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                                <button onClick={() => handleAddSession(selectedDay, "training")} disabled={addingSession}
                                                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "rgba(0,230,118,.15)", color: "#00e676", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                                    + Training Session
                                                </button>
                                                <button onClick={() => handleAddSession(selectedDay, "main")} disabled={addingSession}
                                                    style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "rgba(255,82,82,.15)", color: "#ff5252", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                                                    + Main Match
                                                </button>
                                            </div>
                                            {/* Sessions on this day */}
                                            {sessions.filter(s => {
                                                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
                                                return s.date === dateStr;
                                            }).map(s => (
                                                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 8, marginBottom: 6 }}>
                                                    <span style={{ color: s.type === "training" ? "#00e676" : "#ff5252", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                                                    <button onClick={() => handleDeleteSession(s.id)} style={{ background: "none", border: "none", color: "rgba(255,82,82,.7)", cursor: "pointer", fontSize: 16 }}>🗑</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* All sessions list */}
                                    <div>
                                        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                                            All Sessions — Training ({trainingCount}) | Main ({mainCount})
                                        </div>
                                        {typeSessions.length === 0 ? (
                                            <div style={{ color: "rgba(255,255,255,.3)", fontSize: 14 }}>No {sessionType} sessions added yet</div>
                                        ) : typeSessions.map(s => (
                                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                                                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{s.date}</div>
                                                </div>
                                                <button onClick={() => handleDeleteSession(s.id)} style={{ background: "none", border: "none", color: "rgba(255,82,82,.7)", cursor: "pointer", fontSize: 16 }}>🗑</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── STATS TAB ── */}
                            {editTab === "stats" && (
                                <div>
                                    <div style={{ marginBottom: 16 }}>
                                        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>
                                            Click on a session to enter player stats
                                        </p>
                                    </div>

                                    {typeSessions.length === 0 ? (
                                        <div style={{ color: "rgba(255,255,255,.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                                            No {sessionType} sessions yet. Add them in the Calendar tab first.
                                        </div>
                                    ) : typeSessions.map(session => (
                                        <div key={session.id}
                                            onClick={() => openStatsEdit(session)}
                                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, marginBottom: 8, cursor: "pointer" }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.08)")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}>
                                            <div>
                                                <div style={{ color: "#fff", fontWeight: 700 }}>{session.label}</div>
                                                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{session.date}</div>
                                            </div>
                                            <span style={{ color: "#00e676", fontSize: 13, fontWeight: 700 }}>Edit Stats →</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── STATS ENTRY MODAL ─────────────────────────── */}
            {editingStats && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                            <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900 }}>{editingStats.sessionLabel}</h3>
                            <button onClick={() => setEditingStats(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                        </div>

                        {/* Table header */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px", gap: 8, padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
                            {["Player", "Present", "Goals", "Man of Match", "MVP Pts"].map(h => (
                                <div key={h} style={{ color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{h}</div>
                            ))}
                        </div>

                        {/* Player rows */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
                            {users.filter(u => u.role === "user").map(player => {
                                const stat = statsForm[player.id] ?? { attended: false, goals: 0, manOfMatch: 0, mvpPoints: 0 };
                                const update = (field: keyof PlayerSessionStats, value: any) => {
                                    setStatsForm(prev => ({ ...prev, [player.id]: { ...stat, [field]: value } }));
                                };
                                return (
                                    <div key={player.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 80px 80px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                                                {player.photoURL ? (
                                                    <img src={player.photoURL} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                ) : (
                                                    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                                                        {player.name[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{player.name}</span>
                                        </div>
                                        {/* Attended checkbox */}
                                        <div style={{ display: "flex", justifyContent: "center" }}>
                                            <input type="checkbox" checked={stat.attended} onChange={e => update("attended", e.target.checked)}
                                                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#00e676" }} />
                                        </div>
                                        {/* Goals */}
                                        <input type="number" min={0} value={stat.goals} onChange={e => update("goals", Number(e.target.value))}
                                            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                        {/* Man of Match */}
                                        <input type="number" min={0} value={stat.manOfMatch} onChange={e => update("manOfMatch", Number(e.target.value))}
                                            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                        {/* MVP Points */}
                                        <input type="number" min={0} value={stat.mvpPoints} onChange={e => update("mvpPoints", Number(e.target.value))}
                                            style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", gap: 10, flexShrink: 0 }}>
                            <button onClick={() => setEditingStats(null)}
                                style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 14, cursor: "pointer" }}>
                                Cancel
                            </button>
                            <button onClick={handleSaveStats}
                                style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>
                                Save Stats
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}