"use client";
import { useState, useRef } from "react";
import type { User } from "@/lib/types";

const [uploadingPic, setUploadingPic] = useState(false);
const photoRef = useRef<HTMLInputElement>(null);

const POSITIONS = [
    "Goalkeeper", "Defender", "Midfielder", "Forward",
    "Winger", "Striker", "Centre-Back", "Full-Back",
    "Attacking Midfielder", "Defensive Midfielder",
];

interface Props {
    currentUser: User;
    onClose: () => void;
    onSave: (name: string, position: string, photoURL: string) => Promise<void>;
}

export default function EditProfileModal({ currentUser, onClose, onSave }: Props) {
    const [name, setName] = useState(currentUser.name);
    const [position, setPosition] = useState(currentUser.position ?? "");
    const [photoURL, setPhotoURL] = useState(currentUser.photoURL ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");


    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPic(true);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("uploader", currentUser.name);
            form.append("chatOnly", "true");
            const res = await fetch("/api/upload", { method: "POST", body: form });
            const data = await res.json();
            if (data.url) setPhotoURL(data.url);
        } finally { setUploadingPic(false); }
    };

    const handleSave = async () => {
        if (!name.trim()) { setError("Name is required."); return; }
        setSaving(true);
        try {
            await onSave(name.trim(), position, photoURL);
            onClose();
        } catch (e: unknown) {
            setError((e as Error).message || "Failed to save.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                    <h2 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900 }}>Edit Profile</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                </div>

                {/* Avatar */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                    <div style={{ position: "relative", width: 90, height: 90 }}>
                        {/* Photo or initials */}
                        <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(0,230,118,.3)" }}>
                            {photoURL ? (
                                <img src={photoURL} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#00e676,#0070ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 32, color: "#070d1a" }}>
                                    {name[0]?.toUpperCase()}
                                </div>
                            )}
                            {uploadingPic && (
                                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <div style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,.3)", borderTopColor: "#00e676", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                </div>
                            )}
                        </div>
                        {/* Edit button bottom left */}
                        <button onClick={() => photoRef.current?.click()}
                            style={{ position: "absolute", bottom: 0, left: 0, width: 28, height: 28, borderRadius: "50%", background: "#00e676", border: "2px solid #0e1828", color: "#070d1a", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                            ✏️
                        </button>
                    </div>
                    <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {/* Name */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                </div>

                {/* Position — only for users not hosts */}
                {currentUser.role === "user" && (
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Position</label>
                        <select
                            value={position}
                            onChange={e => setPosition(e.target.value)}
                            style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", cursor: "pointer", appearance: "none" }}>
                            <option value="" style={{ background: "#0e1828" }}>No position selected</option>
                            {POSITIONS.map(p => (
                                <option key={p} value={p} style={{ background: "#0e1828" }}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}

                {error && (
                    <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 16, background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", fontSize: 13 }}>
                        {error}
                    </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onClose}
                        style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.6 : 1, fontFamily: "'Barlow Condensed',sans-serif" }}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
