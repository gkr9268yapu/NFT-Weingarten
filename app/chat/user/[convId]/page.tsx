"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import {
    listenPrivateMessages, sendPrivateMessage, sendPrivateImageMessage,
    deletePrivateMessageForMe, deletePrivateMessageForEveryone,
    togglePrivateReaction, markConversationRead, listenConversations,
} from "@/lib/firebaseDB";
import ChatRoom from "@/components/ChatRoom";
import type { Message, Conversation, ReplyTo } from "@/lib/types";

export default function PrivateChatPage() {
    const { currentUser, loading } = useApp();
    const router = useRouter();
    const params = useParams();
    const convId = params.convId as string;
    const wrapRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [conv, setConv] = useState<Conversation | null>(null);

    useEffect(() => {
        if (!loading && !currentUser) router.push("/");
    }, [loading, currentUser, router]);

    useEffect(() => {
        if (!currentUser || !convId) return;
        const unsub = listenPrivateMessages(convId, setMessages);
        markConversationRead(convId, currentUser.id);
        return () => unsub();
    }, [currentUser, convId]);

    useEffect(() => {
        if (!currentUser) return;
        const unsub = listenConversations(currentUser.id, convs => {
            const found = convs.find(c => c.id === convId);
            if (found) { setConv(found); markConversationRead(convId, currentUser.id); }
        });
        return () => unsub();
    }, [currentUser, convId]);

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

    const otherId = conv?.participants.find(p => p !== currentUser.id) ?? "";
    const otherName = conv?.participantNames[otherId] ?? "…";

    const handleSendText = async (text: string, replyTo?: ReplyTo) =>
        sendPrivateMessage(convId, currentUser.id, currentUser.name, text, otherId, replyTo);

    const handleSendImage = async (file: File, replyTo?: ReplyTo) => {
        const form = new FormData();
        form.append("file", file);
        form.append("uploader", currentUser.name);
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        console.log("private upload response:", data);
        if (data.url) {
            try {
                const currentOtherId = conv?.participants.find(p => p !== currentUser.id) ?? "";
                console.log("otherId:", currentOtherId);
                await sendPrivateImageMessage(convId, currentUser.id, currentUser.name, data.url, currentOtherId, replyTo);
                console.log("private sendImageMessage success");
            } catch (err) {
                console.error("private sendImageMessage error:", err);
            }
        }
    };

    return (
        <div ref={wrapRef} style={{ position: "fixed", top: 0, left: 0, right: 0, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#070d1a" }}>
            {/* Header */}
            <div style={{ flexShrink: 0, height: 56, background: "rgba(7,13,26,.97)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 10 }}>
                <button onClick={() => router.push("/chat")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0" }}>←</button>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                    {otherName[0]}
                </div>
                <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, letterSpacing: .5 }}>{otherName}</div>
                    <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11 }}>Private chat</div>
                </div>
            </div>

            <ChatRoom
                messages={messages}
                currentUser={currentUser}
                onSendText={handleSendText}
                onSendImage={handleSendImage}
                onReact={(msgId, emoji, current) => togglePrivateReaction(convId, msgId, emoji, currentUser.name, current)}
                onDeleteForMe={msgId => deletePrivateMessageForMe(convId, msgId, currentUser.id)}
                onDeleteForEveryone={msgId => deletePrivateMessageForEveryone(convId, msgId)}
            />
        </div>
    );
}