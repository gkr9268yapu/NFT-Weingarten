import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
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
    type: (data.type as "text" | "image" | "document" | "poll") ?? "text",
    imageUrl: (data.imageUrl as string | undefined),
    fileUrl: (data.fileUrl as string | undefined),
    fileName: (data.fileName as string | undefined),
    fileSize: (data.fileSize as string | undefined),
    driveFileId: (data.driveFileId as string | undefined),
    poll: (data.poll as import("./types").Poll | undefined),
    reactions: (data.reactions as Record<string, string[]>) ?? {},
    replyTo: (data.replyTo as ReplyTo | undefined),
    deletedFor: (data.deletedFor as string[]) ?? [],
    deletedForEveryone: (data.deletedForEveryone as boolean) ?? false,
    pinned: (data.pinned as boolean | undefined) ?? false,
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
  replyTo?: ReplyTo, driveFileId?: string
): Promise<void> {
  const { time, dateStr } = nowStrings();
  await addDoc(collection(db, "messages"), {
    userId, user, text: "📷 Image", imageUrl, time, dateStr,
    type: "image", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    driveFileId: driveFileId ?? null,
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
  const ref = doc(db, collPath, msgId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    // Delete file from Google Drive if it has one
    const driveFileId = data.driveFileId as string | undefined;
    if (driveFileId) {
      await fetch(`/api/delete-file/${driveFileId}`, { method: "DELETE" }).catch(() => { });
    }
  }
  await updateDoc(ref, {
    deletedForEveryone: true,
    text: "This message was deleted",
    imageUrl: null,
    fileUrl: null,
    driveFileId: null,
    type: "text",
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

export function getConversationId(myId: string, otherId: string): string {
  return getConvId(myId, otherId);
}

export async function getOrCreateConversation(
  myId: string, myName: string,
  otherId: string, otherName: string
): Promise<string> {
  const convId = getConvId(myId, otherId);
  // Don't create the doc here — it gets created on first message sent
  return convId;
}

export async function ensureConversationExists(
  convId: string, myId: string, myName: string,
  otherId: string, otherName: string
): Promise<void> {
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
}

export function listenConversations(userId: string, cb: (convs: Conversation[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "conversations"), snap => {
    const convs = snap.docs
      .filter(d => (d.data().participants as string[]).includes(userId))
      .map(d => ({ id: d.id, ...(d.data() as Omit<Conversation, "id">) }))
      .sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    cb(convs);
  });
}

export function listenPrivateMessages(convId: string, cb: (msgs: Message[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc")),
    snap => { cb(snap.docs.map(d => toMessage({ id: d.id, data: d.data.bind(d) }))); }
  );
}

export async function sendPrivateMessage(
  convId: string, userId: string, user: string, text: string,
  otherId: string, replyTo?: ReplyTo,
  otherName?: string
): Promise<void> {
  await ensureConversationExists(convId, userId, user, otherId, otherName ?? otherId);
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
  otherId: string, replyTo?: ReplyTo, driveFileId?: string
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const msgRef = collection(db, "conversations", convId, "messages");
  await addDoc(msgRef, {
    userId, user, text: "📷 Image", imageUrl, time, dateStr,
    type: "image", reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    driveFileId: driveFileId ?? null,
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

/* ══ DOCUMENT MESSAGES ══════════════════════════════════════ */
export async function sendDocumentMessage(
  userId: string, user: string,
  fileUrl: string, fileName: string, fileSize: string,
  replyTo?: ReplyTo,
  collPath = "messages",
  driveFileId?: string
): Promise<void> {
  const { time, dateStr } = nowStrings();
  await addDoc(collection(db, collPath), {
    userId, user,
    text: `📄 ${fileName}`,
    fileUrl, fileName, fileSize,
    driveFileId: driveFileId ?? null,
    time, dateStr,
    type: "document",
    reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendPrivateDocumentMessage(
  convId: string, userId: string, user: string,
  fileUrl: string, fileName: string, fileSize: string,
  otherId: string, replyTo?: ReplyTo, driveFileId?: string
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const msgRef = collection(db, "conversations", convId, "messages");
  await addDoc(msgRef, {
    userId, user,
    text: `📄 ${fileName}`,
    fileUrl, fileName, fileSize,
    driveFileId: driveFileId ?? null,
    time, dateStr,
    type: "document",
    reactions: {}, replyTo: replyTo ?? null,
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, "conversations", convId));
  const unread = (snap.data()?.unread as Record<string, number>) ?? {};
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: `📄 ${fileName}`, lastTime: time,
    lastTimestamp: Date.now(),
    unread: { ...unread, [otherId]: (unread[otherId] ?? 0) + 1 },
  });
}

/* ══ POLL MESSAGES ══════════════════════════════════════════ */
export async function sendPollMessage(
  userId: string, user: string,
  question: string, options: string[],
  multiChoice: boolean,
  collPath = "messages"
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const pollOptions = options.map((text, i) => ({ id: String(i), text, votes: [] }));
  await addDoc(collection(db, collPath), {
    userId, user,
    text: `📊 ${question}`,
    time, dateStr,
    type: "poll",
    poll: { question, options: pollOptions, multiChoice, closed: false, createdBy: userId },
    reactions: {},
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
}

export async function sendPrivatePollMessage(
  convId: string, userId: string, user: string,
  question: string, options: string[],
  multiChoice: boolean, otherId: string
): Promise<void> {
  const { time, dateStr } = nowStrings();
  const pollOptions = options.map((text, i) => ({ id: String(i), text, votes: [] }));
  const msgRef = collection(db, "conversations", convId, "messages");
  await addDoc(msgRef, {
    userId, user,
    text: `📊 ${question}`,
    time, dateStr,
    type: "poll",
    poll: { question, options: pollOptions, multiChoice, closed: false, createdBy: userId },
    reactions: {},
    deletedFor: [], deletedForEveryone: false,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db, "conversations", convId));
  const unread = (snap.data()?.unread as Record<string, number>) ?? {};
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: `📊 ${question}`, lastTime: time,
    lastTimestamp: Date.now(),
    unread: { ...unread, [otherId]: (unread[otherId] ?? 0) + 1 },
  });
}

export async function voteOnPoll(
  msgId: string, optionId: string,
  userId: string, multiChoice: boolean,
  currentOptions: import("./types").PollOption[],
  collPath = "messages"
): Promise<void> {
  let updated = currentOptions.map(opt => {
    let votes = [...opt.votes];
    if (!multiChoice) {
      // single choice — remove from all first
      votes = votes.filter(v => v !== userId);
    }
    if (opt.id === optionId) {
      if (votes.includes(userId)) {
        votes = votes.filter(v => v !== userId); // unvote
      } else {
        votes.push(userId);
      }
    }
    return { ...opt, votes };
  });
  await updateDoc(doc(db, collPath, msgId), { "poll.options": updated });
}

export async function voteOnPrivatePoll(
  convId: string, msgId: string, optionId: string,
  userId: string, multiChoice: boolean,
  currentOptions: import("./types").PollOption[]
): Promise<void> {
  await voteOnPoll(msgId, optionId, userId, multiChoice, currentOptions, `conversations/${convId}/messages`);
}

export async function closePoll(msgId: string, collPath = "messages"): Promise<void> {
  await updateDoc(doc(db, collPath, msgId), { "poll.closed": true });
}

export async function closePrivatePoll(convId: string, msgId: string): Promise<void> {
  await closePoll(msgId, `conversations/${convId}/messages`);
}

/* ══ PIN / UNPIN ════════════════════════════════════════════ */
export async function pinMessage(msgId: string, collPath = "messages"): Promise<void> {
  await updateDoc(doc(db, collPath, msgId), { pinned: true });
}

export async function unpinMessage(msgId: string, collPath = "messages"): Promise<void> {
  await updateDoc(doc(db, collPath, msgId), { pinned: false });
}

/* ══ MUTE ════════════════════════════════════════════════════ */
export async function muteConversation(
  convId: string, userId: string, until: number | null
): Promise<void> {
  await updateDoc(doc(db, "conversations", convId), {
    [`muted.${userId}`]: { until },
  });
}

export async function unmuteConversation(
  convId: string, userId: string
): Promise<void> {
  const { deleteField } = await import("firebase/firestore");
  await updateDoc(doc(db, "conversations", convId), {
    [`muted.${userId}`]: deleteField(),
  });
}

export function isConversationMuted(
  conv: { muted?: Record<string, { until: number | null }> },
  userId: string
): boolean {
  const m = conv.muted?.[userId];
  if (!m) return false;
  if (m.until === null) return true; // muted forever
  return Date.now() < m.until;
}

/* ══ FCM TOKEN ═══════════════════════════════════════════════ */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), { fcmToken: token });
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string; position?: string }
): Promise<void> {
  await updateDoc(doc(db, "users", userId), data);
}

export async function deleteConversation(convId: string): Promise<void> {
  const msgsSnap = await getDocs(collection(db, "conversations", convId, "messages"));
  for (const msgDoc of msgsSnap.docs) {
    await deleteDoc(doc(db, "conversations", convId, "messages", msgDoc.id));
  }
  await deleteDoc(doc(db, "conversations", convId));
}