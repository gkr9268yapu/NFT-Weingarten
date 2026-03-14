"use client";
import React, {
  createContext, useContext, useState,
  useEffect, useRef, ReactNode,
} from "react";
import type { User, Match, Message, MediaItem } from "./types";
import { listenAuthState } from "./firebaseAuth";
import { listenUsers, listenMatches, listenMessages, listenConversations } from "./firebaseDB";
import { listenMedia } from "./firebaseStorage";

interface AppContextValue {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  users: User[];
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  messages: Message[];
  mediaItems: MediaItem[];
  loading: boolean;
  totalUnread: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  // Holds the unsub functions for the Firestore data listeners
  const dataUnsubs = useRef<(() => void)[]>([]);

  const stopDataListeners = () => {
    dataUnsubs.current.forEach(fn => fn());
    dataUnsubs.current = [];
    // Clear data so stale values don't flash on next login
    setUsers([]);
    setMatches([]);
    setMessages([]);
    setMediaItems([]);
  };

  const startDataListeners = (userId: string) => {
    if (dataUnsubs.current.length > 0) return;
    dataUnsubs.current = [
      listenUsers(setUsers),
      listenMatches(setMatches),
      listenMessages(setMessages),
      listenMedia(setMediaItems),
      listenConversations(userId, convs => {
        const total = convs.reduce((sum, c) => sum + ((c.unread?.[userId] ?? 0)), 0);
        setTotalUnread(total);
      }),
    ];
  };

  useEffect(() => {
    // Auth listener — starts/stops Firestore listeners based on sign-in state
    const unsubAuth = listenAuthState(user => {
      if (user) {
        setCurrentUser(user);
        startDataListeners(user.id);
        import("./notifications").then(({ initPushNotifications }) => {
          initPushNotifications(user.id).catch(console.error);
        });
      } else {
        setCurrentUser(null);
        stopDataListeners();
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      stopDataListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      users,
      matches, setMatches,
      messages,
      mediaItems,
      loading,
      totalUnread,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}