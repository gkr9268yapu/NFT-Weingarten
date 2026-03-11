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

  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) setDesktopOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    setDesktopOpen(false);
    setMobileOpen(false);
    try {
      router.push("/");
      await logOut();
      setCurrentUser(null);
    } catch (e) { console.error("Logout error:", e); }
  };

  const ProfileDropdown = ({ upward = false }: { upward?: boolean }) => (
    <div style={{
      background: "#0e1828", border: "1px solid rgba(255,255,255,.1)",
      borderRadius: 16, minWidth: 210, overflow: "hidden",
      boxShadow: "0 12px 40px rgba(0,0,0,.6)",
      position: "absolute", right: 0, zIndex: 400,
      ...(upward ? { bottom: "calc(100% + 10px)" } : { top: "calc(100% + 10px)" }),
    }}>
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#00e676,#0070ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#070d1a", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{currentUser.name}</div>
          <div style={{ fontSize: 11, color: "#00e676", textTransform: "uppercase", letterSpacing: 1.5, marginTop: 2 }}>{currentUser.role}</div>
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
          🚪 Log Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .desktop-nav { display: flex; align-items: center; justify-content: space-between; padding: 0 28px; height: 62px; background: rgba(7,13,26,0.97); border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; z-index: 200; backdrop-filter: blur(16px); }
        .mobile-topbar { display: none; }

        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }

          .mobile-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            height: 56px;
            background: rgba(7,13,26,0.97);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 200;
            backdrop-filter: blur(16px);
          }

          .mob-links {
            display: flex;
            align-items: center;
            gap: 2px;
          }

          .mob-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 4px 10px;
            border-radius: 10px;
            text-decoration: none;
            background: none;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
          }

          .mob-link[data-active="true"] { background: rgba(0,230,118,0.12); }
          .mob-link-icon  { font-size: 18px; line-height: 1; }
          .mob-link-label {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700; font-size: 9px;
            letter-spacing: 1px; text-transform: uppercase;
            color: rgba(255,255,255,0.4);
          }
          .mob-link-label[data-active="true"] { color: #00e676; }
        }
      `}</style>

      {/* ════════ DESKTOP NAV ════════ */}
      <nav className="desktop-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: 2 }}>NFT Weingarten</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                background: active ? "#00e676" : "transparent",
                color: active ? "#070d1a" : "rgba(255,255,255,.65)",
                padding: "9px 18px", borderRadius: 10, textDecoration: "none",
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
                fontSize: 15, letterSpacing: .5, textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {icon} {label}
              </Link>
            );
          })}
        </div>

        <div ref={desktopRef} style={{ position: "relative" }}>
          <button onClick={() => setDesktopOpen(p => !p)} style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,#00e676,#0070ff)",
            border: desktopOpen ? "2px solid #00e676" : "2px solid transparent",
            color: "#070d1a", fontWeight: 800, fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 0 12px rgba(0,230,118,.3)",
          }}>
            {initials}
          </button>
          {desktopOpen && <ProfileDropdown />}
        </div>
      </nav>

      {/* ════════ MOBILE TOP BAR ════════ */}
      <div className="mobile-topbar">

        {/* Logo only */}
        <img src="/logo.png" alt="Logo" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />

        {/* Nav links in topbar */}
        <div className="mob-links">
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="mob-link" data-active={active}>
                <span className="mob-link-icon">{icon}</span>
                <span className="mob-link-label" data-active={active}>{label}</span>
              </Link>
            );
          })}

          {/* Profile */}
          <div ref={mobileRef} style={{ position: "relative" }}>
            <button className="mob-link" data-active={mobileOpen} onClick={() => setMobileOpen(p => !p)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 10px", borderRadius: 10 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(135deg,#00e676,#0070ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 11, color: "#070d1a",
                outline: mobileOpen ? "2px solid #00e676" : "none",
              }}>
                {initials}
              </div>
              <span className="mob-link-label" data-active={mobileOpen}>Me</span>
            </button>
            {mobileOpen && <ProfileDropdown upward={false} />}
          </div>
        </div>
      </div>
    </>
  );
}