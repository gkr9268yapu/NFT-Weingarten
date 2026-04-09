/* ══ PLAYER STATS ════════════════════════════════════════════ */
export type SessionType = "training" | "main";

export interface CalendarSession {
    id: string;
    date: string;          // YYYY-MM-DD
    type: SessionType;
    label: string;         // e.g. "Training Day 1", "Main Match Day 1"
    month: string;         // YYYY-MM
}

export interface PlayerSessionStats {
    attended: boolean;
    goals: number;
    assists: number;
    manOfMatch: number;
    mvpPoints: number;
}

export interface PlayerMonthStats {
    playerId: string;
    playerName: string;
    month: string;         // YYYY-MM
    type: SessionType;
    sessions: Record<string, PlayerSessionStats>; // sessionId -> stats
}

export interface ComputedPlayerStats {
    playerId: string;
    playerName: string;
    photoURL?: string;
    position?: string;
    attendance: number;    // percentage
    goals: number;
    assists: number;
    manOfMatch: number;
    mvpPoints: number;
    totalPoints: number;
    totalSessions: number;
    attendedSessions: number;
}