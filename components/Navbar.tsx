"use client";
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
  const pathname = usePathname();
  const router   = useRouter();

  if (!currentUser) return null;

  const handleLogout = async () => {
    try {
      router.push("/");           // navigate away FIRST
      await logOut();             // then sign out (triggers auth listener)
      setCurrentUser(null);       // immediate local clear
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <nav style={{
      background:"rgba(7,13,26,0.97)", backdropFilter:"blur(16px)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      position:"sticky", top:0, zIndex:200,
      height:62, display:"flex", alignItems:"center",
      justifyContent:"space-between", padding:"0 36px",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, background:"linear-gradient(135deg,#00e676,#0070ff)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 0 16px rgba(0,230,118,.35)" }}>⚽</div>
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: 2 }}>Nepalese Football Team Weingarten</span>
      </div>

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

      <div style={{ display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:14, fontWeight:600 }}>{currentUser.name}</div>
          <div style={{ fontSize:11, color:"#00e676", textTransform:"uppercase", letterSpacing:1.5 }}>{currentUser.role}</div>
        </div>
        <button onClick={handleLogout} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.7)", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500 }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
