import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { isHostEmail } from "./hostEmails";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Role, User } from "./types";

/* ── Sign up ──────────────────────────────────────────────── */
export async function signUp(
  name: string,
  email: string,
  password: string,
  role: Role,
): Promise<void> {
  const assignedRole: Role = isHostEmail(email) ? "host" : "user"; // ← add this

  const cred = await createUserWithEmailAndPassword(auth, email, password);

  await sendEmailVerification(cred.user);

  await setDoc(doc(db, "users", cred.user.uid), {
    id: cred.user.uid,
    name,
    email,
    role: assignedRole,  // ← change from `role` to `role: assignedRole`
    verified: false,
  } satisfies Omit<User, "password">);
}
/* ── Log in ───────────────────────────────────────────────── */
export async function logIn(
  email: string,
  password: string,
  expectedRole: Role
): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));

  if (!snap.exists()) throw new Error("User profile not found.");

  const profile = snap.data() as Omit<User, "password">;

  if (profile.role !== expectedRole) {
    await signOut(auth);
    throw new Error(`Wrong role selected. You are registered as "${profile.role}".`);
  }

  return { ...profile, password: "" };   // never expose password client-side
}

/* ── Log out ──────────────────────────────────────────────── */
export async function logOut(): Promise<void> {
  await signOut(auth);
}

/* ── Auth state listener ──────────────────────────────────── */
export function listenAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) { callback(null); return; }

    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!snap.exists()) { callback(null); return; }

    callback({ ...(snap.data() as Omit<User, "password">), password: "" });
  });
}

/* ── Fetch full profile by UID ────────────────────────────── */
export async function fetchUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<User, "password">), password: "" };
}
