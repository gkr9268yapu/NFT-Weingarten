import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export async function uploadChatFile(
    file: File,
    userId: string
): Promise<{ url: string; fileName: string; fileSize: string }> {
    const ext = file.name.split(".").pop() ?? "";
    const fileName = file.name;
    const path = `chat/${userId}/${Date.now()}_${fileName}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);

    const bytes = file.size;
    const fileSize = bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    return { url, fileName, fileSize };
}

export async function deleteChatFile(url: string): Promise<void> {
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (err) {
        console.warn("Chat file delete warning:", err);
    }
}