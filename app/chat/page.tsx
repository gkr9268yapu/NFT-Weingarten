"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { sendMessage, toggleReaction } from "@/lib/firebaseDB";
import Navbar from "@/components/Navbar";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢"] as const;

export default function ChatPage() {
  const { currentUser, messages, loading } = useApp();
  const router = useRouter();
  const chatRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [openPick, setOpenPick] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!loading && !currentUser) router.push("/");
  }, [loading, currentUser, router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>⚽</div>
  );
  if (!currentUser) return null;

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await sendMessage(currentUser.name, text); setText(""); }
    finally { setSending(false); }
  };

  const handleReact = async (msgId: string, emoji: string, current: Record<string, string[]>) => {
    await toggleReaction(msgId, emoji, currentUser.name, current);
    setOpenPick(null);
  };

  return (
    <div>
      <Navbar />

      <style>{`
        .chat-wrap  { max-width: 820px; margin: 0 auto; padding: 16px 28px 28px; } 
        .chat-box   { background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.07); border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; }
        .chat-msgs  { height: 520px; overflow-y: auto; padding: 28px 28px 20px; }
        .chat-bar   { border-top: 1px solid rgba(255,255,255,.07); padding: 18px 28px; display: flex; gap: 12px; background: rgba(7,13,26,0.98); }
        .chat-input { flex: 1; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 13px 18px; color: #fff; font-size: 14px; font-family: 'Barlow', sans-serif; }
        .chat-send  { background: linear-gradient(135deg,#00e676,#00c853); color: #070d1a; border: none; padding: 13px 28px; border-radius: 12px; font-family: 'Barlow Condensed',sans-serif; font-weight: 800; font-size: 17px; box-shadow: 0 4px 16px rgba(0,230,118,.3); cursor: pointer; }

        @media (max-width: 768px) {
          .chat-wrap { padding: 24px 12px 16px !important; }
          .chat-wrap h1 { font-size: 32px !important; }
          .chat-box  { border-radius: 16px; }
          .chat-msgs { padding: 12px !important; }
          .chat-bar  { padding: 10px 12px !important; gap: 8px !important; }
          .chat-input { padding: 11px 14px !important; font-size: 14px !important; }
          .chat-send  { padding: 11px 18px !important; font-size: 15px !important; }
        }
      `}</style>

      <main className="chat-wrap">
        <div className="fade-in">
          <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 50, fontWeight: 900, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>
            Team <span style={{ color: "#00e676" }}>Chat</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.38)", marginBottom: 28 }}>Real-time group chat · powered by Firestore</p>

          <div className="chat-box">
            {/* Messages */}
            <div ref={chatRef} className="chat-msgs">
              {messages.map(msg => {
                const isMe = msg.user === currentUser.name;
                return (
                  <div key={msg.id} className="msg-row" style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, marginBottom: 22, alignItems: "flex-start", position: "relative" }}>
                    {/* Avatar */}
                    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: isMe ? "linear-gradient(135deg,#00e676,#00c853)" : "linear-gradient(135deg,#2a3a5c,#1a2540)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: isMe ? "#070d1a" : "#fff" }}>
                      {msg.user[0]}
                    </div>
                    {/* Bubble */}
                    <div style={{ maxWidth: "72%", position: "relative" }}>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 4, textAlign: isMe ? "right" : "left" }}>
                        {msg.user} · {msg.time}
                      </div>
                      <div style={{
                        background: isMe ? "linear-gradient(135deg,#00e676,#00c853)" : "rgba(255,255,255,.07)",
                        color: isMe ? "#070d1a" : "#fff",
                        padding: "10px 14px", lineHeight: 1.55, fontSize: 14,
                        borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                        display: "inline-block", maxWidth: "100%", wordBreak: "break-word",
                      }}>{msg.text}</div>

                      {/* Reaction badges */}
                      {Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) =>
                            users.length > 0 && (
                              <span key={emoji} onClick={() => handleReact(msg.id, emoji, msg.reactions)}
                                style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: "3px 9px", fontSize: 13, cursor: "pointer" }}>
                                {emoji} {users.length}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* React button */}
                      <button className="react-trigger" onClick={() => setOpenPick(openPick === msg.id ? null : msg.id)}
                        style={{ opacity: 0, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", padding: "3px 9px", borderRadius: 8, fontSize: 11, marginTop: 4, display: "block", transition: "opacity 0.15s", marginLeft: isMe ? "auto" : "0", cursor: "pointer" }}>
                        😊 React
                      </button>

                      {/* Emoji picker */}
                      {openPick === msg.id && (
                        <div style={{ position: "absolute", [isMe ? "right" : "left"]: 0, bottom: "calc(100% + 8px)", background: "#1a2540", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "10px 14px", display: "flex", gap: 10, zIndex: 50, boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>
                          {EMOJIS.map(e => (
                            <span key={e} className="emoji-btn" onClick={() => handleReact(msg.id, e, msg.reactions)}
                              style={{ fontSize: 24, cursor: "pointer", transition: "transform 0.1s", display: "inline-block" }}>{e}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 60, color: "rgba(255,255,255,.2)" }}>
                  <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20 }}>No messages yet — say hi!</p>
                </div>
              )}
            </div>

            {/* Input bar — always visible, never blocked */}
            <div className="chat-bar">
              <input
                className="chat-input"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Type a message…"
              />
              <button className="chat-send" onClick={handleSend} disabled={sending || !text.trim()}
                style={{ opacity: (!text.trim() || sending) ? .5 : 1 }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}