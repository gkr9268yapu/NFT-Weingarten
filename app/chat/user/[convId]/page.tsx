"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import {
    listenPrivateMessages, sendPrivateMessage, sendPrivateImageMessage,
    sendPrivateDocumentMessage, sendPrivatePollMessage,
    deletePrivateMessageForMe, deletePrivateMessageForEveryone,
    togglePrivateReaction, markConversationRead, listenConversations,
    voteOnPrivatePoll, closePrivatePoll, pinMessage, unpinMessage,
} from "@/lib/firebaseDB";
import ChatRoom from "@/components/ChatRoom";
import type { Message, Conversation, ReplyTo, PollOption } from "@/lib/types";

export default function PrivateChatPage() {
    const { currentUser, users, loading } = useApp();
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
        <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="NFT Weingarten" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", animation: "pulse 1.2s infinite" }} />
        </div>
    );
    if (!currentUser) return null;

    const otherId = conv?.participants.find(p => p !== currentUser?.id)
        ?? convId.split("_").find(p => p !== currentUser?.id)
        ?? "";
    const otherName = conv?.participantNames[otherId]
        ?? users.find(u => u.id === otherId)?.name
        ?? "…";
        
    const upload = async (file: File) => {
        const form = new FormData();
        form.append("file", file);
        form.append("uploader", currentUser.name);
        form.append("chatOnly", "true");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        return data;
    };

    const currentOtherId = () => {
        if (conv) return conv.participants.find(p => p !== currentUser.id) ?? "";
        if (convId.startsWith(currentUser.id + "_")) return convId.slice(currentUser.id.length + 1);
        if (convId.endsWith("_" + currentUser.id)) return convId.slice(0, convId.length - currentUser.id.length - 1);
        return "";
    };
    const currentOtherName = () => conv?.participantNames[currentOtherId()] ?? otherName;

    const handleSendText = async (text: string, replyTo?: ReplyTo) => {
        const otherId = currentOtherId();
        if (!otherId) return;
        await sendPrivateMessage(convId, currentUser.id, currentUser.name, text, otherId, replyTo, currentOtherName());
        const { sendPushToUser } = await import("@/lib/notifications");
        await sendPushToUser(otherId, currentUser.name, "Sent you a message", `/chat/user/${convId}`).catch(() => { });
    };

    const handleSendImage = async (file: File, replyTo?: ReplyTo) => {
        const data = await upload(file);
        if (data.url) {
            const otherId = currentOtherId();
            await sendPrivateImageMessage(convId, currentUser.id, currentUser.name, data.url, otherId, replyTo, data.driveFileId);
            const { sendPushToUser } = await import("@/lib/notifications");
            await sendPushToUser(otherId, currentUser.name, "Sent you an image", `/chat/user/${convId}`).catch(() => { });
        }
    };

    const handleSendDocument = async (file: File, replyTo?: ReplyTo) => {
        const data = await upload(file);
        if (data.url) {
            const otherId = currentOtherId();
            await sendPrivateDocumentMessage(convId, currentUser.id, currentUser.name, data.url, file.name, data.fileSize ?? "", otherId, replyTo, data.driveFileId);
            const { sendPushToUser } = await import("@/lib/notifications");
            await sendPushToUser(otherId, currentUser.name, "Sent you a document", `/chat/user/${convId}`).catch(() => { });
        }
    };

    const handleSendPoll = async (question: string, options: string[], multiChoice: boolean) => {
        const otherId = currentOtherId();
        await sendPrivatePollMessage(convId, currentUser.id, currentUser.name, question, options, multiChoice, otherId);
        const { sendPushToUser } = await import("@/lib/notifications");
        await sendPushToUser(otherId, currentUser.name, "Sent you a poll", `/chat/user/${convId}`).catch(() => { });
    };

    const handleVote = async (msgId: string, optionId: string, multiChoice: boolean, currentOptions: PollOption[]) =>
        voteOnPrivatePoll(convId, msgId, optionId, currentUser.id, multiChoice, currentOptions);

    return (
        <div ref={wrapRef} style={{ position: "fixed", top: 0, left: 0, right: 0, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#070d1a" }}>
            <div style={{ flexShrink: 0, height: 56, background: "rgba(7,13,26,.97)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
                <button onClick={() => router.push("/chat")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0" }}>←</button>
                {(() => {
                    const other = users.find(u => u.id === otherId);
                    return other?.photoURL ? (
                        <img src={other.photoURL} alt={otherName}
                            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1a2540,#2a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0 }}>
                            {otherName[0]}
                        </div>
                    );
                })()}
                <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, letterSpacing: .5 }}>{otherName}</div>
                    <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11 }}>Private chat</div>
                </div>
            </div>
            <ChatRoom
                messages={messages}
                users={users}
                currentUser={currentUser}
                onSendText={handleSendText}
                onSendImage={handleSendImage}
                onSendDocument={handleSendDocument}
                onSendPoll={handleSendPoll}
                onReact={(msgId, emoji, current) => togglePrivateReaction(convId, msgId, emoji, currentUser.name, current)}
                onDeleteForMe={msgId => deletePrivateMessageForMe(convId, msgId, currentUser.id)}
                onDeleteForEveryone={msgId => deletePrivateMessageForEveryone(convId, msgId)}
                onVote={handleVote}
                onClosePoll={msgId => closePrivatePoll(convId, msgId)}
                onPin={msgId => pinMessage(msgId, `conversations/${convId}/messages`)}
                onUnpin={msgId => unpinMessage(msgId, `conversations/${convId}/messages`)}
            />
        </div>
    );
}