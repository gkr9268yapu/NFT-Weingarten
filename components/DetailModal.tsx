"use client";
import type { Match } from "@/lib/types";

interface Props { match: Match; onClose: () => void; }

export default function DetailModal({ match, onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        background: "#0e1828", border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 24, padding: 36, width: 500, maxWidth: "92vw",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 800 }}>Match Details</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: "50%", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: "#00e676", marginBottom: 24 }}>
          {match.team1} <span style={{ color: "#fff" }}>v/s</span> {match.team2}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {([
            ["✓ AVAILABLE",     match.available,    "#00e676", "rgba(0,230,118,.08)", "rgba(0,230,118,.2)"],
            ["✗ NOT AVAILABLE", match.notAvailable,  "#ff5252", "rgba(255,82,82,.08)",  "rgba(255,82,82,.2)"],
          ] as [string, string[], string, string, string][]).map(([label, list, color, bg, border]) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, color, fontWeight: 800, marginBottom: 12, letterSpacing: 1.5 }}>{label} ({list.length})</div>
              {list.length === 0
                ? <p style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>None yet</p>
                : list.map(n => (
                  <span key={n} style={{ display: "inline-block", background: color, color: color === "#00e676" ? "#070d1a" : "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, margin: "3px 3px 3px 0" }}>{n}</span>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
