"use client";
import type { Match } from "@/lib/types";

type MatchFormData = Omit<Match, "id" | "available" | "notAvailable" | "image">;

interface Props {
  title: string;
  btnLabel: string;
  btnColor: string;
  data: MatchFormData;
  onChange: (d: MatchFormData) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const FIELDS: { key: keyof MatchFormData; label: string; type: string; placeholder: string }[] = [
  { key: "title",       label: "Match Title", type: "text",  placeholder: "Saturday Morning Game" },
  { key: "team1",       label: "Team 1",      type: "text",  placeholder: "Frankfurt FC" },
  { key: "team2",       label: "Team 2",      type: "text",  placeholder: "Night FC" },
  { key: "date",        label: "Date",        type: "date",  placeholder: "" },
  { key: "time",        label: "Time",        type: "time",  placeholder: "" },
  { key: "venue",       label: "Venue",       type: "text",  placeholder: "Central Park Field A" },
  { key: "coach",       label: "Coach",       type: "text",  placeholder: "Coach Mike" },
  { key: "description", label: "Description", type: "text",  placeholder: "Details..." },
  { key: "expiryDate",  label: "Expiry Date", type: "date",  placeholder: "" },
];

const IS = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontSize: 14,
} as const;

export default function MatchFormModal({ title, btnLabel, btnColor, data, onChange, onSubmit, onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="slide-up" onClick={e => e.stopPropagation()} style={{
        background: "#0e1828", border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 24, padding: 36, width: 520, maxWidth: "92vw",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
          <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "none", color: "#fff", width: 34, height: 34, borderRadius: "50%", fontSize: 16 }}>✕</button>
        </div>

        {FIELDS.map(({ key, label, type, placeholder }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,.4)", letterSpacing: 1.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
            <input
              type={type}
              value={data[key]}
              placeholder={placeholder}
              onChange={e => onChange({ ...data, [key]: e.target.value })}
              style={IS}
            />
          </div>
        ))}

        <button onClick={onSubmit} style={{
          width: "100%", marginTop: 10, padding: "15px",
          background: btnColor, border: "none", borderRadius: 12,
          color: btnColor === "linear-gradient(135deg,#00e676,#00c853)" ? "#070d1a" : "#fff",
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 1,
        }}>{btnLabel}</button>
      </div>
    </div>
  );
}
