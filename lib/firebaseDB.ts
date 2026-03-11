import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp,
  getDoc, setDoc, getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, Message, User, Conversation, ReplyTo } from "./types";


/* ══ USERS ══════════════════════════════════════════════════ */
export function listenUsers(cb: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "users"), snap => {
    cb(snap.docs.map(d => ({ ...(d.data() as Omit<User, "password">), password: "" })));
  });
}
export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

export async function deleteConversation(convId: string): Promise<void> {
  await deleteDoc(doc(db, "conversations", convId));
}

/* ══ MATCHES ════════════════════════════════════════════════ */
export function listenMatches(cb: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "matches"), orderBy("date", "asc")),
    snap => { cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Match, "id">) }))); }
  );
}
export async function createMatch(data: Omit<Match, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "matches"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}
export async function updateMatch(id: string, data: Partial<Omit<Match, "id">>): Promise<void> {
  await updateDoc(doc(db, "matches", id), data);
}
export async function deleteMatch(id: string): Promise<void> {
  await deleteDoc(doc(db, "matches", id));
}
export async function setAvailability(
  matchId: string, playerName: string,
  status: "available" | "notAvailable",
  current: Pick<Match, "available" | "notAvailable">
): Promise<void> {
  const avail = current.available.filter(n => n !== playerName);
  const notAvail = current.notAvailable.filter(n => n !== playerName);
  await updateDoc(doc(db, "matches", matchId), {
    available: status === "available" ? [...avail, playerName] : avail,
    notAvailable: status === "notAvailable" ? [...notAvail, playerName] : notAvail,
  });
}

/* ══ HELPERS ════════════════════════════════════════════════ */
function toMessage(d: { id: string; data: () => Record<string, unknown> }): Message {
  const data = d.data();
  return {
    id: d.id,
    userId: (data.userId as string) ?? "",
    user: (data.user as string) ?? "",
    text: (data.text as string) ?? "",
    time: (data.time as string) ?? "",
    dateStr: (data.dateStr as string) ?? "",
    type: (data.type as "text" | "image") ?? "text",
    imageUrl: (data.imageUrl as string | undefined),
    reactions: (data.reactions as Record<string, string[]>) ?? {},
    replyTo: (data.replyTo as ReplyTo | undefined),
    deletedFor: (data.deletedFor as string[]) ?? [],
    deletedForEveryone: (data.deletedForEveryone as boolean) ?? false,
  };
}

function nowStrings() {
  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = now.toISOString().split("T")[0];
  return { time, dateStr };
}

/* ══ TEAM MESSAGES ══════════════════════════════════════════ */
export function listenMessages(cb: (msgs: Message[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "messages"), orderBy("createdAt", "asc")),
    snap => { cb(snap.docs.map(d => toMessage({ id: d.id, data: d.data.bind(d) }))); }
  );
}

export async function sendMessage(
  userId: string, user: string, text: string,
  replyTo?: ReplyTo
): Promise<void> {
  const { time, dateStr } = nowStrings();
  await addDoc(collection(db, "messages"), {
    userId, user, text, time, dateStr,
    type: "text", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendImageMessage(
  userId: string, user: string, imageUrl: string,
  replyTo?: ReplyTo
): Promise<void> {
  const { time, dateStr } = nowStrings();
  await addDoc(collection(db, "messages"), {
    userId, user, text: "📷 Image", imageUrl, time, dateStr,
    type: "image", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
}

export async function deleteMessageForMe(msgId: string, userId: string, collPath = "messages"): Promise<void> {
  const ref = doc(db, collPath, msgId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = (snap.data().deletedFor as string[]) ?? [];
  if (!current.includes(userId)) {
    await updateDoc(ref, { deletedFor: [...current, userId] });
  }
}

export async function deleteMessageForEveryone(msgId: string, collPath = "messages"): Promise<void> {
  await updateDoc(doc(db, collPath, msgId), {
    deletedForEveryone: true, text: "This message was deleted", imageUrl: null, type: "text",
  });
}

export async function toggleReaction(
  msgId: string, emoji: string, userName: string,
  current: Record<string, string[]>, collPath = "messages"
): Promise<void> {
  const list = [...(current[emoji] ?? [])];
  const idx = list.indexOf(userName);
  if (idx >= 0) list.splice(idx, 1); else list.push(userName);
  const updated = { ...current, [emoji]: list };
  if (updated[emoji].length === 0) delete updated[emoji];
  await updateDoc(doc(db, collPath, msgId), { reactions: updated });
}

/* ══ PRIVATE CONVERSATIONS ══════════════════════════════════ */
export function getConvId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

export async function getOrCreateConversation(
  myId: string, myName: string,
  otherId: string, otherName: string
): Promise<string> {
  const convId = getConvId(myId, otherId);
  const ref = doc(db, "conversations", convId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [myId, otherId],
      participantNames: { [myId]: myName, [otherId]: otherName },
      lastMessage: "",
      lastTime: "",
      lastTimestamp: Date.now(),
      unread: { [myId]: 0, [otherId]: 0 },
    });
  }
  return convId;
}

export function listenConversations(userId: string, cb: (convs: Conversation[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "conversations"), where("participants", "array-contains", userId)),
    snap => {
      const convs = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }))
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      cb(convs);
    }
  );
}

export function listenPrivateMessages(convId: string, cb: (msgs: Message[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc")),
    snap => { cb(snap.docs.map(d => toMessage({ id: d.id, data: d.data.bind(d) }))); }
  );
}

export async function sendPrivateMessage(
  convId: string, userId: string, user: string, text: string,
  otherId: string, replyTo?: ReplyTo
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const msgRef = collection(db, "conversations", convId, "messages");
  await addDoc(msgRef, {
    userId, user, text, time, dateStr,
    type: "text", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, "conversations", convId));
  const unread = (snap.data()?.unread as Record<string, number>) ?? {};
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: text, lastTime: time,
    lastTimestamp: Date.now(),
    unread: { ...unread, [otherId]: (unread[otherId] ?? 0) + 1 },
  });
}

export async function sendPrivateImageMessage(
  convId: string, userId: string, user: string, imageUrl: string,
  otherId: string, replyTo?: ReplyTo
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const msgRef = collection(db, "conversations", convId, "messages");
  await addDoc(msgRef, {
    userId, user, text: "📷 Image", imageUrl, time, dateStr,
    type: "image", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, "conversations", convId));
  const unread = (snap.data()?.unread as Record<string, number>) ?? {};
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: "📷 Image", lastTime: time,
    lastTimestamp: Date.now(),
    unread: { ...unread, [otherId]: (unread[otherId] ?? 0) + 1 },
  });
}

export async function markConversationRead(convId: string, userId: string): Promise<void> {
  const snap = await getDoc(doc(db, "conversations", convId));
  if (!snap.exists()) return;
  const unread = (snap.data().unread as Record<string, number>) ?? {};
  await updateDoc(doc(db, "conversations", convId), {
    unread: { ...unread, [userId]: 0 },
  });
}

export async function deletePrivateMessageForMe(convId: string, msgId: string, userId: string): Promise<void> {
  await deleteMessageForMe(msgId, userId, `conversations/${convId}/messages`);
}

export async function deletePrivateMessageForEveryone(convId: string, msgId: string): Promise<void> {
  await deleteMessageForEveryone(msgId, `conversations/${convId}/messages`);
}

export async function togglePrivateReaction(
  convId: string, msgId: string, emoji: string, userName: string,
  current: Record<string, string[]>
): Promise<void> {
  await toggleReaction(msgId, emoji, userName, current, `conversations/${convId}/messages`);
}

/* ══ SEED ═══════════════════════════════════════════════════ */
export async function seedInitialData(): Promise<void> {
  const matchSnap = await getDocs(collection(db, "matches"));
  if (!matchSnap.empty) { console.log("Already seeded"); return; }
  await addDoc(collection(db, "matches"), {
    title: "Saturday Morning Game", team1: "Frankfurt FC", team2: "Night FC",
    date: "2026-03-07", time: "10:00", venue: "Central Park Field A",
    coach: "Coach Mike", description: "Weekly Saturday game. Bring your boots!",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
    expiryDate: "2026-12-31", available: [], notAvailable: [], createdAt: serverTimestamp(),
  });
  console.log("Seeded successfully!");
}