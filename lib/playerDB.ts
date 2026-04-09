import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    onSnapshot, query, where, orderBy, setDoc, getDoc,
    type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CalendarSession, PlayerMonthStats, PlayerSessionStats, SessionType, ComputedPlayerStats } from "./playerTypes";
import type { User } from "./types";

/* ══ CALENDAR SESSIONS ══════════════════════════════════════ */
export async function addCalendarSession(
    session: Omit<CalendarSession, "id">
): Promise<string> {
    const ref = await addDoc(collection(db, "calendarSessions"), session);
    return ref.id;
}

export async function deleteCalendarSession(sessionId: string): Promise<void> {
    await deleteDoc(doc(db, "calendarSessions", sessionId));
}

export function listenCalendarSessions(
    month: string,
    cb: (sessions: CalendarSession[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "calendarSessions"),
        where("month", "==", month),
        orderBy("date", "asc")
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CalendarSession, "id">) })));
    });
}

export function listenAllCalendarSessions(
    cb: (sessions: CalendarSession[]) => void
): Unsubscribe {
    const q = query(collection(db, "calendarSessions"), orderBy("date", "asc"));
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CalendarSession, "id">) })));
    });
}

/* ══ PLAYER STATS ════════════════════════════════════════════ */
function statsDocId(playerId: string, month: string, type: SessionType): string {
    return `${playerId}_${month}_${type}`;
}

export async function savePlayerStats(
    playerId: string,
    playerName: string,
    month: string,
    type: SessionType,
    sessions: Record<string, PlayerSessionStats>
): Promise<void> {
    const id = statsDocId(playerId, month, type);
    await setDoc(doc(db, "playerStats", id), {
        playerId, playerName, month, type, sessions,
    });
}

export async function updateSessionStats(
    playerId: string,
    playerName: string,
    month: string,
    type: SessionType,
    sessionId: string,
    stats: PlayerSessionStats
): Promise<void> {
    const id = statsDocId(playerId, month, type);
    const ref = doc(db, "playerStats", id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        await updateDoc(ref, { [`sessions.${sessionId}`]: stats });
    } else {
        await setDoc(ref, {
            playerId, playerName, month, type,
            sessions: { [sessionId]: stats },
        });
    }
}

export function listenPlayerStats(
    month: string,
    type: SessionType,
    cb: (stats: PlayerMonthStats[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "playerStats"),
        where("month", "==", month),
        where("type", "==", type)
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => d.data() as PlayerMonthStats));
    });
}

export function listenPlayerStatsMultiMonth(
    months: string[],
    type: SessionType,
    cb: (stats: PlayerMonthStats[]) => void
): Unsubscribe {
    const q = query(
        collection(db, "playerStats"),
        where("month", "in", months),
        where("type", "==", type)
    );
    return onSnapshot(q, snap => {
        cb(snap.docs.map(d => d.data() as PlayerMonthStats));
    });
}

/* ══ COMPUTE STATS ═══════════════════════════════════════════ */
export function computeStats(
    users: User[],
    allStats: PlayerMonthStats[],
    sessions: CalendarSession[],
    type: SessionType,
    months: string[]
): ComputedPlayerStats[] {
    const players = users.filter(u => u.role === "user");

    // Total sessions of this type in selected months
    const typeSessions = sessions.filter(
        s => s.type === type && months.includes(s.month)
    );
    const totalSessions = typeSessions.length;

    return players.map(player => {
        // Get all stats for this player across selected months
        const playerStats = allStats.filter(
            s => s.playerId === player.id && s.type === type && months.includes(s.month)
        );

        let attendedSessions = 0;
        let goals = 0;
        let assists = 0;
        let manOfMatch = 0;
        let mvpPoints = 0;

        for (const stat of playerStats) {
            for (const [sessionId, sessionStat] of Object.entries(stat.sessions)) {
                // Only count sessions that exist in calendar
                const sessionExists = typeSessions.some(s => s.id === sessionId);
                if (!sessionExists) continue;
                if (sessionStat.attended) attendedSessions++;
                goals += sessionStat.goals ?? 0;
                assists += sessionStat.assists ?? 0;
                manOfMatch += sessionStat.manOfMatch ?? 0;
                mvpPoints += sessionStat.mvpPoints ?? 0;
            }
        }

        const attendance = totalSessions > 0
            ? Math.round((attendedSessions / totalSessions) * 100)
            : 0;

        // Total Points = Attendance + (Goals x 3) + Assists x 1 + MVP Points + (Man of Match x 3)
        const totalPoints = attendance + (goals * 3) + assists + mvpPoints + (manOfMatch * 3);

        return {
            playerId: player.id,
            playerName: player.name,
            photoURL: player.photoURL,
            position: player.position,
            attendance,
            goals,
            assists,
            manOfMatch,
            mvpPoints,
            totalPoints,
            totalSessions,
            attendedSessions,
        };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
}