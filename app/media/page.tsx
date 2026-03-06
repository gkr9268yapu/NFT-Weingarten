"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApp } from "@/lib/AppContext";
import Navbar from "@/components/Navbar";
import type { MediaItem } from "@/lib/types";

export default function MediaPage() {
  const { currentUser, mediaItems, loading } = useApp();
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#070d1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48 }}>⚽</div>
  );
  if (!currentUser) { router.push("/"); return null; }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file",     file);
      form.append("uploader", currentUser.name);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      // Firestore real-time listener auto-updates the gallery
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
      <main style={{ maxWidth:1140, margin:"0 auto", padding:"48px 28px" }}>

        {/* Header */}
        <div className="fade-in" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:36 }}>
          <div>
            <h1 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:50, fontWeight:900, letterSpacing:1, textTransform:"uppercase", lineHeight:1 }}>
              Media <span style={{ color:"#00e676" }}>Gallery</span>
            </h1>
            <p style={{ color:"rgba(255,255,255,.38)", marginTop:8 }}>Match photos · stored in Google Drive</p>
          </div>

          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            {/* Host: open the Drive folder directly */}
            {currentUser.role === "host" && (
              <a
                href={`https://drive.google.com/drive/folders/${process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID ?? ""}`}
                target="_blank" rel="noreferrer"
                style={{ background:"rgba(66,133,244,.12)", border:"1px solid rgba(66,133,244,.35)", color:"#4285f4", padding:"12px 18px", borderRadius:12, fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:8 }}
              >📁 Open Drive</a>
            )}

            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              background: uploading ? "rgba(0,230,118,.4)" : "linear-gradient(135deg,#00e676,#00c853)",
              color:"#070d1a", border:"none", padding:"13px 26px", borderRadius:12,
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:16,
              boxShadow:"0 4px 20px rgba(0,230,118,.3)", transition:"all .2s",
              display:"flex", alignItems:"center", gap:8,
            }}>
              {uploading ? (
                <>
                  <span style={{ width:16, height:16, border:"2px solid rgba(7,13,26,.4)", borderTopColor:"#070d1a", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />
                  Uploading…
                </>
              ) : "+ Upload Image"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }} />
          </div>
        </div>

        {/* Error banner */}
        {uploadErr && (
          <div style={{ padding:"12px 16px", borderRadius:10, marginBottom:24, background:"rgba(255,82,82,.1)", border:"1px solid rgba(255,82,82,.2)", color:"#ff5252", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>⚠ {uploadErr}</span>
            <button onClick={() => setUploadErr("")} style={{ background:"none", border:"none", color:"#ff5252", cursor:"pointer", fontSize:18 }}>✕</button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Gallery grid */}
        <div className="fade-in">
          {mediaItems.length === 0 ? (
            <div className="upload-zone" onClick={() => fileRef.current?.click()} style={{
              border:"2px dashed rgba(255,255,255,.1)", borderRadius:24,
              padding:"100px 0", textAlign:"center", cursor:"pointer",
              background:"rgba(255,255,255,.01)",
            }}>
              <div style={{ fontSize:52, marginBottom:18 }}>📷</div>
              <p style={{ color:"rgba(255,255,255,.35)", fontSize:18, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1 }}>
                No images yet — click to upload the first one
              </p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:24 }}>
              {mediaItems.map(item => (
                <div key={item.id} className="card" style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:18, overflow:"hidden" }}>
                  <div style={{ height:220, position:"relative", background:"rgba(255,255,255,.04)" }}>
                    {imgErrors.has(item.id) ? (
                      <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, color:"rgba(255,255,255,.2)" }}>
                        <span style={{ fontSize:36 }}>🖼</span>
                        <span style={{ fontSize:12 }}>Loading from Drive…</span>
                      </div>
                    ) : (
                      <Image src={item.url} alt={item.filename} fill style={{ objectFit:"cover" }} unoptimized
                        onError={() => setImgErrors(prev => new Set(prev).add(item.id))}
                      />
                    )}
                    <button onClick={() => handleDownload(item)} style={{
                      position:"absolute", top:10, right:10,
                      background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)",
                      border:"1px solid rgba(255,255,255,.2)", color:"#fff",
                      padding:"6px 13px", borderRadius:8, fontSize:12, fontWeight:700,
                    }}>⬇ Download</button>
                    {currentUser.role === "host" && (
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleting === item.id}
                        style={{
                          position: "absolute", top: 10, left: 10,
                          background: "rgba(255,82,82,.75)", backdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,82,82,.5)", color: "#fff",
                          padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          opacity: deleting === item.id ? .5 : 1,
                        }}>
                        {deleting === item.id ? "…" : "🗑 Delete"}
                      </button>
                    )}
                  </div>
                  <div style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#0070ff,#00e676)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>
                      {item.uploader[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{item.uploader}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{item.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
