"use client";
import { useState, useRef } from "react";
import type { User } from "@/lib/types";

interface Props {
    currentUser: User;
    onComplete: (photoURL?: string) => Promise<void>;
}

export default function ProfileSetupModal({ currentUser, onComplete }: Props) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [skipping, setSkipping] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const { uploadProfilePhoto } = await import("@/lib/profileStorage");
            const url = await uploadProfilePhoto(currentUser.id, file);
            setPreview(url);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setUploading(true);
        try { await onComplete(preview ?? undefined); }
        finally { setUploading(false); }
    };

    const handleSkip = async () => {
        setSkipping(true);
        await onComplete(undefined);
        setSkipping(false);
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 24, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.8)", textAlign: "center" }}>
                <img src="/logo.png" alt="logo" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", marginBottom: 16 }} />
                <h2 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, fontWeight: 900, marginBottom: 8 }}>
                    Welcome, {currentUser.name}! 👋
                </h2>
                <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
                    Upload a profile photo so your teammates can recognize you in the players section.
                </p>
                <div onClick={() => fileRef.current?.click()}
                    style={{ width: 100, height: 100, borderRadius: "50%", margin: "0 auto 24px", cursor: "pointer", position: "relative", border: "3px dashed rgba(0,230,118,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "rgba(255,255,255,.05)" }}>
                    {preview ? (
                        <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        <div>
                            <div style={{ fontSize: 32 }}>📷</div>
                            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginTop: 4 }}>Tap to upload</div>
                        </div>
                    )}
                    {uploading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 24, height: 24, border: "3px solid rgba(255,255,255,.3)", borderTopColor: "#00e676", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        </div>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {preview ? (
                        <button onClick={handleSave} disabled={uploading}
                            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>
                            {uploading ? "Saving…" : "Save Photo"}
                        </button>
                    ) : (
                        <button onClick={() => fileRef.current?.click()}
                            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>
                            Choose Photo
                        </button>
                    )}
                    <button onClick={handleSkip} disabled={skipping}
                        style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 14, cursor: "pointer" }}>
                        {skipping ? "Skipping…" : "Skip for now"}
                    </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
}