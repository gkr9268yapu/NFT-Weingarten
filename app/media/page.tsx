"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import Navbar from "@/components/Navbar";
import type { MediaItem } from "@/lib/types";
import CheckSquareIcon from "@/components/icons/CheckSquareIcon";

export default function MediaPage() {
  const { currentUser, mediaItems, users, loading } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);

  const handleDriveSync = async () => {
    setSyncing(true);
    try { await fetch("/api/drive-sync", { method: "POST" }); }
    finally { setSyncing(false); }
  };

  // Selection permission logic
  const selectedItems = mediaItems.filter(m => selected.has(m.id));
  const mySelected = selectedItems.filter(m => m.uploader === currentUser?.name);
  const othersSelected = selectedItems.filter(m => m.uploader !== currentUser?.name);
  const isHost = currentUser?.role === "host";
  const canDownloadSel = isHost || selectedItems.length > 0;
  const canDeleteSelected = isHost || (mySelected.length === selectedItems.length && selectedItems.length > 0 && othersSelected.length === 0);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src="/logo.png" alt="NFT Weingarten" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", animation: "pulse 1.2s infinite" }} />
    </div>  );
  if (!currentUser) { router.push("/"); return null; }

  const uploadOne = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("uploader", currentUser.name);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadErr("");
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadOne(files[i]);
        setUploadProgress({ done: i + 1, total: files.length });
        if (i < files.length - 1) await new Promise(res => setTimeout(res, 1500));
      }
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  const handleDownload = (item: MediaItem) => {
    window.open(
      `https://drive.google.com/uc?export=download&id=${item.driveFileId}&confirm=t`,
      "_blank"
    );
  };

  const isMobile = typeof window !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleBulkDownload = async () => {
    const items = mediaItems.filter(m => selected.has(m.id));
    setDownloading(true);
    try {
      if (isMobile) {
        // Mobile — create zip file
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const folder = zip.folder("NFT-Weingarten-photos")!;

        for (const item of items) {
          const fileId = item.driveFileId ?? item.url.split("/api/image/")[1];
          if (!fileId) continue;
          try {
            const res = await fetch(`/api/image/${fileId}`);
            const blob = await res.blob();
            const ext = item.filename?.split(".").pop() ?? "jpg";
            folder.file(`${item.filename ?? fileId}.${ext}`, blob);
          } catch {
            console.warn("Failed to fetch:", fileId);
          }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "NFT-Weingarten-photos.zip";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

      } else {
        // Desktop — download individually
        for (const item of items) {
          const fileId = item.driveFileId ?? item.url.split("/api/image/")[1];
          if (!fileId) continue;
          const name = encodeURIComponent(item.filename ?? "image");
          const a = document.createElement("a");
          a.href = `/api/image/${fileId}?download=1&name=${name}`;
          a.download = item.filename ?? "image";
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise(res => setTimeout(res, 800));
        }
      }
    } finally {
      setDownloading(false);
      setSelectMode(false);
      setSelected(new Set());
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Delete "${item.filename}"? This removes it from Drive permanently.`)) return;
    setDeleting(item.id);
    if (preview?.id === item.id) setPreview(null);
    try {
      const res = await fetch("/api/delete-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: item.id, driveFileId: item.driveFileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(mediaItems.map(m => m.id)));
  const cancelSelect = () => { setSelectMode(false); setSelected(new Set()); };

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 28px" }} className="page-main">

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 50, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", lineHeight: 1 }}>
              Media <span style={{ color: "#00e676" }}>Gallery</span>
            </h1>
            <p style={{ color: "rgba(255,255,255,.38)", marginTop: 8 }}>
              {mediaItems.length} image{mediaItems.length !== 1 ? "s" : ""} · stored in Google Drive
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>

            {!selectMode ? (
              <>
                {/* Drive link — all users */}
                <a href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ?? ""}`}
                  target="_blank" rel="noreferrer" title="Open Google Drive"
                  style={{ background: "rgba(66,133,244,.12)", border: "1px solid rgba(66,133,244,.35)", color: "#4285f4", padding: "12px 14px", borderRadius: 12, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  📁
                </a>
                {/* Drive sync — host only */}
                {isHost && (
                  <button onClick={handleDriveSync} disabled={syncing} title="Sync from Drive"
                    style={{ background: "rgba(66,133,244,.08)", border: "1px solid rgba(66,133,244,.2)", color: "#4285f4", padding: "12px 14px", borderRadius: 12, fontSize: 18, cursor: "pointer" }}>
                    {syncing ? "⏳" : "🔄"}
                  </button>
                )}
                {mediaItems.length > 0 && (
                  <button onClick={() => setSelectMode(true)}
                    style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckSquareIcon width={16} height={16} /> Select
                  </button>
                )}
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ background: uploading ? "rgba(0,230,118,.4)" : "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", border: "none", padding: "13px 26px", borderRadius: 12, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, boxShadow: "0 4px 20px rgba(0,230,118,.3)", display: "flex", alignItems: "center", gap: 8 }}>
                  {uploading ? (
                    <>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(7,13,26,.4)", borderTopColor: "#070d1a", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                      {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total} Uploading…` : "Uploading…"}
                    </>
                  ) : "+ Upload Image"}
                </button>
              </>
            ) : (
              /* Select mode toolbar */
              <>
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>{selected.size} selected</span>
                <button onClick={selectAll}
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#fff", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  All
                </button>
                {canDownloadSel && (
                  <button onClick={handleBulkDownload} disabled={selected.size === 0 || downloading}
                    style={{ background: selected.size === 0 ? "rgba(0,230,118,.2)" : "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: selected.size === 0 ? "default" : "pointer", opacity: selected.size === 0 ? 0.5 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                    {downloading ? (isMobile ? "Creating zip…" : "Downloading…") : "⬇ Download"}
                  </button>
                )}
                  {canDeleteSelected && (
                    <button onClick={() => setBulkDeleteModal(true)}
                    style={{ background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    🗑 Delete
                  </button>
                )}
                <button onClick={cancelSelect}
                  style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
              </>
            )}

            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{ display: "none" }} />
          </div>
        </div>

        {/* Upload progress bar */}
        {uploadProgress && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>Uploading {uploadProgress.done} of {uploadProgress.total} images…</span>
              <span style={{ color: "#00e676", fontSize: 13, fontWeight: 700 }}>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
            </div>
            <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 4 }}>
              <div style={{ height: "100%", width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, background: "linear-gradient(90deg,#00e676,#00c853)", borderRadius: 4, transition: "width .3s" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {uploadErr && (
          <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 24, background: "rgba(255,82,82,.1)", border: "1px solid rgba(255,82,82,.2)", color: "#ff5252", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠ {uploadErr}</span>
            <button onClick={() => setUploadErr("")} style={{ background: "none", border: "none", color: "#ff5252", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .media-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }
          .media-card { cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
          .media-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,230,118,0.12); }
          .media-card:hover .preview-hint { opacity: 1 !important; }
          @media (max-width: 768px) {
            .media-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
            .media-card-info { display: none !important; }
            .media-card-img { height: 110px !important; border-radius: 10px !important; }
            .media-card { border-radius: 10px !important; }
          }
          @media (max-width: 400px) {
            .media-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; }
            .media-card-img { height: 90px !important; }
          }
        `}</style>

        {/* Grid */}
        {mediaItems.length === 0 ? (
          <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed rgba(255,255,255,.1)", borderRadius: 24, padding: "100px 0", textAlign: "center", cursor: "pointer", background: "rgba(255,255,255,.01)" }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>📷</div>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 18, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
              No images yet — click to upload
            </p>
          </div>
        ) : (
          <div className="media-grid">
            {mediaItems.map(item => {
              const isSelected = selected.has(item.id);
              return (
                <div key={item.id} className="media-card"
                  onClick={() => {
                    if (selectMode) { toggleSelect(item.id); return; }
                    setPreview(item);
                  }}
                  style={{ background: "rgba(255,255,255,.025)", border: `1px solid ${isSelected ? "rgba(0,230,118,.4)" : "rgba(255,255,255,.07)"}`, borderRadius: 18, overflow: "hidden", position: "relative", outline: isSelected ? "2px solid #00e676" : "none" }}
                >
                  {/* Select checkbox */}
                  {selectMode && (
                    <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3, width: 22, height: 22, borderRadius: "50%", border: `2px solid ${isSelected ? "#00e676" : "rgba(255,255,255,.5)"}`, background: isSelected ? "#00e676" : "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#070d1a", fontWeight: 800 }}>
                      {isSelected && "✓"}
                    </div>
                  )}

                  {/* Image */}
                  <div className="media-card-img" style={{ height: 200, position: "relative", background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                    {imgErrors.has(item.id) ? (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "rgba(255,255,255,.2)" }}>
                        <span style={{ fontSize: 28 }}>🖼</span>
                        <span style={{ fontSize: 11 }}>Loading…</span>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.filename}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={() => setImgErrors(prev => new Set(prev).add(item.id))} />
                    )}

                    {!selectMode && (
                      <div className="preview-hint" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}>
                        <span style={{ fontSize: 32 }}>🔍</span>
                      </div>
                    )}

                    {currentUser.role === "host" && !selectMode && (
                      <button onClick={e => { e.stopPropagation(); handleDelete(item); }} disabled={deleting === item.id}
                        style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,82,82,.8)", border: "none", color: "#fff", padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, opacity: deleting === item.id ? .5 : 1, zIndex: 2 }}>
                        {deleting === item.id ? "…" : "🗑"}
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="media-card-info" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const uploader = users.find(u => u.name === item.uploader);
                      return uploader?.photoURL ? (
                        <img src={uploader.photoURL} alt={item.uploader}
                          style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0070ff,#00e676)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, color: "#fff" }}>
                          {item.uploader[0]}
                        </div>
                      );
                    })()}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.uploader}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{item.date}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PREVIEW MODAL */}
      {preview && !selectMode && (
        <div onClick={() => setPreview(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.92)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <button onClick={() => setPreview(null)} style={{ position: "absolute", top: -16, right: -16, zIndex: 10, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
            <img src={preview.url} alt={preview.filename} style={{ maxWidth: "88vw", maxHeight: "75vh", objectFit: "contain", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,.8)" }} />
            <div style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, width: "100%", maxWidth: 500, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {(() => {
                  const uploader = users.find(u => u.name === preview.uploader);
                  return uploader?.photoURL ? (
                    <img src={uploader.photoURL} alt={preview.uploader}
                      style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0070ff,#00e676)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0 }}>
                      {preview.uploader[0]}
                    </div>
                  );
                })()}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{preview.uploader}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{preview.date}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleDownload(preview)} style={{ background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>⬇ Download</button>
                {currentUser.role === "host" && (
                  <button onClick={() => handleDelete(preview)} style={{ background: "rgba(255,82,82,.15)", border: "1px solid rgba(255,82,82,.3)", color: "#ff5252", padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🗑 Delete</button>
                )}
              </div>
            </div>
            {mediaItems.length > 1 && (() => {
              const idx = mediaItems.findIndex(m => m.id === preview.id);
              const prev = mediaItems[idx - 1];
              const next = mediaItems[idx + 1];
              return (
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button onClick={() => prev && setPreview(prev)} disabled={!prev} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: prev ? "#fff" : "rgba(255,255,255,.2)", padding: "9px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: prev ? "pointer" : "default" }}>← Prev</button>
                  <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13, alignSelf: "center" }}>{idx + 1} / {mediaItems.length}</span>
                  <button onClick={() => next && setPreview(next)} disabled={!next} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: next ? "#fff" : "rgba(255,255,255,.2)", padding: "9px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: next ? "pointer" : "default" }}>Next →</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bulk delete modal */}
      {bulkDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#0e1828", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>🗑️</div>
            <h3 style={{ color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, textAlign: "center", marginBottom: 8 }}>
              Delete {selected.size} image{selected.size > 1 ? "s" : ""}?
            </h3>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
              This will permanently delete {selected.size > 1 ? "these images" : "this image"} from Google Drive and cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBulkDeleteModal(false)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={async () => {
                setBulkDeleteModal(false);
                for (const item of selectedItems) {
                  setDeleting(item.id);
                  try {
                    await fetch("/api/delete-media", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ docId: item.id, driveFileId: item.driveFileId }),
                    });
                  } catch (err) { console.error(err); }
                }
                setDeleting(null);
                cancelSelect();
              }}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid rgba(255,82,82,.3)", background: "rgba(255,82,82,.15)", color: "#ff5252", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}