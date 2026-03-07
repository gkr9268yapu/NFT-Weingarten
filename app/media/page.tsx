"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import Navbar from "@/components/Navbar";
import type { MediaItem } from "@/lib/types";

export default function MediaPage() {
  const { currentUser, mediaItems, loading } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!loading && !currentUser) router.push("/");
  }, [loading, currentUser, router]);

  if (loading || !currentUser) return (
    <div style={{ minHeight: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>⚽</div>
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("uploader", currentUser.name);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
    } catch (err: unknown) {
      setUploadErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = (item: MediaItem) => {
    window.open(
      `https://drive.google.com/uc?export=download&id=${item.driveFileId}&confirm=t`,
      "_blank"
    );
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
            <p style={{ color: "rgba(255,255,255,.38)", marginTop: 8 }}>Tap any image to preview · stored in Google Drive</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {currentUser.role === "host" && (
              <a href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ?? ""}`}
                target="_blank" rel="noreferrer"
                style={{ background: "rgba(66,133,244,.12)", border: "1px solid rgba(66,133,244,.35)", color: "#4285f4", padding: "12px 18px", borderRadius: 12, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
              >📁 Open Drive</a>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              background: uploading ? "rgba(0,230,118,.4)" : "linear-gradient(135deg,#00e676,#00c853)",
              color: "#070d1a", border: "none", padding: "13px 26px", borderRadius: 12,
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16,
              boxShadow: "0 4px 20px rgba(0,230,118,.3)", display: "flex", alignItems: "center", gap: 8,
            }}>
              {uploading ? (
                <><span style={{ width: 16, height: 16, border: "2px solid rgba(7,13,26,.4)", borderTopColor: "#070d1a", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Uploading…</>
              ) : "+ Upload Image"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
          </div>
        </div>

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

          .media-card {
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .media-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,230,118,0.12);
          }
          .media-card:hover .preview-hint {
            opacity: 1 !important;
          }

          @media (max-width: 768px) {
            .media-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8px !important;
            }
            .media-card-info {
              display: none !important;
            }
            .media-card-img {
              height: 110px !important;
              border-radius: 10px !important;
            }
            .media-card {
              border-radius: 10px !important;
            }
          }

          @media (max-width: 400px) {
            .media-grid {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 6px !important;
            }
            .media-card-img {
              height: 90px !important;
            }
          }
        `}</style>

        {/* Grid */}
        {mediaItems.length === 0 ? (
          <div onClick={() => fileRef.current?.click()} style={{
            border: "2px dashed rgba(255,255,255,.1)", borderRadius: 24,
            padding: "100px 0", textAlign: "center", cursor: "pointer",
            background: "rgba(255,255,255,.01)",
          }}>
            <div style={{ fontSize: 52, marginBottom: 18 }}>📷</div>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 18, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>
              No images yet — click to upload the first one
            </p>
          </div>
        ) : (
          <div className="media-grid">
            {mediaItems.map(item => (
              <div
                key={item.id}
                className="media-card"
                onClick={() => setPreview(item)}
                style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden" }}
              >
                {/* Image */}
                <div className="media-card-img" style={{ height: 200, position: "relative", background: "rgba(255,255,255,.04)", overflow: "hidden" }}>
                  {imgErrors.has(item.id) ? (
                    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "rgba(255,255,255,.2)" }}>
                      <span style={{ fontSize: 28 }}>🖼</span>
                      <span style={{ fontSize: 11 }}>Loading…</span>
                    </div>
                  ) : (
                    <img
                      src={item.url}
                      alt={item.filename}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={() => setImgErrors(prev => new Set(prev).add(item.id))}
                    />
                  )}

                  {/* Preview hint overlay */}
                  <div className="preview-hint" style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,.45)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: 0, transition: "opacity .2s",
                  }}>
                    <span style={{ fontSize: 32 }}>🔍</span>
                  </div>

                  {/* Host delete */}
                  {currentUser.role === "host" && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(item); }}
                      disabled={deleting === item.id}
                      style={{
                        position: "absolute", top: 8, left: 8,
                        background: "rgba(255,82,82,.8)", border: "none", color: "#fff",
                        padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                        opacity: deleting === item.id ? .5 : 1, zIndex: 2,
                      }}
                    >{deleting === item.id ? "…" : "🗑"}</button>
                  )}
                </div>

                {/* Info — hidden on mobile */}
                <div className="media-card-info" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0070ff,#00e676)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0, color: "#fff" }}>
                    {item.uploader[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.uploader}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{item.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── PREVIEW MODAL ─────────────────────────────── */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 400,
            background: "rgba(0,0,0,.92)", backdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

            {/* Close button */}
            <button onClick={() => setPreview(null)} style={{
              position: "absolute", top: -16, right: -16, zIndex: 10,
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)",
              color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>✕</button>

            {/* Image */}
            <img
              src={preview.url}
              alt={preview.filename}
              style={{
                maxWidth: "88vw", maxHeight: "75vh",
                objectFit: "contain", borderRadius: 16,
                boxShadow: "0 24px 80px rgba(0,0,0,.8)",
              }}
            />

            {/* Info bar */}
            <div style={{
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 14, padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 20, width: "100%", maxWidth: 500, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0070ff,#00e676)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0 }}>
                  {preview.uploader[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{preview.uploader}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{preview.date}</div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleDownload(preview)} style={{
                  background: "linear-gradient(135deg,#00e676,#00c853)", color: "#070d1a",
                  border: "none", padding: "10px 18px", borderRadius: 10,
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}>⬇ Download</button>

                {currentUser.role === "host" && (
                  <button onClick={() => handleDelete(preview)} style={{
                    background: "rgba(255,82,82,.15)", border: "1px solid rgba(255,82,82,.3)",
                    color: "#ff5252", padding: "10px 16px", borderRadius: 10,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>🗑 Delete</button>
                )}
              </div>
            </div>

            {/* Prev / Next navigation */}
            {mediaItems.length > 1 && (() => {
              const idx = mediaItems.findIndex(m => m.id === preview.id);
              const prev = mediaItems[idx - 1];
              const next = mediaItems[idx + 1];
              return (
                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <button
                    onClick={() => prev && setPreview(prev)}
                    disabled={!prev}
                    style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: prev ? "#fff" : "rgba(255,255,255,.2)", padding: "9px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: prev ? "pointer" : "default" }}
                  >← Prev</button>
                  <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13, alignSelf: "center" }}>
                    {idx + 1} / {mediaItems.length}
                  </span>
                  <button
                    onClick={() => next && setPreview(next)}
                    disabled={!next}
                    style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: next ? "#fff" : "rgba(255,255,255,.2)", padding: "9px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: next ? "pointer" : "default" }}
                  >Next →</button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}