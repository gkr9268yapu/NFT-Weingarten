"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import Navbar from "@/components/Navbar";
import {
    listenCalendarSessions, listenPlayerStats, listenPlayerStatsMultiMonth,
    computeStats, addCalendarSession, deleteCalendarSession, updateSessionStats,
} from "@/lib/playerDB";
import type { CalendarSession, SessionType, ComputedPlayerStats, PlayerSessionStats } from "@/lib/playerTypes";
import EditAltIcon from "@/components/icons/EditAltIcon";
import { PlayersSkeleton } from "@/components/Skeletons";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthKey(year: number, month: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
}
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

export default function PlayersPage() {
    const { currentUser, users, loading } = useApp();
    const router = useRouter();
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [sessionType, setSessionType] = useState<SessionType>("training");
    const [showMenu, setShowMenu] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editTab, setEditTab] = useState<"calendar" | "stats">("calendar");
    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");
    const [customActive, setCustomActive] = useState(false);
    const [customMonths, setCustomMonths] = useState<string[]>([]);
    const [sessions, setSessions] = useState<CalendarSession[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [addingSession, setAddingSession] = useState(false);
    const [allStats, setAllStats] = useState<any[]>([]);
    const [computed, setComputed] = useState<ComputedPlayerStats[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<ComputedPlayerStats | null>(null);
    const [editingStats, setEditingStats] = useState<{ sessionId: string; sessionLabel: string } | null>(null);
    const [statsForm, setStatsForm] = useState<Record<string, PlayerSessionStats>>({});
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (!loading && !currentUser) router.push("/"); }, [loading, currentUser, router]);
    useEffect(() => {
        const month = getMonthKey(viewYear, viewMonth);
        const unsub = listenCalendarSessions(month, setSessions);
        return () => unsub();
    }, [viewYear, viewMonth]);
    useEffect(() => {
        const month = getMonthKey(viewYear, viewMonth);
        const months = customActive ? customMonths : [month];
        if (!months.length) return;
        const unsub = months.length === 1
            ? listenPlayerStats(months[0], sessionType, setAllStats)
            : listenPlayerStatsMultiMonth(months, sessionType, setAllStats);
        return () => unsub();
    }, [viewYear, viewMonth, sessionType, customActive, customMonths]);
    useEffect(() => {
        const months = customActive ? customMonths : [getMonthKey(viewYear, viewMonth)];
        setComputed(computeStats(users, allStats, sessions, sessionType, months));
    }, [users, allStats, sessions, sessionType, customActive, customMonths, viewYear, viewMonth]);
    useEffect(() => {
        if (!showMenu) return;
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [showMenu]);

    if (loading) return <PlayersSkeleton />;
    
    if (!currentUser) return null;

    const isHost = currentUser.role === "host";
    const monthKey = getMonthKey(viewYear, viewMonth);
    const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); setCustomActive(false); };
    const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); setCustomActive(false); };
    const handleCustomApply = () => {
        if (!customFrom || !customTo) return;
        const months: string[] = []; const [fy, fm] = customFrom.split("-").map(Number); const [ty, tm] = customTo.split("-").map(Number);
        let cy = fy, cm = fm - 1;
        while (cy < ty || (cy === ty && cm < tm)) { months.push(getMonthKey(cy, cm)); cm++; if (cm > 11) { cm = 0; cy++; } }
        months.push(getMonthKey(ty, tm - 1)); setCustomMonths(months); setCustomActive(true); setShowCustom(false);
    };
    const typeSessions = sessions.filter(s => s.type === sessionType);
    const trainingCount = sessions.filter(s => s.type === "training").length;
    const mainCount = sessions.filter(s => s.type === "main").length;
    const handleAddSession = async (day: number, type: SessionType) => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const label = type === "training" ? `Training Day ${sessions.filter(s => s.type === "training").length + 1}` : `Main Match Day ${sessions.filter(s => s.type === "main").length + 1}`;
        setAddingSession(true); await addCalendarSession({ date: dateStr, type, label, month: monthKey }); setAddingSession(false); setSelectedDay(null);
    };
    const openStatsEdit = (session: CalendarSession) => {
        const players = users.filter(u => u.role === "user"); const initial: Record<string, PlayerSessionStats> = {};
        for (const p of players) { const ps = allStats.find(s => s.playerId === p.id); initial[p.id] = ps?.sessions?.[session.id] ?? { attended: false, goals: 0, assists: 0, manOfMatch: 0, mvpPoints: 0 }; }
        setStatsForm(initial); setEditingStats({ sessionId: session.id, sessionLabel: session.label });
    };
    const handleSaveStats = async () => {
        if (!editingStats) return;
        for (const player of users.filter(u => u.role === "user"))
            await updateSessionStats(player.id, player.name, monthKey, sessionType, editingStats.sessionId, statsForm[player.id]);
        setEditingStats(null);
    };
    const medal = (r: number) => r === 0 ? "#FFD700" : r === 1 ? "#C0C0C0" : r === 2 ? "#CD7F32" : "rgba(255,255,255,.3)";
    const daysInMonth = getDaysInMonth(viewYear, viewMonth); const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

    return (
        <div style={{ background: "#070d1a", minHeight: "100dvh" }}>
            <Navbar />
            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 20px 40px" }}>

                {/* ── HEADER ── */}
                <div className="ps-header">
                    <div className="ps-header-left">
                        <h1 className="ps-title">Players <span style={{ color: "#00e676" }}>Stats</span></h1>
                        <div style={{ display: "flex", background: "rgba(255,255,255,.06)", borderRadius: 20, padding: 3, border: "1px solid rgba(255,255,255,.1)" }}>
                            {(["training", "main"] as SessionType[]).map(t => (
                                <button key={t} onClick={() => setSessionType(t)}
                                    style={{ padding: "6px 16px", borderRadius: 18, border: "none", background: sessionType === t ? "#00e676" : "transparent", color: sessionType === t ? "#070d1a" : "rgba(255,255,255,.5)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: .5, transition: "all .2s", whiteSpace: "nowrap" }}>
                                    {t === "training" ? "Training" : "Main Match"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="ps-header-right">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "6px 14px" }}>
                            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>←</button>
                            <span style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, minWidth: 110, textAlign: "center", whiteSpace: "nowrap" }}>
                                {customActive ? `${customFrom} → ${customTo}` : `${MONTHS[viewMonth]} ${viewYear}`}
                            </span>
                            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>→</button>
                        </div>
                        <div ref={menuRef} style={{ position: "relative" }}>
                            <button onClick={() => setShowMenu(!showMenu)}
                                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⋮</button>
                            {showMenu && (
                                <div style={{ position: "absolute", right: 0, top: 42, background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, overflow: "hidden", minWidth: 160, boxShadow: "0 12px 40px rgba(0,0,0,.7)", zIndex: 200 }}>
                                    <button onClick={() => { setShowMenu(false); setShowCustom(true); }}
                                        style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#fff", fontSize: 14, textAlign: "left", cursor: "pointer" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                        📅 Custom Range
                                    </button>
                                    {isHost && (
                                        <button onClick={() => { setShowMenu(false); setShowEdit(true); }}
                                            style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#fff", fontSize: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                            <EditAltIcon width={15} height={15} /> Edit
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── PLAYERS LIST ── */}
                <div style={{ background: "rgba(255,255,255,.03)", border: "2px solid rgba(255,82,82,.3)", borderRadius: 20, overflow: "hidden" }}>
                    {/* Table header */}
                    <div className="ps-row ps-row-header">
                        <div className="ps-col-rank" style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>Rank</div>
                        <div className="ps-col-name" style={{ color: "#ff5252", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase" }}>Name</div>
                        <div className="ps-col-pos" style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase"  }}>Position</div>
                        <div className="ps-col-mvp" style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, textTransform: "uppercase", marginLeft: 12 }}>MVP</div>
                    </div>

                    {computed.length === 0 ? (
                        <div style={{ padding: "60px 24px", textAlign: "center", color: "rgba(255,255,255,.3)", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18 }}>
                            No player data for this period
                        </div>
                    ) : computed.map((player, idx) => (
                        <div key={player.playerId} className="ps-row ps-row-player"
                            onClick={() => setSelectedPlayer(player)}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            {/* Rank */}
                            <div className="ps-col-rank">
                                <div style={{ width: 34, height: 34, borderRadius: "50%", background: idx < 3 ? medal(idx) : "rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 14, color: idx < 3 ? "#070d1a" : "rgba(255,255,255,.5)" }}>
                                    {idx + 1}
                                </div>
                            </div>
                            {/* Name + photo */}
                            <div className="ps-col-name" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", border: `2px solid ${medal(idx)}`, flexShrink: 0 }}>
                                    {player.photoURL
                                        ? <img src={player.photoURL} alt={player.playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>{player.playerName[0]}</div>
                                    }
                                </div>
                                <span style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.playerName}</span>
                            </div>
                            {/* Position */}
                            <div className="ps-col-pos" style={{ color: "rgba(255,255,255,.6)", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {player.position ?? "—"}
                            </div>
                            {/* MVP Points */}
                            <div className="ps-col-mvp" style={{ color: "#FFD700", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 700, textAlign: "left", marginRight: 12 }}>
                                ⭐ {player.mvpPoints}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* ── PLAYER BANNER ── */}
            {selectedPlayer && (
                <div onClick={() => setSelectedPlayer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div onClick={e => e.stopPropagation()} className="ps-banner">
                        <button onClick={() => setSelectedPlayer(null)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,.3)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        <div className="ps-banner-inner">
                            {/* Left */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                <div style={{ color: "#1a2540", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 12, textAlign: "center" }}>{selectedPlayer.position ?? "Player"}</div>
                                <div className="ps-banner-photo">
                                    {selectedPlayer.photoURL
                                        ? <img src={selectedPlayer.photoURL} alt={selectedPlayer.playerName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 48, color: "#fff" }}>{selectedPlayer.playerName[0]}</div>
                                    }
                                </div>
                                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ fontSize: 20 }}>⭐</span>
                                    <span style={{ color: "#1a2540", fontWeight: 700, fontSize: 16 }}>MVP Points: {selectedPlayer.mvpPoints}</span>
                                </div>
                            </div>
                            {/* Right */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 className="ps-banner-name">{selectedPlayer.playerName}</h2>
                                {[
                                    { label: "Attendance", value: `${selectedPlayer.attendance}%` },
                                    { label: "Goal Score", value: selectedPlayer.goals },
                                    { label: "Assists", value: selectedPlayer.assists },
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

            {/* ── CUSTOM RANGE ── */}
            {showCustom && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                            <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900 }}>Custom Range</h3>
                            <button onClick={() => setShowCustom(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
                        </div>
                        {["From", "To"].map((lbl, i) => (
                            <div key={lbl} style={{ marginBottom: i === 0 ? 14 : 24 }}>
                                <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{lbl}</label>
                                <input type="month" value={i === 0 ? customFrom : customTo} onChange={e => i === 0 ? setCustomFrom(e.target.value) : setCustomTo(e.target.value)}
                                    style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                            </div>
                        ))}
                        <button onClick={handleCustomApply} disabled={!customFrom || !customTo}
                            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer", opacity: !customFrom || !customTo ? 0.5 : 1 }}>
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {/* ── HOST EDIT MODAL ── */}
            {showEdit && isHost && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {(["calendar", "stats"] as const).map(tab => (
                                    <button key={tab} onClick={() => setEditTab(tab)}
                                        style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: editTab === tab ? "#00e676" : "rgba(255,255,255,.06)", color: editTab === tab ? "#070d1a" : "rgba(255,255,255,.5)", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                                        {tab === "calendar" ? "📅 Calendar" : "📊 Player Stats"}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                            {editTab === "calendar" && (
                                <div>
                                    <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{MONTHS[viewMonth]} {viewYear}</h3>
                                    <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 16 }}>Click a day to add a Training or Main Match session</p>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 20 }}>
                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                                            <div key={d} style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 11, fontWeight: 700, padding: "4px 0" }}>{d}</div>
                                        ))}
                                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e${i}`} />)}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                            const ds = sessions.filter(s => s.date === dateStr);
                                            return (
                                                <div key={day} onClick={() => setSelectedDay(day)}
                                                    style={{ aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: selectedDay === day ? "rgba(0,230,118,.15)" : "rgba(255,255,255,.04)", border: selectedDay === day ? "1px solid #00e676" : "1px solid rgba(255,255,255,.06)" }}>
                                                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{day}</span>
                                                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                                                        {ds.some(s => s.type === "training") && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e676" }} />}
                                                        {ds.some(s => s.type === "main") && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff5252" }} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedDay && (
                                        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
                                            <div style={{ color: "#fff", fontWeight: 700, marginBottom: 12 }}>{MONTHS[viewMonth]} {selectedDay}, {viewYear}</div>
                                            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                                                <button onClick={() => handleAddSession(selectedDay, "training")} disabled={addingSession}
                                                    style={{ flex: 1, minWidth: 120, padding: "10px", borderRadius: 10, border: "none", background: "rgba(0,230,118,.15)", color: "#00e676", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Training Session</button>
                                                <button onClick={() => handleAddSession(selectedDay, "main")} disabled={addingSession}
                                                    style={{ flex: 1, minWidth: 120, padding: "10px", borderRadius: 10, border: "none", background: "rgba(255,82,82,.15)", color: "#ff5252", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Main Match</button>
                                            </div>
                                            {sessions.filter(s => s.date === `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`).map(s => (
                                                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,.04)", borderRadius: 8, marginBottom: 6 }}>
                                                    <span style={{ color: s.type === "training" ? "#00e676" : "#ff5252", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                                                    <button onClick={() => deleteCalendarSession(s.id)} style={{ background: "none", border: "none", color: "rgba(255,82,82,.7)", cursor: "pointer", fontSize: 16 }}>🗑</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
                                        All Sessions — Training ({trainingCount}) | Main ({mainCount})
                                    </div>
                                    {typeSessions.length === 0
                                        ? <div style={{ color: "rgba(255,255,255,.3)", fontSize: 14 }}>No {sessionType} sessions added yet</div>
                                        : typeSessions.map(s => (
                                            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{s.label}</div>
                                                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{s.date}</div>
                                                </div>
                                                <button onClick={() => deleteCalendarSession(s.id)} style={{ background: "none", border: "none", color: "rgba(255,82,82,.7)", cursor: "pointer", fontSize: 16 }}>🗑</button>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                            {editTab === "stats" && (
                                <div>
                                    <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, marginBottom: 16 }}>Click on a session to enter player stats</p>
                                    {typeSessions.length === 0
                                        ? <div style={{ color: "rgba(255,255,255,.3)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>No {sessionType} sessions yet. Add them in the Calendar tab first.</div>
                                        : typeSessions.map(session => (
                                            <div key={session.id} onClick={() => openStatsEdit(session)}
                                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, marginBottom: 8, cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.08)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}>
                                                <div>
                                                    <div style={{ color: "#fff", fontWeight: 700 }}>{session.label}</div>
                                                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{session.date}</div>
                                                </div>
                                                <span style={{ color: "#00e676", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}><EditAltIcon width={14} height={14} /> Edit Stats</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── STATS ENTRY MODAL ── */}
            {editingStats && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                            <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900 }}>{editingStats.sessionLabel}</h3>
                            <button onClick={() => setEditingStats(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
                            <div style={{ minWidth: 500 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 60px 90px 80px", gap: 8, padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                                    {["Player", "Present", "Goals", "Assists", "Man of Match", "MVP Pts"].map(h => (
                                        <div key={h} style={{ color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{h}</div>
                                    ))}
                                </div>
                                <div style={{ padding: "0 24px" }}>
                                    {users.filter(u => u.role === "user").map(player => {
                                        const stat = statsForm[player.id] ?? { attended: false, goals: 0, assists: 0, manOfMatch: 0, mvpPoints: 0 };
                                        const upd = (field: keyof PlayerSessionStats, value: any) => setStatsForm(prev => ({ ...prev, [player.id]: { ...stat, [field]: value } }));
                                        return (
                                            <div key={player.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 60px 90px 80px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                                                        {player.photoURL
                                                            ? <img src={player.photoURL} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{player.name[0]}</div>
                                                        }
                                                    </div>
                                                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                    <input type="checkbox" checked={stat.attended} onChange={e => upd("attended", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#00e676" }} />
                                                </div>
                                                <input type="number" min={0} value={stat.goals} onChange={e => upd("goals", Number(e.target.value))} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                                <input type="number" min={0} value={stat.assists} onChange={e => upd("assists", Number(e.target.value))} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                                <input type="number" min={0} value={stat.manOfMatch} onChange={e => upd("manOfMatch", Number(e.target.value))} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                                <input type="number" min={0} value={stat.mvpPoints} onChange={e => upd("mvpPoints", Number(e.target.value))} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", fontSize: 13, width: "100%", outline: "none", textAlign: "center" }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", gap: 10, flexShrink: 0 }}>
                            <button onClick={() => setEditingStats(null)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
                            <button onClick={handleSaveStats} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>Save Stats</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* ── HEADER ── */
                .ps-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 32px;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .ps-header-left  { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
                .ps-header-right { display: flex; align-items: center; gap: 10px; }
                .ps-title        { font-family: 'Barlow Condensed',sans-serif; font-size: 48px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; line-height: 1; color: #fff; margin: 0; }

                /* ── PLAYER LIST ROWS ── */
                .ps-row { display: grid; grid-template-columns: 80px 1fr 180px 80px; padding: 12px 24px; align-items: center; }
                .ps-col-mvp { }
                .ps-row-header  { border-bottom: 1px solid rgba(255,255,255,.08); }
                .ps-row-player  { border-bottom: 1px solid rgba(255,255,255,.05); cursor: pointer; transition: background .15s; }
                .ps-col-rank    { display: flex; align-items: center; }
                .ps-col-name    { }
                .ps-col-pos     { }

                /* ── PLAYER BANNER ── */
                .ps-banner        { background: linear-gradient(135deg,#6b7db3 0%,#8b9dc3 100%); border-radius: 20px; padding: 32px; width: 100%; max-width: 600px; box-shadow: 0 20px 60px rgba(0,0,0,.8); position: relative; max-height: 90vh; overflow-y: auto; }
                .ps-banner-inner  { display: flex; gap: 28px; align-items: flex-start; }
                .ps-banner-photo  { width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 4px solid rgba(255,255,255,.3); }
                .ps-banner-name   { color: #1a2540; font-family: 'Barlow Condensed',sans-serif; font-size: 42px; font-weight: 900; margin-bottom: 24px; line-height: 1; }

                /* ── MOBILE ── */
                @media (max-width: 640px) {
                    .ps-title         { font-size: 32px; }
                    .ps-header        { margin-bottom: 20px; }
                    .ps-header-left   { gap: 10px; }
                    .ps-header-right  { width: 100%; }

                    .ps-row { grid-template-columns: 44px 1fr auto 60px; padding: 10px 14px; gap: 8px; }
                    .ps-col-pos       { font-size: 13px !important; max-width: 90px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: right; }
                    .ps-col-mvp      { font-size: 13px !important; max-width: 60px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: center; }
                    .ps-banner        { padding: 20px 16px; }
                    .ps-banner-inner  { flex-direction: column; align-items: center; gap: 16px; }
                    .ps-banner-photo  { width: 110px; height: 110px; }
                    .ps-banner-name   { font-size: 28px; margin-bottom: 16px; text-align: center; }
                }

                @media (max-width: 400px) {
                    .ps-title       { font-size: 26px; }
                    .ps-banner-name { font-size: 22px; }
                }
            `}</style>
        </div>
    );
}