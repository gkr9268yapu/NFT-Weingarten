"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";
import { logOut } from "@/lib/firebaseAuth";

const LINKS = [
  { href:"/home",  icon:"🏠", label:"Home"  },
  { href:"/media", icon:"📷", label:"Media" },
  { href:"/chat",  icon:"💬", label:"Chat"  },
] as const;

export default function Navbar() {
  const { currentUser, setCurrentUser } = useApp();
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = useState(false);
  const dropRef   = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    setOpen(false);
    try {
      router.push("/");
      await logOut();
      setCurrentUser(null);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <>
      {/* ── DESKTOP NAV ─────────────────────────────────────── */}
      <nav style={{
        background:"rgba(7,13,26,0.97)", backdropFilter:"blur(16px)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        position:"sticky", top:0, zIndex:200,
        height:62, display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 28px",
      }}
        className="desktop-nav"
      >
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, background:"linear-gradient(135deg,#00e676,#0070ff)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 16px rgba(0,230,118,.35)", flexShrink:0 }}>⚽</div>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:20, letterSpacing:2 }}>FOOTBALL CLUB</span>
        </div>

        {/* Nav links */}
        <div style={{ display:"flex", gap:4 }}>
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} className="nav-link" style={{
                background: active ? "#00e676" : "transparent",
                color: active ? "#070d1a" : "rgba(255,255,255,.65)",
                border:"none", padding:"9px 18px", borderRadius:10,
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:15, letterSpacing:.5, textTransform:"uppercase",
                display:"flex", alignItems:"center", gap:6,
              }}>{icon} {label}</Link>
            );
          })}
        </div>

        {/* Profile avatar + dropdown */}
        <div ref={dropRef} style={{ position:"relative" }}>
          <button
            onClick={() => setOpen(p => !p)}
            style={{
              width:40, height:40, borderRadius:"50%",
              background:"linear-gradient(135deg,#00e676,#0070ff)",
              border: open ? "2px solid #00e676" : "2px solid transparent",
              color:"#070d1a", fontWeight:800, fontSize:15,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", transition:"border .2s",
              boxShadow:"0 0 12px rgba(0,230,118,.3)",
            }}
          >{initials}</button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position:"absolute", top:"calc(100% + 10px)", right:0,
              background:"#0e1828", border:"1px solid rgba(255,255,255,.1)",
              borderRadius:16, minWidth:200, overflow:"hidden",
              boxShadow:"0 12px 40px rgba(0,0,0,.5)",
              animation:"fadeIn .15s ease",
            }}>
              {/* User info */}
              <div style={{ padding:"16px 18px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#00e676,#0070ff)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#070d1a", flexShrink:0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{currentUser.name}</div>
                    <div style={{ fontSize:11, color:"#00e676", textTransform:"uppercase", letterSpacing:1.5, marginTop:2 }}>{currentUser.role}</div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding:"8px" }}>
                <button onClick={handleLogout} style={{
                  width:"100%", padding:"11px 14px", borderRadius:10,
                  background:"transparent", border:"none",
                  color:"#ff5252", fontSize:14, fontWeight:600,
                  display:"flex", alignItems:"center", gap:10,
                  cursor:"pointer", transition:"background .15s", textAlign:"left",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,82,82,.1)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize:16 }}>🚪</span> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
      <nav className="mobile-nav" style={{
        display:"none",
        position:"fixed", bottom:0, left:0, right:0, zIndex:200,
        background:"rgba(7,13,26,0.97)", backdropFilter:"blur(16px)",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        padding:"8px 0 max(8px, env(safe-area-inset-bottom))",
      }}>
        <div style={{ display:"flex", justifyContent:"space-around", alignItems:"center" }}>
          {LINKS.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                display:"flex", flexDirection:"column", alignItems:"center",
                gap:3, padding:"6px 16px", borderRadius:12,
                color: active ? "#00e676" : "rgba(255,255,255,.45)",
                textDecoration:"none", transition:"color .2s",
              }}>
                <span style={{ fontSize:22 }}>{icon}</span>
                <span style={{ fontSize:10, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{label}</span>
              </Link>
            );
          })}

          {/* Profile tab */}
          <div ref={dropRef} style={{ position:"relative" }}>
            <button onClick={() => setOpen(p => !p)} style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              gap:3, padding:"6px 16px", borderRadius:12,
              background:"transparent", border:"none", cursor:"pointer",
              color: open ? "#00e676" : "rgba(255,255,255,.45)",
            }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#00e676,#0070ff)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, color:"#070d1a" }}>
                {initials}
              </div>
              <span style={{ fontSize:10, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>Profile</span>
            </button>

            {/* Mobile profile popup — opens upward */}
            {open && (
              <div style={{
                position:"absolute", bottom:"calc(100% + 10px)", right:0,
                background:"#0e1828", border:"1px solid rgba(255,255,255,.1)",
                borderRadius:16, minWidth:200, overflow:"hidden",
                boxShadow:"0 -8px 32px rgba(0,0,0,.5)",
                animation:"fadeIn .15s ease",
              }}>
                {/* User info */}
                <div style={{ padding:"16px 18px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#00e676,#0070ff)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color:"#070d1a", flexShrink:0 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{currentUser.name}</div>
                      <div style={{ fontSize:11, color:"#00e676", textTransform:"uppercase", letterSpacing:1.5, marginTop:2 }}>{currentUser.role}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding:"8px" }}>
                  <button onClick={handleLogout} style={{
                    width:"100%", padding:"11px 14px", borderRadius:10,
                    background:"transparent", border:"none",
                    color:"#ff5252", fontSize:14, fontWeight:600,
                    display:"flex", alignItems:"center", gap:10,
                    cursor:"pointer", textAlign:"left",
                  }}>
                    <span style={{ fontSize:16 }}>🚪</span> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom padding so content isn't hidden behind mobile nav */}
      <div className="mobile-bottom-spacer" style={{ display:"none", height:70 }} />

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: block !important; }
          .mobile-bottom-spacer { display: block !important; }
        }
      `}</style>
    </>
  );
}
