"use client";
import { useState } from "react";

interface Props {
    onClose: () => void;
    onSubmit: (question: string, options: string[], multiChoice: boolean) => Promise<void>;
}

export default function PollModal({ onClose, onSubmit }: Props) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [multiChoice, setMultiChoice] = useState(false);
    const [sending, setSending] = useState(false);

    const addOption = () => {
        if (options.length < 10) setOptions([...options, ""]);
    };

    const updateOption = (i: number, val: string) => {
        const next = [...options]; next[i] = val; setOptions(next);
    };

    const removeOption = (i: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async () => {
        const q = question.trim();
        const opts = options.map(o => o.trim()).filter(Boolean);
        if (!q || opts.length < 2) return;
        setSending(true);
        try { await onSubmit(q, opts, multiChoice); onClose(); }
        finally { setSending(false); }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <h2 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900 }}>📊 Create Poll</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 22, cursor: "pointer" }}>✕</button>
                </div>

                {/* Question */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Question</label>
                    <input value={question} onChange={e => setQuestion(e.target.value)}
                        placeholder="Ask a question…"
                        style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "11px 14px", color: "#fff", fontSize: 15, fontFamily: "'Barlow',sans-serif", outline: "none", boxSizing: "border-box" }} />
                </div>

                {/* Options */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>Options</label>
                    {options.map((opt, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                            <input value={opt} onChange={e => updateOption(i, e.target.value)}
                                placeholder={`Option ${i + 1}`}
                                style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, fontFamily: "'Barlow',sans-serif", outline: "none" }} />
                            {options.length > 2 && (
                                <button onClick={() => removeOption(i)}
                                    style={{ background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
                            )}
                        </div>
                    ))}
                    {options.length < 10 && (
                        <button onClick={addOption}
                            style={{ width: "100%", padding: "10px", background: "rgba(255,255,255,.03)", border: "1px dashed rgba(255,255,255,.15)", borderRadius: 10, color: "rgba(255,255,255,.4)", fontSize: 14, cursor: "pointer", marginTop: 4 }}>
                            + Add Option
                        </button>
                    )}
                </div>

                {/* Multi choice toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, marginBottom: 20 }}>
                    <div>
                        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Multiple choice</div>
                        <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>Allow selecting more than one option</div>
                    </div>
                    <div onClick={() => setMultiChoice(!multiChoice)}
                        style={{ width: 44, height: 24, borderRadius: 12, background: multiChoice ? "#00e676" : "rgba(255,255,255,.1)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 2, left: multiChoice ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                    </div>
                </div>

                {/* Submit */}
                <button onClick={handleSubmit} disabled={sending || !question.trim() || options.filter(o => o.trim()).length < 2}
                    style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#00e676,#00c853)", border: "none", borderRadius: 12, color: "#070d1a", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 17, cursor: "pointer", opacity: sending || !question.trim() || options.filter(o => o.trim()).length < 2 ? 0.5 : 1 }}>
                    {sending ? "Creating…" : "Create Poll"}
                </button>
            </div>
        </div>
    );
}