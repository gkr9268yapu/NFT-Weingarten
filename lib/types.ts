export type Role = "user" | "host";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  verified: boolean;
}

export interface Match {
  id: string;
  title: string;
  team1: string;
  team2: string;
  date: string;
  time: string;
  venue: string;
  coach: string;
  description: string;
  image: string;
  expiryDate: string;
  available: string[];
  notAvailable: string[];
}

export type Reactions = Record<string, string[]>;

export interface ReplyTo {
  id: string;
  user: string;
  text: string;
  type: "text" | "image";
}

export interface Message {
  id: string;
  userId: string;
  user: string;
  text: string;
  time: string;
  dateStr: string;
  type: "text" | "image";
  imageUrl?: string;
  reactions: Reactions;
  replyTo?: ReplyTo;
  deletedFor: string[];
  deletedForEveryone: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastTime: string;
  lastTimestamp: number;
  unread: Record<string, number>;
}

export interface MediaItem {
  id: string;
  url: string;
  uploader: string;
  date: string;
  filename: string;
  driveFileId: string;
}

export type Page = "home" | "media" | "chat";