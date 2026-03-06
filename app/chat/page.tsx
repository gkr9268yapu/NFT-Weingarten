"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { sendMessage, toggleReaction } from "@/lib/firebaseDB";
import Navbar from "@/components/Navbar";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢"] as const;

export default function ChatPage() {
  const { currentUser, messages, loading } = useApp();
  const router    = useRouter();
  const chatRef   = useRef<HTMLDivElement>(null);
  const [text,     setText]     = useState("");
  const [openPick, setOpenPick] = useState<string | null>(null);
  const [sending,  setSending]  = useState(false);

  // ✅ All hooks BEFORE any conditional return
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!loading && !currentUser) router.push("/");
  }, [loading, currentUser, router]);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070d1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>⚽</div>
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
      <main style={{ maxWidth:820, margin:"0 auto", padding:"48px 28px" }}>
        <div className="fade-in">
          <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:50, fontWeight:900, marginBottom:4, letterSpacing:1, textTransform:"uppercase" }}>
            Team <span style={{ color:"#00e676" }}>Chat</span>
          </h1>
          <p style={{ color:"rgba(255,255,255,.38)", marginBottom:28 }}>Real-time group chat · powered by Firestore</p>

          <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:22, overflow:"hidden" }}>
            {/* Messages */}
            <div ref={chatRef} style={{ height:520, overflowY:"auto", padding:"28px 28px 20px" }}>
              {messages.map(msg => {
                const isMe = msg.user === currentUser.name;
                return (
                  <div key={msg.id} className="msg-row" style={{ display:"flex", flexDirection: isMe ? "row-reverse" : "row", gap:12, marginBottom:26, alignItems:"flex-start", position:"relative" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background: isMe ? "linear-gradient(135deg,#00e676,#00c853)" : "linear-gradient(135deg,#2a3a5c,#1a2540)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, color: isMe ? "#070d1a" : "#fff" }}>
                      {msg.user[0]}
                    </div>
                    <div style={{ maxWidth:"68%", position:"relative" }}>
                      <div style={{ fontSize:12, color:"rgba(255,255,255,.35)", marginBottom:5, textAlign: isMe ? "right" : "left" }}>
                        {msg.user} · {msg.time}
                      </div>
                      <div style={{
                        background: isMe ? "linear-gradient(135deg,#00e676,#00c853)" : "rgba(255,255,255,.07)",
                        color: isMe ? "#070d1a" : "#fff",
                        padding:"11px 16px", lineHeight:1.55, fontSize:14,
                        borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                        display:"inline-block", maxWidth:"100%",
                      }}>{msg.text}</div>
                      {Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display:"flex", gap:5, marginTop:7, flexWrap:"wrap", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                          {Object.entries(msg.reactions).map(([emoji, users]) =>
                            users.length > 0 && (
                              <span key={emoji} onClick={() => handleReact(msg.id, emoji, msg.reactions)} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", borderRadius:20, padding:"3px 9px", fontSize:13, cursor:"pointer" }}>
                                {emoji} {users.length}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      <button className="react-trigger" onClick={() => setOpenPick(openPick === msg.id ? null : msg.id)} style={{ opacity:0, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", padding:"3px 9px", borderRadius:8, fontSize:12, marginTop:5, display:"block", transition:"opacity 0.15s", marginLeft: isMe ? "auto" : "0" }}>
                        😊 React
                      </button>
                      {openPick === msg.id && (
                        <div style={{ position:"absolute", [isMe ? "right" : "left"]:0, bottom:"calc(100% + 8px)", background:"#1a2540", border:"1px solid rgba(255,255,255,.1)", borderRadius:14, padding:"10px 14px", display:"flex", gap:10, zIndex:50, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
                          {EMOJIS.map(e => (
                            <span key={e} className="emoji-btn" onClick={() => handleReact(msg.id, e, msg.reactions)} style={{ fontSize:24, cursor:"pointer", transition:"transform 0.1s", display:"inline-block" }}>{e}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div style={{ textAlign:"center", paddingTop:60, color:"rgba(255,255,255,.2)" }}>
                  <p style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20 }}>No messages yet — say hi!</p>
                </div>
              )}
            </div>
            {/* Input */}
            <div style={{ borderTop:"1px solid rgba(255,255,255,.07)", padding:"18px 28px", display:"flex", gap:12 }}>
              <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==="Enter" && handleSend()} placeholder="Type a message…"
                style={{ flex:1, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:12, padding:"13px 18px", color:"#fff", fontSize:14 }}
              />
              <button onClick={handleSend} disabled={sending || !text.trim()} style={{
                background:"linear-gradient(135deg,#00e676,#00c853)", color:"#070d1a",
                border:"none", padding:"13px 28px", borderRadius:12,
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:17,
                boxShadow:"0 4px 16px rgba(0,230,118,.3)", opacity: (!text.trim() || sending) ? .5 : 1,
              }}>Send</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
