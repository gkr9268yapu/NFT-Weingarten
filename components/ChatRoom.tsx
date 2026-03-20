"use client";
import { useState, useRef, useEffect } from "react";
import type { Message, User, ReplyTo, PollOption } from "@/lib/types";
import PollModal from "./PollModal";
import ArrowToBottomIcon from "./icons/ArrowToBottomIcon";
import ReplyStrokeIcon from "./icons/ReplyStrokeIcon";
import PollIcon from "./icons/PollIcon";
import FileDetailIcon from "./icons/FileDetailIcon";
import ImagesIcon from "./icons/ImagesIcon";
import CheckSquareIcon from "./icons/CheckSquareIcon";
import TrashAltIcon from "./icons/TrashAltIcon";
import PinAltIcon from "./icons/PinAltIcon";
import PinSlashAltIcon from "./icons/PinSlashAltIcon";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😮", "😢"] as const;

function getFileIcon(fileName: string) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️";
    if (ext === "pdf") return "📕";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📑";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    if (ext === "mp4" || ext === "mov") return "🎬";
    if (ext === "mp3" || ext === "wav") return "🎵";
    return "📄";
}

interface Props {
    messages: Message[];
    currentUser: User;
    users: User[];
    onSendText: (text: string, replyTo?: ReplyTo) => Promise<void>;
    onSendImage: (file: File, replyTo?: ReplyTo) => Promise<void>;
    onSendDocument: (file: File, replyTo?: ReplyTo) => Promise<void>;
    onSendPoll: (question: string, options: string[], multiChoice: boolean) => Promise<void>;
    onReact: (msgId: string, emoji: string, current: Record<string, string[]>) => Promise<void>;
    onDeleteForMe: (msgId: string) => Promise<void>;
    onDeleteForEveryone: (msgId: string) => Promise<void>;
    onVote: (msgId: string, optionId: string, multiChoice: boolean, currentOptions: PollOption[]) => Promise<void>;
    onClosePoll: (msgId: string) => Promise<void>;
    onPin: (msgId: string) => Promise<void>;
    onUnpin: (msgId: string) => Promise<void>;
}

export default function ChatRoom({
    messages, currentUser, users,
    onSendText, onSendImage, onSendDocument, onSendPoll,
    onReact, onDeleteForMe, onDeleteForEveryone,
    onVote, onClosePoll, onPin, onUnpin,
}: Props) {
    const chatRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const docRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
    const [ctx, setCtx] = useState<{ msgId: string; x: number; y: number } | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ msgId: string; isOwn: boolean } | null>(null);
    const [bulkDelete, setBulkDelete] = useState(false);
    const [showPlus, setShowPlus] = useState(false);
    const [showPoll, setShowPoll] = useState(false);
    const [tappedMsg, setTappedMsg] = useState<string | null>(null);

    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const swipedRef = useRef(false);
    const msgRefs = useRef<Record<string, HTMLDivElement>>({});
    const [pinnedIdx, setPinnedIdx] = useState(0);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    useEffect(() => {
        if (!ctx) return;
        const handler = () => setCtx(null);
        setTimeout(() => document.addEventListener("click", handler), 0);
        return () => document.removeEventListener("click", handler);
    }, [ctx]);

    useEffect(() => {
        if (!showPlus) return;
        const handler = () => setShowPlus(false);
        setTimeout(() => document.addEventListener("click", handler), 0);
        return () => document.removeEventListener("click", handler);
    }, [showPlus]);

    const scrollToMsg = (msgId: string) => {
        const el = msgRefs.current[msgId];
        if (el && chatRef.current) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.style.background = "rgba(0,230,118,.12)";
            setTimeout(() => { el.style.background = "transparent"; }, 1500);
        }
    };

    const getMsg = (id: string) => messages.find(m => m.id === id);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        setSending(true);
        try { await onSendText(text.trim(), replyTo ?? undefined); setText(""); setReplyTo(null); }
        finally { setSending(false); }
    };

    const uploadFile = async (file: File, type: "image" | "document", replyTo?: ReplyTo) => {
        setSending(true);
        try {
            if (type === "image") await onSendImage(file, replyTo);
            else await onSendDocument(file, replyTo);
            setReplyTo(null);
        } finally {
            setSending(false);
            if (fileRef.current) fileRef.current.value = "";
            if (docRef.current) docRef.current.value = "";
        }
    };

    const openCtx = (msgId: string, x: number, y: number) => setCtx({ msgId, x, y });

    const handleCtxAction = async (action: string) => {
        if (!ctx) return;
        const msg = getMsg(ctx.msgId);
        setCtx(null);
        if (!msg) return;
        if (action === "reply") {
            setReplyTo({ id: msg.id, user: msg.user, text: msg.text, type: msg.type });
            setTimeout(() => inputRef.current?.focus(), 50);
        } else if (action === "copy" && msg.type === "text") {
            await navigator.clipboard.writeText(msg.text).catch(() => { });
        } else if (action === "download" && (msg.type === "document" || msg.type === "image")) {
            const fileUrl = msg.fileUrl ?? msg.imageUrl ?? "";
            const fileId = msg.driveFileId ?? fileUrl.split("/api/image/")[1] ?? "";
            if (fileId) {
                const name = encodeURIComponent(msg.fileName ?? "file");
                window.open(`/api/image/${fileId}?download=1&name=${name}`, "_blank");
            } else if (fileUrl) {
                window.open(fileUrl, "_blank");
            }
        } else if (action === "select") {
            setSelectMode(true); setSelected(new Set([ctx.msgId]));
        } else if (action === "pin") {
            if (msg.pinned) await onUnpin(msg.id);
            else await onPin(msg.id);
        } else if (action === "delete") {
            setDeleteModal({ msgId: msg.id, isOwn: msg.userId === currentUser.id });
        }
    };

    const toggleSelect = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const cancelSelect = () => { setSelectMode(false); setSelected(new Set()); };

    const selectedMsgs = messages.filter(m => selected.has(m.id));
    const allOwn = selectedMsgs.every(m => m.userId === currentUser.id);
    const hasFiles = selectedMsgs.some(m => m.type === "image" || m.type === "document");
    const hasText = selectedMsgs.some(m => m.type === "text");
    const onlyFiles = hasFiles && !hasText;
    const onlyOwnFiles = onlyFiles && allOwn;

    const handleBulkCopy = () => {
        navigator.clipboard.writeText(selectedMsgs.map(m => `${m.user}: ${m.text}`).join("\n")).catch(() => { });
        cancelSelect();
    };
    const handleBulkDownload = () => {
        selectedMsgs.filter(m => (m.type === "image" || m.type === "document") && (m.fileUrl || m.imageUrl)).forEach(m => {
            const a = document.createElement("a"); a.href = m.fileUrl ?? m.imageUrl!; a.download = m.fileName ?? "file"; a.click();
        });
        cancelSelect();
    };
    const handleBulkDelete = async (forEveryone: boolean) => {
        for (const msg of selectedMsgs) {
            if (forEveryone && msg.userId === currentUser.id) await onDeleteForEveryone(msg.id);
            else await onDeleteForMe(msg.id);
        }
        cancelSelect(); setBulkDelete(false);
    };

    // Group by date
    const grouped: { date: string; msgs: Message[] }[] = [];
    for (const msg of messages) {
        if (msg.deletedFor?.includes(currentUser.id)) continue;
        const last = grouped[grouped.length - 1];
        if (!last || last.date !== msg.dateStr) grouped.push({ date: msg.dateStr, msgs: [msg] });
        else last.msgs.push(msg);
    }

    function formatDate(d: string) {
        const today = new Date().toISOString().split("T")[0];
        const yest = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        if (d === today) return "Today";
        if (d === yest) return "Yesterday";
        return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
    }

    function ctxPos(x: number, y: number) {
        const w = 200, h = 340;
        return {
            left: Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 400) - w - 8),
            top: Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 700) - h - 8),
        };
    }

    const totalVotes = (options: PollOption[]) => options.reduce((s, o) => s + o.votes.length, 0);

    return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Selection toolbar */}
            {selectMode && (
                <div style={{ flexShrink: 0, height: 48, background: "#0e1828", borderBottom: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
                    <button onClick={cancelSelect} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>✕</button>
                    <span style={{ flex: 1, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 700 }}>{selected.size} selected</span>
                    {!hasFiles && <button onClick={handleBulkCopy} style={{ background: "none", border: "none", color: "#00e676", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 10px" }}>Copy</button>}
                    {onlyFiles && !onlyOwnFiles && <button onClick={handleBulkDownload} style={{ background: "none", border: "none", color: "#00e676", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 10px" }}>Download</button>}
                    <button onClick={() => setBulkDelete(true)} style={{ background: "none", border: "none", color: "#ff5252", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 10px" }}>Delete</button>
                </div>
            )}

            {/* Pinned messages bar */}
            {(() => {
                const pinned = messages.filter(m => m.pinned && !m.deletedForEveryone);
                if (pinned.length === 0) return null;
                const idx = pinnedIdx % pinned.length;
                const pm = pinned[idx];
                return (
                    <div onClick={() => { scrollToMsg(pm.id); setPinnedIdx(i => (i + 1) % pinned.length); }}
                        style={{ flexShrink: 0, background: "rgba(0,230,118,.06)", borderBottom: "1px solid rgba(0,230,118,.12)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}><PinAltIcon width={16} height={16} style={{ color: "#00e676" }} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#00e676", fontSize: 11, fontWeight: 700, marginBottom: 1 }}>
                                Pinned message {pinned.length > 1 ? `${idx + 1}/${pinned.length}` : ""}
                            </div>
                            <div style={{ color: "rgba(255,255,255,.6)", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <span style={{ color: "rgba(255,255,255,.4)", marginRight: 4 }}>{pm.user}:</span>
                                {pm.type === "image" ? "🖼️ Image" : pm.type === "document" ? `📄 ${pm.fileName}` : pm.type === "poll" ? `📊 ${pm.poll?.question}` : pm.text.slice(0, 80)}
                            </div>
                        </div>
                        {pinned.length > 1 && (
                            <span style={{ color: "rgba(255,255,255,.3)", fontSize: 18, flexShrink: 0 }}>›</span>
                        )}
                    </div>
                );
            })()}

            {/* Messages */}
            <div ref={chatRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 10px" }}>
                {grouped.map(group => (
                    <div key={group.date}>
                        <div style={{ textAlign: "center", margin: "10px 0" }}>
                            <span style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.45)", fontSize: 11, padding: "3px 12px", borderRadius: 20 }}>
                                {formatDate(group.date)}
                            </span>
                        </div>
                        {group.msgs.map(msg => {
                            const isMe = msg.userId === currentUser.id;
                            const isSelected = selected.has(msg.id);
                            const isDeleted = msg.deletedForEveryone;

                            return (
                                <div key={msg.id}
                                    ref={el => { if (el) msgRefs.current[msg.id] = el; }}
                                    className="msg-bubble"
                                    style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, marginBottom: 3, alignItems: "flex-end", position: "relative", background: isSelected ? "rgba(0,230,118,.05)" : "transparent", borderRadius: 10, padding: "1px 2px", cursor: selectMode ? "pointer" : "default", transition: "background .4s" }}
                                onTouchStart={e => {
                                    if (selectMode) return; // allow normal touch in select mode
                                    e.preventDefault();
                                    touchStartX.current = e.touches[0].clientX;
                                    touchStartY.current = e.touches[0].clientY;
                                    swipedRef.current = false;
                                    const timer = setTimeout(() => {
                                        if (navigator.vibrate) navigator.vibrate(40);
                                        openCtx(msg.id, window.innerWidth / 2, window.innerHeight / 2);
                                    }, 500);
                                    (e.currentTarget as HTMLElement).dataset.timer = String(timer);
                                }}
                                    onTouchMove={e => {
                                        const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
                                        const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
                                        if (dy > 8) {
                                            clearTimeout(Number((e.currentTarget as HTMLElement).dataset.timer));
                                        }
                                        if (!swipedRef.current && !selectMode) {
                                            const swipeX = e.touches[0].clientX - touchStartX.current;
                                            if (swipeX > 55 && !isDeleted && dx > dy) {
                                                swipedRef.current = true;
                                                clearTimeout(Number((e.currentTarget as HTMLElement).dataset.timer));
                                                setReplyTo({ id: msg.id, user: msg.user, text: msg.text, type: msg.type });
                                                setTimeout(() => inputRef.current?.focus(), 50);
                                            }
                                        }
                                    }}
                                onTouchEnd={e => {
                                    clearTimeout(Number((e.currentTarget as HTMLElement).dataset.timer));
                                    if (selectMode) {
                                        e.stopPropagation();
                                        toggleSelect(msg.id);
                                        return;
                                    }
                                }}
                                    onContextMenu={e => { e.preventDefault(); if (selectMode) { toggleSelect(msg.id); return; } openCtx(msg.id, e.clientX, e.clientY); }}
                                    onDoubleClick={() => { if (!isDeleted && !selectMode) { setReplyTo({ id: msg.id, user: msg.user, text: msg.text, type: msg.type }); setTimeout(() => inputRef.current?.focus(), 50); } }}
                                    onClick={() => {}}
                                >
                                    {selectMode && (
                                        <div style={{ display: "flex", alignItems: "center", paddingBottom: 6 }}>
                                            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid", borderColor: isSelected ? "#00e676" : "rgba(255,255,255,.3)", background: isSelected ? "#00e676" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#070d1a" }}>
                                                {isSelected && "✓"}
                                            </div>
                                        </div>
                                    )}

                                    {!isMe && (() => {
                                        const sender = users.find(u => u.id === msg.userId);
                                        return sender?.photoURL ? (
                                            <img src={sender.photoURL} alt={sender.name}
                                                style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, objectFit: "cover", marginBottom: 4 }} />
                                        ) : (
                                            <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg,#2a3a5c,#1a2540)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff", marginBottom: 4 }}>
                                                {msg.user[0]}
                                            </div>
                                        );
                                    })()}

                                    <div style={{ maxWidth: msg.type === "poll" ? "88%" : "75%" }}>
                                        {!isMe && !isDeleted && (
                                            <div style={{ fontSize: 11, color: "#00e676", fontWeight: 700, marginBottom: 1, paddingLeft: 2 }}>{msg.user}</div>
                                        )}

                                        {/* Reply preview */}
                                        {msg.replyTo && !isDeleted && (
                                            <div style={{ background: isMe ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.05)", borderLeft: `3px solid ${isMe ? "rgba(255,255,255,.4)" : "#00e676"}`, borderRadius: "8px 8px 0 0", padding: "5px 10px", marginBottom: -6 }}>
                                                <div style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,.7)" : "#00e676", fontWeight: 700 }}>{msg.replyTo.user}</div>
                                                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 1 }}>
                                                    {msg.replyTo.type === "image" ? "🖼️ Image" : msg.replyTo.type === "document" ? "📄 Document" : msg.replyTo.type === "poll" ? "📊 Poll" : msg.replyTo.text.slice(0, 50)}
                                                </div>
                                            </div>
                                        )}

                                        {/* Message bubble */}
                                        {isDeleted ? (
                                            <div style={{ background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.3)", padding: "9px 13px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", fontSize: 14, fontStyle: "italic" }}>
                                                🚫 This message was deleted
                                            </div>
                                        ) : msg.type === "image" && msg.imageUrl ? (
                                            <div style={{ background: isMe ? "linear-gradient(135deg,#00c853,#00e676)" : "rgba(255,255,255,.08)", padding: 4, borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px" }}>
                                                <img src={msg.imageUrl} alt="img" onClick={e => { e.stopPropagation(); setPreview(msg.imageUrl!); }}
                                                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12, display: "block", cursor: "pointer" }} />
                                            </div>
                                        ) : msg.type === "document" && msg.fileUrl ? (
                                            <div style={{ background: isMe ? "linear-gradient(135deg,#00c853,#00e676)" : "rgba(255,255,255,.08)", padding: "10px 14px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                                                <span style={{ fontSize: 28, flexShrink: 0 }}>{getFileIcon(msg.fileName ?? "")}</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ color: isMe ? "#070d1a" : "#fff", fontSize: 13, fontWeight: 600, wordBreak: "break-all", lineHeight: 1.3 }}>{msg.fileName}</div>
                                                    {msg.fileSize && <div style={{ color: isMe ? "rgba(0,0,0,.5)" : "rgba(255,255,255,.4)", fontSize: 11, marginTop: 2 }}>{msg.fileSize}</div>}
                                                </div>
                                            </div>
                                        ) : msg.type === "poll" && msg.poll ? (
                                            /* Poll bubble */
                                            <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "14px 16px", minWidth: 260 }}>
                                                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>📊 POLL {msg.poll.closed ? "· CLOSED" : ""}</div>
                                                <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>{msg.poll.question}</div>
                                                {msg.poll.options.map(opt => {
                                                    const total = totalVotes(msg.poll!.options);
                                                    const pct = total > 0 ? Math.round((opt.votes.length / total) * 100) : 0;
                                                    const hasVoted = opt.votes.includes(currentUser.id);
                                                    return (
                                                        <div key={opt.id} onClick={() => { if (!msg.poll!.closed) onVote(msg.id, opt.id, msg.poll!.multiChoice, msg.poll!.options); }}
                                                            style={{ marginBottom: 8, cursor: msg.poll!.closed ? "default" : "pointer" }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                                <span style={{ color: hasVoted ? "#00e676" : "#fff", fontSize: 13, fontWeight: hasVoted ? 700 : 400 }}>
                                                                    {hasVoted ? "✓ " : ""}{opt.text}
                                                                </span>
                                                                <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>{pct}%</span>
                                                            </div>
                                                            <div style={{ height: 4, background: "rgba(255,255,255,.08)", borderRadius: 4, overflow: "hidden" }}>
                                                                <div style={{ height: "100%", width: `${pct}%`, background: hasVoted ? "#00e676" : "rgba(255,255,255,.2)", borderRadius: 4, transition: "width .3s" }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                                                    <span style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>
                                                        {msg.poll.multiChoice ? "Multiple choice" : "Single choice"} · {totalVotes(msg.poll.options)} vote{totalVotes(msg.poll.options) !== 1 ? "s" : ""}
                                                    </span>
                                                    {msg.userId === currentUser.id && !msg.poll.closed && (
                                                        <button onClick={e => { e.stopPropagation(); onClosePoll(msg.id); }}
                                                            style={{ background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                                            Close poll
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ background: isMe ? "linear-gradient(135deg,#00c853,#00e676)" : "rgba(255,255,255,.08)", color: isMe ? "#070d1a" : "#fff", padding: "9px 13px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.5, wordBreak: "break-word" }}>
                                                {msg.text}
                                            </div>
                                        )}

                                        {/* Time + reactions */}
                                        {!isDeleted && (
                                            <div style={{ display: "flex", gap: 5, marginTop: 2, flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "center" }}>
                                                <span style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>{msg.time}</span>
                                                {Object.entries(msg.reactions).map(([emoji, users]) =>
                                                    users.length > 0 && (
                                                        <span key={emoji} onClick={() => onReact(msg.id, emoji, msg.reactions)}
                                                            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "1px 7px", fontSize: 12, cursor: "pointer" }}>
                                                            {emoji} {users.length}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile tap menu button */}
                                    {tappedMsg === msg.id && !selectMode && !isDeleted && (
                                        <button
                                            className="mobile-menu-btn"
                                            onClick={e => { e.stopPropagation(); setTappedMsg(null); openCtx(msg.id, window.innerWidth / 2, window.innerHeight / 2); }}
                                            style={{ background: "rgba(14,24,40,.95)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 18, cursor: "pointer", flexShrink: 0, alignSelf: "center", letterSpacing: 2, lineHeight: 1 }}>
                                            ⋯
                                        </button>
                                    )}

                                    {/* Desktop hover reply */}
                                    {!selectMode && !isDeleted && (
                                        <button className="hover-reply" onClick={e => { e.stopPropagation(); setReplyTo({ id: msg.id, user: msg.user, text: msg.text, type: msg.type }); setTimeout(() => inputRef.current?.focus(), 50); }}
                                            style={{ opacity: 0, background: "rgba(255,255,255,.07)", border: "none", color: "rgba(255,255,255,.5)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "opacity 0.15s", alignSelf: "center" }}>
                                            <ReplyStrokeIcon width={16} height={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
                {messages.filter(m => !m.deletedFor?.includes(currentUser.id)).length === 0 && (
                    <div style={{ textAlign: "center", paddingTop: 60, color: "rgba(255,255,255,.2)" }}>
                        <p style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18 }}>No messages yet — say hi! 👋</p>
                    </div>
                )}
            </div>

            {/* Reply bar */}
            {replyTo && (
                <div style={{ flexShrink: 0, background: "rgba(14,24,40,.98)", borderTop: "1px solid rgba(255,255,255,.07)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, borderLeft: "3px solid #00e676", paddingLeft: 10 }}>
                        <div style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>{replyTo.user}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                            {replyTo.type === "image" ? "🖼️ Image" : replyTo.type === "document" ? "📄 Document" : replyTo.type === "poll" ? "📊 Poll" : replyTo.text.slice(0, 60)}
                        </div>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 18, cursor: "pointer" }}>✕</button>
                </div>
            )}

            {/* + menu popup */}
            {showPlus && (
                <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 70, left: 12, background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 -8px 30px rgba(0,0,0,.6)", zIndex: 400, minWidth: 180 }}>
                    {[
                        { Icon: ImagesIcon, label: "Image", action: "image" },
                        { Icon: FileDetailIcon, label: "Document", action: "doc" },
                        { Icon: PollIcon, label: "Poll", action: "poll" },
                    ].map(item => (
                        <button key={item.action}
                            onClick={() => {
                                setShowPlus(false);
                                if (item.action === "image") fileRef.current?.click();
                                if (item.action === "doc") docRef.current?.click();
                                if (item.action === "poll") setShowPoll(true);
                            }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", background: "none", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", textAlign: "left" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                            <item.Icon width={22} height={22} style={{ color: "#00e676" }} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Input bar */}
            <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,.07)", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center", background: "rgba(7,13,26,.98)", position: "relative" }}>
                <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image", replyTo ?? undefined); }} style={{ display: "none" }} />
                <input ref={docRef} type="file" accept="*/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "document", replyTo ?? undefined); }} style={{ display: "none" }} />

                {/* + button */}
                <button onClick={e => { e.stopPropagation(); setShowPlus(!showPlus); }}
                    style={{ background: "none", border: "none", color: showPlus ? "#00e676" : "rgba(255,255,255,.45)", fontSize: 24, cursor: "pointer", padding: 4, flexShrink: 0, fontWeight: 300, lineHeight: 1, transition: "color .15s" }}>
                    {showPlus ? "✕" : "+"}
                </button>

                {/* Text input with camera inside */}
                <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                    <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Type a message…"
                        style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 24, padding: "10px 44px 10px 16px", color: "#fff", fontSize: 14, fontFamily: "'Barlow',sans-serif", outline: "none" }} />
                    {/* Camera icon inside input */}
                    <button onClick={() => fileRef.current?.click()}
                        style={{ position: "absolute", right: 10, background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 18, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                        📷
                    </button>
                </div>

                <button onClick={handleSend} disabled={sending || !text.trim()}
                    style={{ background: !text.trim() || sending ? "rgba(0,230,118,.25)" : "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", border: "none", padding: "10px 18px", borderRadius: 24, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", flexShrink: 0, opacity: !text.trim() || sending ? 0.5 : 1 }}>
                    Send
                </button>
            </div>

            {/* Context menu */}
            {ctx && (() => {
                const msg = getMsg(ctx.msgId);
                if (!msg) return null;
                const isOwn = msg.userId === currentUser.id;
                const isDeleted = msg.deletedForEveryone;
                const isFile = msg.type === "image" || msg.type === "document";
                const pos = ctxPos(ctx.x, ctx.y);
                return (
                    <div onClick={e => e.stopPropagation()} style={{ position: "fixed", left: pos.left, top: pos.top, background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, zIndex: 600, minWidth: 190, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.7)" }}>
                        {!isDeleted && msg.type !== "poll" && (
                            <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                                {EMOJIS.map(e => (
                                    <span key={e} onClick={() => { onReact(msg.id, e, msg.reactions); setCtx(null); }}
                                        style={{ fontSize: 20, cursor: "pointer", display: "inline-block", transition: "transform .1s" }}
                                        onMouseEnter={ev => (ev.currentTarget.style.transform = "scale(1.3)")}
                                        onMouseLeave={ev => (ev.currentTarget.style.transform = "scale(1)")}>
                                        {e}
                                    </span>
                                ))}
                            </div>
                        )}
                        {([
                            !isDeleted && { label: "Reply", Icon: ReplyStrokeIcon, action: "reply", red: false },
                            !isDeleted && msg.type === "text" && { label: "Copy", Icon: null, action: "copy", red: false },
                            !isDeleted && isFile && { label: "Download", Icon: ArrowToBottomIcon, action: "download", red: false },
                            !isDeleted && { label: msg.pinned ? "Unpin" : "Pin", Icon: msg.pinned ? PinSlashAltIcon : PinAltIcon, action: "pin", red: false },
                            { label: "Select", Icon: CheckSquareIcon, action: "select", red: false },
                            (isOwn || currentUser.role === "host") && !isDeleted && { label: "Delete", Icon: TrashAltIcon, action: "delete", red: true },
                        ].filter(Boolean) as { label: string; Icon: any; action: string; red: boolean }[]).map(item => (
                            <button key={item.action} onClick={() => handleCtxAction(item.action)}
                                style={{ width: "100%", padding: "11px 16px", background: "transparent", border: "none", color: item.red ? "#ff5252" : "#fff", fontSize: 14, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                {item.Icon && <item.Icon width={16} height={16} />}
                                {item.label}
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* Single delete modal */}
            {deleteModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "24px", width: 290, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Delete message?</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {deleteModal.isOwn && (
                                <button onClick={async () => { await onDeleteForEveryone(deleteModal.msgId); setDeleteModal(null); }}
                                    style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(255,82,82,.3)", background: "rgba(255,82,82,.1)", color: "#ff5252", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                    Delete for everyone
                                </button>
                            )}
                            <button onClick={async () => { await onDeleteForMe(deleteModal.msgId); setDeleteModal(null); }}
                                style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                Delete for me
                            </button>
                            <button onClick={() => setDeleteModal(null)}
                                style={{ padding: "12px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 14, cursor: "pointer" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk delete modal */}
            {bulkDelete && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: "24px", width: 290, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
                        <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Delete {selected.size} message{selected.size > 1 ? "s" : ""}?</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {allOwn && (
                                <button onClick={() => handleBulkDelete(true)}
                                    style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(255,82,82,.3)", background: "rgba(255,82,82,.1)", color: "#ff5252", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                    Delete for everyone
                                </button>
                            )}
                            <button onClick={() => handleBulkDelete(false)}
                                style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                Delete for me
                            </button>
                            <button onClick={() => setBulkDelete(false)}
                                style={{ padding: "12px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 14, cursor: "pointer" }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image preview */}
            {preview && (
                <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.93)", zIndex: 800, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                    <img src={preview} alt="preview" style={{ maxWidth: "92vw", maxHeight: "78vh", borderRadius: 12, objectFit: "contain" }} />
                    <div style={{ display: "flex", gap: 10 }}>
                        <a href={preview} download="image" onClick={e => e.stopPropagation()}
                            style={{ background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", padding: "10px 22px", borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15, textDecoration: "none" }}>
                            ⬇ Download
                        </a>
                        <button onClick={() => setPreview(null)}
                            style={{ background: "rgba(255,255,255,.1)", border: "none", color: "#fff", padding: "10px 22px", borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Poll modal */}
            {showPoll && (
                <PollModal onClose={() => setShowPoll(false)} onSubmit={onSendPoll} />
            )}

            <style>{`
        .msg-bubble {
          -webkit-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          touch-action: pan-y;
        }
        .hover-reply { display: none !important; }
        .mobile-menu-btn { display: none !important; }
        @media (hover: hover) {
          div:hover > .hover-reply { opacity: 1 !important; display: flex !important; }
        }
      `}</style>
        </div>
    );
}