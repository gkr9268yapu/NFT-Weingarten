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

export interface Message {
  id: string;
  user: string;
  text: string;
  time: string;
  reactions: Reactions;
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
