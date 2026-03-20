"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import {
  listenConversations, getOrCreateConversation,
  deleteConversation, muteConversation, unmuteConversation,
  isConversationMuted,
} from "@/lib/firebaseDB";
import Navbar from "@/components/Navbar";
import type { Conversation } from "@/lib/types";
import PinAltIcon from "@/components/icons/PinAltIcon";
import PinSlashAltIcon from "@/components/icons/PinSlashAltIcon";
import BellSlashIcon from "@/components/icons/BellSlashIcon";
import BellIcon from "@/components/icons/BellIcon";
import CheckSquareIcon from "@/components/icons/CheckSquareIcon";
import TrashAltIcon from "@/components/icons/TrashAltIcon";

const MUTE_OPTIONS = [
  { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
  { label: "2 hours", ms: 2 * 60 * 60 * 1000 },
  { label: "4 hours", ms: 4 * 60 * 60 * 1000 },
  { label: "8 hours", ms: 8 * 60 * 60 * 1000 },
  { label: "Until I unmute", ms: null },
];

export default function ChatListPage() {
  const { currentUser, users, loading } = useApp();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedConvs, setSelectedConvs] = useState<Set<string>>(new Set());
  const [ctxConv, setCtxConv] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [showMuteMenu, setShowMuteMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) router.push("/");
  }, [loading, currentUser, router]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = listenConversations(currentUser.id, convs => {
      setConversations(convs.filter(c => c.lastMessage !== "" || c.lastTimestamp > 0));
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (!ctxConv) return;
    const handler = () => setCtxConv(null);
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [ctxConv]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/logo.png" alt="NFT Weingarten" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
    </div>
  );
  if (!currentUser) return null;

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  const filtered = otherUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  const startPrivateChat = async (otherId: string, otherName: string) => {
    const convId = await getOrCreateConversation(currentUser.id, currentUser.name, otherId, otherName);
    router.push(`/chat/user/${convId}`);
    setShowUsers(false);
  };

  const getOtherName = (conv: Conversation) => {
    const otherId = conv.participants.find(p => p !== currentUser.id) ?? "";
    return conv.participantNames[otherId] ?? "Unknown";
  };

  const getUnread = (conv: Conversation) => conv.unread?.[currentUser.id] ?? 0;
  const totalUnread = conversations.reduce((s, c) => s + getUnread(c), 0);

  const sortedConvs = [...conversations].sort((a, b) => {
    const ap = pinned.has(a.id) ? 1 : 0;
    const bp = pinned.has(b.id) ? 1 : 0;
    return bp - ap || b.lastTimestamp - a.lastTimestamp;
  });

  const handleCtxAction = async (action: string) => {
    if (!ctxConv) return;
    setCtxConv(null);
    if (action === "pin") {
      setPinned(prev => {
        const next = new Set(prev);
        if (next.has(ctxConv.id)) next.delete(ctxConv.id); else next.add(ctxConv.id);
        return next;
      });
    } else if (action === "select") {
      setSelectMode(true);
      setSelectedConvs(new Set([ctxConv.id]));
    } else if (action === "mute") {
      setShowMuteMenu(ctxConv.id);
    } else if (action === "unmute") {
      await unmuteConversation(ctxConv.id, currentUser.id);
    } else if (action === "delete") {
      if (confirm(`Delete chat with ${ctxConv.name}?`)) {
        await deleteConversation(ctxConv.id);
      }
    }
  };

  const handleMute = async (convId: string, ms: number | null) => {
    const until = ms === null ? null : Date.now() + ms;
    await muteConversation(convId, currentUser.id, until);
    setShowMuteMenu(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedConvs.size} chat${selectedConvs.size > 1 ? "s" : ""}?`)) return;
    for (const id of selectedConvs) await deleteConversation(id);
    setSelectMode(false);
    setSelectedConvs(new Set());
  };

  return (
    <div style={{ background: "#070d1a", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Navbar totalUnread={totalUnread} />

      <div style={{ flex: 1, maxWidth: 680, width: "100%", margin: "0 auto", padding: "80px 0 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px" }}>
          {selectMode ? (
            <>
              <span style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900 }}>{selectedConvs.size} selected</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleBulkDelete}
                  style={{ background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <TrashAltIcon width={15} height={15} /> Delete
                </button>
                <button onClick={() => { setSelectMode(false); setSelectedConvs(new Set()); }}
                  style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#fff", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>Chats</h1>
              <button onClick={() => setShowUsers(!showUsers)}
                style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#00e676,#00c853)", border: "none", color: "#070d1a", fontSize: 22, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,230,118,.3)" }}>
                +
              </button>
            </>
          )}
        </div>

        {/* New chat search */}
        {showUsers && (
          <div style={{ margin: "0 20px 20px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search players…"
                style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 14, fontFamily: "'Barlow',sans-serif", outline: "none" }} />
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>No players found</div>
            )}
            {filtered.map(u => (
              <button key={u.id} onClick={() => startPrivateChat(u.id, u.name)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                  {u.name[0]}
                </div>
                <div>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{u.name}</div>
                  <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Team chat */}
        <div style={{ padding: "0 12px 8px" }}>
          <button onClick={() => router.push("/chat/room")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, cursor: "pointer", textAlign: "left", marginBottom: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}>
            <img src="/logo.png" alt="NFT Weingarten" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5 }}>NFT Weingarten</div>
              <div style={{ color: "rgba(255,255,255,.4)", fontSize: 13 }}>Team group chat</div>
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00e676", flexShrink: 0 }} />
          </button>
        </div>

        {/* DMs label */}
        {sortedConvs.length > 0 && (
          <div style={{ padding: "8px 20px 6px" }}>
            <span style={{ color: "rgba(255,255,255,.25)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Direct Messages</span>
          </div>
        )}

        {/* Conversations */}
        <div style={{ padding: "0 12px" }}>
          {sortedConvs.map(conv => {
            const unread = getUnread(conv);
            const name = getOtherName(conv);
            const isPinned = pinned.has(conv.id);
            const isSelConv = selectedConvs.has(conv.id);
            const isMuted = isConversationMuted(conv as any, currentUser.id);

            return (
              <div key={conv.id} style={{ position: "relative", marginBottom: 6 }}
                onContextMenu={e => { e.preventDefault(); setCtxConv({ id: conv.id, name, x: e.clientX, y: e.clientY }); }}
                onTouchStart={e => {
                  e.preventDefault();
                  const timer = setTimeout(() => {
                    if (navigator.vibrate) navigator.vibrate(40);
                    setCtxConv({ id: conv.id, name, x: window.innerWidth / 2, y: window.innerHeight / 2 });
                  }, 500);
                  (e.currentTarget as HTMLElement).dataset.timer = String(timer);
                }}
                onTouchMove={e => {
                  const dy = Math.abs(e.touches[0].clientY - e.currentTarget.getBoundingClientRect().top);
                  if (dy > 8) clearTimeout(Number((e.currentTarget as HTMLElement).dataset.timer));
                }}
                onTouchEnd={e => clearTimeout(Number((e.currentTarget as HTMLElement).dataset.timer))}>

                <button
                  onClick={() => {
                    if (selectMode) {
                      setSelectedConvs(prev => { const n = new Set(prev); n.has(conv.id) ? n.delete(conv.id) : n.add(conv.id); return n; });
                      return;
                    }
                    router.push(`/chat/user/${conv.id}`);
                  }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: isSelConv ? "rgba(0,230,118,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${isSelConv ? "rgba(0,230,118,.2)" : "rgba(255,255,255,.05)"}`, borderRadius: 16, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = isSelConv ? "rgba(0,230,118,.08)" : "rgba(255,255,255,.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = isSelConv ? "rgba(0,230,118,.06)" : "rgba(255,255,255,.02)")}>

                  {selectMode && (
                    <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isSelConv ? "#00e676" : "rgba(255,255,255,.3)"}`, background: isSelConv ? "#00e676" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#070d1a", flexShrink: 0 }}>
                      {isSelConv && "✓"}
                    </div>
                  )}

                  {(() => {
                    const otherId2 = conv.participants.find(p => p !== currentUser.id) ?? "";
                    const other = users.find(u => u.id === otherId2);
                    return other?.photoURL ? (
                      <img src={other.photoURL} alt={name}
                        style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#fff", flexShrink: 0 }}>
                        {name[0]}
                      </div>
                    );
                  })()}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{name}</span>
                      {isPinned && <PinAltIcon width={12} height={12} style={{ color: "#00e676" }} />}
                      {isMuted && <BellSlashIcon width={12} height={12} style={{ color: "rgba(255,255,255,.4)" }} />}
                    </div>
                    <div style={{ color: "rgba(255,255,255,.38)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.lastMessage || "Start chatting…"}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    {conv.lastTime && <span style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>{conv.lastTime}</span>}
                    {unread > 0 && !isMuted && (
                      <span style={{ background: "#00e676", color: "#070d1a", borderRadius: "50%", width: 20, height: 20, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{unread}</span>
                    )}
                    {isMuted && (
                      <BellSlashIcon width={14} height={14} style={{ color: "rgba(255,255,255,.2)" }} />
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {sortedConvs.length === 0 && !showUsers && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,.2)" }}>
            <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18 }}>Tap + to start a private chat</p>
          </div>
        )}
      </div>

      {/* Context menu */}
      {ctxConv && (() => {
        const conv = conversations.find(c => c.id === ctxConv.id);
        const isMuted = conv ? isConversationMuted(conv as any, currentUser.id) : false;
        const isPinned = pinned.has(ctxConv.id);
        const x = Math.min(ctxConv.x, window.innerWidth - 210);
        const y = Math.min(ctxConv.y, window.innerHeight - 260);
        return (
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", left: x, top: y, background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, zIndex: 600, minWidth: 200, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.7)" }}>
            {[
              { label: isPinned ? "Unpin" : "Pin", Icon: isPinned ? PinSlashAltIcon : PinAltIcon, action: "pin", red: false },
              { label: isMuted ? "Unmute" : "Mute", Icon: isMuted ? BellIcon : BellSlashIcon, action: isMuted ? "unmute" : "mute", red: false },
              { label: "Select", Icon: CheckSquareIcon, action: "select", red: false },
              { label: "Delete", Icon: TrashAltIcon, action: "delete", red: true },
            ].map(item => (
              <button key={item.action} onClick={() => handleCtxAction(item.action)}
                style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: item.red ? "#ff5252" : "#fff", fontSize: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <item.Icon width={18} height={18} />
                {item.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Mute duration menu */}
      {showMuteMenu && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, overflow: "hidden", minWidth: 260, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 10 }}>
              <BellSlashIcon width={20} height={20} style={{ color: "#fff" }} />
              <div style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800 }}>Mute notifications</div>
            </div>
            {MUTE_OPTIONS.map(opt => (
              <button key={opt.label} onClick={() => handleMute(showMuteMenu, opt.ms)}
                style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,.05)", color: "#fff", fontSize: 15, textAlign: "left", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {opt.label}
              </button>
            ))}
            <button onClick={() => setShowMuteMenu(null)}
              style={{ width: "100%", padding: "14px 20px", background: "transparent", border: "none", color: "rgba(255,255,255,.35)", fontSize: 14, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}