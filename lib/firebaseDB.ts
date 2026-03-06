import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Match, Message, User } from "./types";

/* ══════════════════════════════════════════════════════════
   USERS
══════════════════════════════════════════════════════════ */

/** Real-time listener — all users */
export function listenUsers(cb: (users: User[]) => void): Unsubscribe {
  return onSnapshot(collection(db, "users"), snap => {
    cb(snap.docs.map(d => ({ ...(d.data() as Omit<User,"password">), password: "" })));
  });
}

/** Delete a user document (host action) */
export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

/* ══════════════════════════════════════════════════════════
   MATCHES
══════════════════════════════════════════════════════════ */

/** Real-time listener — all matches */
export function listenMatches(cb: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "matches"), orderBy("date", "asc")),
    snap => {
      cb(
        snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<Match, "id">),
        }))
      );
    }
  );
}

/** Create a new match */
export async function createMatch(data: Omit<Match, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "matches"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update any fields of a match */
export async function updateMatch(
  id: string,
  data: Partial<Omit<Match, "id">>
): Promise<void> {
  await updateDoc(doc(db, "matches", id), data);
}

/** Delete a match */
export async function deleteMatch(id: string): Promise<void> {
  await deleteDoc(doc(db, "matches", id));
}

/** Toggle a player's availability on a match */
export async function setAvailability(
  matchId: string,
  playerName: string,
  status: "available" | "notAvailable",
  current: Pick<Match, "available" | "notAvailable">
): Promise<void> {
  const avail    = current.available.filter(n => n !== playerName);
  const notAvail = current.notAvailable.filter(n => n !== playerName);

  await updateDoc(doc(db, "matches", matchId), {
    available:    status === "available"    ? [...avail, playerName] : avail,
    notAvailable: status === "notAvailable" ? [...notAvail, playerName] : notAvail,
  });
}

/* ══════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════ */

/** Real-time listener — ordered by time */
export function listenMessages(cb: (msgs: Message[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "messages"), orderBy("createdAt", "asc")),
    snap => {
      cb(
        snap.docs.map(d => {
          const data = d.data();
          return {
            id:        d.id,
            user:      data.user      as string,
            text:      data.text      as string,
            time:      data.time      as string,
            reactions: (data.reactions ?? {}) as Record<string, string[]>,
          };
        })
      );
    }
  );
}

/** Send a new message */
export async function sendMessage(
  user: string,
  text: string
): Promise<void> {
  const now = new Date();
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  await addDoc(collection(db, "messages"), {
    user,
    text,
    time,
    reactions: {},
    createdAt: serverTimestamp(),
  });
}

/** Toggle an emoji reaction on a message */
export async function toggleReaction(
  msgId: string,
  emoji: string,
  userName: string,
  current: Record<string, string[]>
): Promise<void> {
  const list = [...(current[emoji] ?? [])];
  const idx  = list.indexOf(userName);
  if (idx >= 0) list.splice(idx, 1); else list.push(userName);

  const updated = { ...current, [emoji]: list };
  if (updated[emoji].length === 0) delete updated[emoji];

  await updateDoc(doc(db, "messages", msgId), { reactions: updated });
}

/* ══════════════════════════════════════════════════════════
   SEED (optional one-time helper)
   Call seedInitialData() once from the browser console if
   your Firestore is empty, to pre-populate demo data.
══════════════════════════════════════════════════════════ */
export async function seedInitialData(): Promise<void> {
  const matchSnap = await getDocs(collection(db, "matches"));
  if (!matchSnap.empty) { console.log("Already seeded"); return; }

  await addDoc(collection(db, "matches"), {
    title:       "Saturday Morning Game",
    team1:       "Frankfurt FC",
    team2:       "Night FC",
    date:        "2026-03-07",
    time:        "10:00",
    venue:       "Central Park Field A",
    coach:       "Coach Mike",
    description: "Weekly Saturday game. Bring your boots!",
    image:       "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop",
    expiryDate:  "2026-12-31",
    available:   [],
    notAvailable:[],
    createdAt:   serverTimestamp(),
  });

  const msgSnap = await getDocs(collection(db, "messages"));
  if (!msgSnap.empty) { console.log("Messages already seeded"); return; }

  const seedMsgs = [
    { user: "Coach Mike",  text: "Hey team! Looking forward to the game!", time: "17:03" },
    { user: "John Player", text: "Hello team! Ready for the next match?",  time: "17:05" },
    { user: "Coach Mike",  text: "Training starts at 7 PM sharp!",          time: "17:05" },
    { user: "Govind",      text: "hi",                                       time: "17:08" },
  ];
  for (const m of seedMsgs) {
    await addDoc(collection(db, "messages"), { ...m, reactions: {}, createdAt: serverTimestamp() });
  }

  console.log("Seeded successfully!");
}
