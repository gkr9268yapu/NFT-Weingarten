"use client";
import Image from "next/image";
import type { Match, User } from "@/lib/types";

interface Props {
  match: Match;
  currentUser: User;
  onAvailability: (id: string, status: "available" | "notAvailable") => void;
  onDetail: (match: Match) => void;
  onEdit?: (match: Match) => void;
  onDelete?: (id: string) => void;
}

export default function MatchCard({ match, currentUser, onAvailability, onDetail, onEdit, onDelete }: Props) {
  const isAvail    = match.available.includes(currentUser.name);
  const isNotAvail = match.notAvailable.includes(currentUser.name);
  const isHost     = currentUser.role === "host";

  return (
    <div className="card" style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, overflow: "hidden" }}>

      {/* Banner image */}
      <div style={{ position: "relative", height: 215 }}>
        <Image src={match.image} alt={match.title} fill style={{ objectFit: "cover" }} unoptimized />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(7,13,26,.98) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,230,118,.06),transparent 60%)" }} />

        {/* Teams */}
        <div style={{ position: "absolute", bottom: 52, left: 18, right: 18 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 23, fontWeight: 900, letterSpacing: .5, lineHeight: 1.1 }}>
            {match.team1} <span style={{ color: "#00e676" }}>v/s</span> {match.team2}
          </div>
        </div>

        {/* Detail button */}
        <button onClick={() => onDetail(match)} style={{
          position: "absolute", bottom: 14, left: 18,
          background: "rgba(0,0,0,.55)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(0,230,118,.45)", color: "#00e676",
          padding: "7px 16px", borderRadius: 8, fontSize: 11,
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 1.5,
        }}>DETAIL</button>

        {/* Host controls */}
        {isHost && (
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
            <button onClick={() => onEdit?.(match)} style={{ background: "rgba(0,112,255,.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(0,112,255,.4)", color: "#4da6ff", padding: "5px 11px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>Edit</button>
            <button onClick={() => onDelete?.(match.id)} style={{ background: "rgba(255,82,82,.22)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,82,82,.4)", color: "#ff5252", padding: "5px 11px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>Delete</button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "20px 22px 22px" }}>
        <h3 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, marginBottom: 14 }}>{match.title}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
          {([
            ["📅", `${match.date}  🕐  ${match.time}`],
            ["📍", match.venue],
            ["👨‍💼", `Coach: ${match.coach}`],
          ] as [string, string][]).map(([icon, text], i) => (
            <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "rgba(255,255,255,.55)", alignItems: "center" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
          {match.description && <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", fontStyle: "italic", marginTop: 2 }}>{match.description}</p>}
        </div>

        {/* Availability buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="avail-btn" onClick={() => onAvailability(match.id, "available")} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
            background: isAvail ? "#00e676" : "rgba(0,230,118,.1)",
            color: isAvail ? "#070d1a" : "#00e676",
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15,
          }}>✓ Available</button>
          <button className="avail-btn" onClick={() => onAvailability(match.id, "notAvailable")} style={{
            flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
            background: isNotAvail ? "#ff5252" : "rgba(255,82,82,.1)",
            color: isNotAvail ? "#fff" : "#ff5252",
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15,
          }}>✗ Not Available</button>
        </div>
      </div>
    </div>
  );
}
