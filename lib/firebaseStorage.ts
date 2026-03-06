// Media metadata is now stored in Firestore.
// Actual images are stored in Google Drive via /api/upload.
// This file only provides the real-time Firestore listener for media items.

import {
  collection,
  onSnapshot,
  query,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MediaItem } from "./types";

/** Real-time listener — all media items (metadata from Firestore) */
export function listenMedia(cb: (items: MediaItem[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "media"), orderBy("createdAt", "desc")),
    snap => {
      cb(
        snap.docs.map(d => ({
          id:       d.id,
          url:      d.data().url      as string,
          uploader: d.data().uploader as string,
          filename: d.data().filename as string,
          date:     d.data().date     as string,
          driveFileId: d.data().driveFileId as string ?? "",
        }))
      );
    }
  );
}
