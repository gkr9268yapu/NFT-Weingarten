"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import {
    sendMessage, sendImageMessage,
    deleteMessageForMe, deleteMessageForEveryone, toggleReaction,
} from "@/lib/firebaseDB";
import ChatRoom from "@/components/ChatRoom";
import type { ReplyTo } from "@/lib/types";

export default function TeamChatPage() {
    const { currentUser, messages, loading } = useApp();
    const router = useRouter();
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loading && !currentUser) router.push("/");
    }, [loading, currentUser, router]);

    // Keyboard resize
    useEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap || !window.visualViewport) return;
        const handler = () => {
            const vv = window.visualViewport!;
            wrap.style.height = `${vv.height}px`;
            wrap.style.top = `${vv.offsetTop}px`;
        };
        window.visualViewport.addEventListener("resize", handler);
        window.visualViewport.addEventListener("scroll", handler);
        handler();
        return () => {
            window.visualViewport!.removeEventListener("resize", handler);
            window.visualViewport!.removeEventListener("scroll", handler);
        };
    }, []);

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>⚽</div>
    );
    if (!currentUser) return null;

    const handleSendText = async (text: string, replyTo?: ReplyTo) =>
        sendMessage(currentUser.id, currentUser.name, text, replyTo);

    const handleSendImage = async (file: File, replyTo?: ReplyTo) => {
        const form = new FormData();
        form.append("file", file);
        form.append("uploader", currentUser.name);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        console.log("upload response:", data);
        console.log("calling sendImageMessage with:", currentUser.id, currentUser.name, data.url);
        if (data.url) {
            try {
                await sendImageMessage(currentUser.id, currentUser.name, data.url, replyTo);
                console.log("sendImageMessage success");
            } catch (err) {
                console.error("sendImageMessage error:", err);
            }
        }
    };
    return (
        <div ref={wrapRef} style={{ position: "fixed", top: 0, left: 0, right: 0, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#070d1a" }}>
            {/* Header */}
            <div style={{ flexShrink: 0, height: 56, background: "rgba(7,13,26,.97)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 10 }}>
                <button onClick={() => router.push("/chat")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0" }}>←</button>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#00e676,#00c853)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚽</div>
                <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, letterSpacing: .5 }}>NFT Weingarten</div>
                    <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11 }}>Team group chat</div>
                </div>
            </div>

            {/* Chat fills remaining height */}
            <ChatRoom
                messages={messages}
                currentUser={currentUser}
                onSendText={handleSendText}
                onSendImage={handleSendImage}
                onReact={(msgId, emoji, current) => toggleReaction(msgId, emoji, currentUser.name, current)}
                onDeleteForMe={msgId => deleteMessageForMe(msgId, currentUser.id)}
                onDeleteForEveryone={msgId => deleteMessageForEveryone(msgId)}
            />
        </div>
    );
}