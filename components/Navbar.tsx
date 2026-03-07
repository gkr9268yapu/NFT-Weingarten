"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { logOut } from "@/lib/firebaseAuth";

const LINKS = [
  { href: "/home", icon: "🏠", label: "Home" },
  { href: "/media", icon: "📷", label: "Media" },
  { href: "/chat", icon: "💬", label: "Chat" },
] as const;

export default function Navbar() {
  const { currentUser, setCurrentUser } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    setOpen(false);
    try { router.push("/"); await logOut(); setCurrentUser(null); }
    catch (e) { console.error("Logout error:", e); }
  };

  return (
    <>
      {/* ── DESKTOP NAV ─────────────────────────────── */}
      <nav className="desktop-nav" style={{
        background: "rgba(7,13,26,0.97)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "sticky", top: 0, zIndex: 200,
        height: 62, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 28px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Club Logo" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: 2 }}>NFT Weingarten</span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", gap: 4 }}>
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="nav-link" style={{
                background: active ? "#00e676" : "transparent",
                color: active ? "#070d1a" : "rgba(255,255,255,.65)",
                border: "none", padding: "9px 18px", borderRadius: 10,
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                fontSize: 15, letterSpacing: .5, textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: 6,
              }}>{icon} {label}</Link>
            );
          })}
        </div>

        {/* Profile avatar */}
        <div ref={dropRef} style={{ position: "relative" }}>
          <button onClick={() => setOpen(p => !p)} style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#00e676,#0070ff)",
            border: open ? "2px solid #00e676" : "2px solid transparent",
            color: "#070d1a", fontWeight: 800, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 0 12px rgba(0,230,118,.3)",
          }}>{initials}</button>

          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              background: "#0e1828", border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 16, minWidth: 200, overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,.5)", animation: "fadeIn .15s ease",
            }}>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#00e676,#0070ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#070d1a", flexShrink: 0 }}>{initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{currentUser.name}</div>
                    <div style={{ fontSize: 11, color: "#00e676", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{currentUser.role}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px" }}>
                <button onClick={handleLogout} style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10,
                  background: "transparent", border: "none", color: "#ff5252",
                  fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center",
                  gap: 10, cursor: "pointer", textAlign: "left",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,82,82,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 16 }}>🚪</span> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAV ───────────────────────── */}
      {/* Spacer so page content doesn't hide behind the nav */}
      <div className="mobile-spacer" />

      <div className="mobile-nav-wrap">
        {/* Pill navbar */}
        <nav className="mobile-nav-pill">
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="mob-tab" data-active={active}>
                <span className="mob-icon">{icon}</span>
                <span className="mob-label" data-active={active}>{label}</span>
              </Link>
            );
          })}

          {/* Profile tab */}
          <div ref={dropRef} style={{ position: "relative" }}>
            <button onClick={() => setOpen(p => !p)} className="mob-tab" data-active={open}
              style={{ background: "none", border: "none", cursor: "pointer" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg,#00e676,#0070ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13, color: "#070d1a",
                boxShadow: open ? "0 0 0 2px #00e676" : "none",
              }}>{initials}</div>
              <span className="mob-label" data-active={open}>Profile</span>
            </button>

            {/* Profile popup — opens upward */}
            {open && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 16px)", right: 0,
                background: "#0e1828", border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 16, minWidth: 210, overflow: "hidden",
                boxShadow: "0 -8px 32px rgba(0,0,0,.6)", animation: "fadeIn .15s ease",
                zIndex: 10,
              }}>
                <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#00e676,#0070ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, color: "#070d1a", flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{currentUser.name}</div>
                      <div style={{ fontSize: 11, color: "#00e676", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{currentUser.role}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "8px" }}>
                  <button onClick={handleLogout} style={{
                    width: "100%", padding: "11px 14px", borderRadius: 10,
                    background: "transparent", border: "none", color: "#ff5252",
                    fontSize: 14, fontWeight: 600, display: "flex",
                    alignItems: "center", gap: 10, cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16 }}>🚪</span> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      <style>{`
        /* ── Desktop only ── */
        .mobile-nav-wrap  { display: none; }
        .mobile-spacer    { display: none; }

        /* ── Mobile only ── */
        @media (max-width: 768px) {
          .desktop-nav      { display: none !important; }

          /* Reserve space at bottom of every page */
          .mobile-spacer {
            display: block;
            height: 90px;
          }

          /* Sticky pill wrapper */
          .mobile-nav-wrap {
            display: block;
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 300;
            width: calc(100% - 32px);
            max-width: 420px;
          }

          /* Pill shape */
          .mobile-nav-pill {
            display: flex;
            align-items: center;
            justify-content: space-around;
            background: rgba(14, 24, 40, 0.97);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 50px;
            padding: 10px 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,230,118,0.08);
            backdrop-filter: blur(20px);
          }

          /* Each tab */
          .mob-tab {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 4px 14px;
            border-radius: 40px;
            text-decoration: none;
            transition: background 0.2s;
          }
          .mob-tab[data-active="true"] {
            background: rgba(0,230,118,0.12);
          }

          .mob-icon { font-size: 20px; line-height: 1; }

          .mob-label {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.4);
          }
          .mob-label[data-active="true"] {
            color: #00e676;
          }
        }
      `}</style>
    </>
  );
}
