"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, logIn } from "@/lib/firebaseAuth";
import { useApp } from "@/lib/AppContext";
import type { Role } from "@/lib/types";
import { isHostEmail } from "@/lib/hostEmails";
const IS = {
  width: "100%",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#fff",
  fontSize: 14,
  display: "block",
  marginBottom: 14,
} as const;

export default function LoginPage() {
  const { loading } = useApp();
  const router = useRouter();

  const [mode,     setMode]     = useState<"login"|"signup">("login");
  const [role,     setRole]     = useState<Role>("user");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [name,     setName]     = useState("");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#070d1a" }}>
    <img src="/logo.png" alt="Club Logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", animation: "pulse 1.2s infinite" }} />
    </div>
  );

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setBusy(true); setError("");
    try {
      await logIn(email, password, role);
      router.push("/home");
    } catch (e: unknown) {
      setError((e as Error).message || "Login failed.");
    } finally { setBusy(false); }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) { setError("All fields are required."); return; }
    setBusy(true); setError("");
    try {
      await signUp(name, email, password, role);
      setError("✓ Account created! Check your email to verify, then log in.");
      setMode("login");
      setPassword("");
    } catch (e: unknown) {
      setError((e as Error).message || "Sign up failed.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#070d1a 0%,#0d1b35 60%,#070d1a 100%)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>

      <div style={{ position:"absolute", inset:0, opacity:.04, backgroundImage:"radial-gradient(circle,#00e676 1px,transparent 1px)", backgroundSize:"40px 40px" }} />
      <div style={{ position:"absolute", top:"10%", right:"5%", width:300, height:300, background:"radial-gradient(circle,rgba(0,230,118,.08),transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"10%", left:"5%", width:400, height:400, background:"radial-gradient(circle,rgba(0,112,255,.06),transparent 70%)", borderRadius:"50%", pointerEvents:"none" }} />

      <div className="slide-up" style={{ width:"100%", maxWidth:460, padding:"0 24px" }}>

        <div style={{ textAlign:"center", marginBottom:40 }}>
          <img src="/logo.png" alt="Club Logo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 18, boxShadow: "0 0 40px rgba(0,230,118,.3)" }} />
          <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: 3, lineHeight: 1 }}>NFT Weingarten</h1>
          <p style={{ color:"rgba(255,255,255,.35)", fontSize:13, marginTop:8, letterSpacing:1 }}>TEAM MANAGEMENT PLATFORM</p>
        </div>

        <div style={{ background:"rgba(255,255,255,.035)", border:"1px solid rgba(255,255,255,.08)", borderRadius:24, padding:"36px 32px", backdropFilter:"blur(20px)" }}>

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "11px", borderRadius: 10,
                border: `2px solid ${mode === m ? "#00e676" : "rgba(255,255,255,.08)"}`,
                background: "transparent",
                color: mode === m ? "#00e676" : "rgba(255,255,255,.4)",
                fontWeight: 600, fontSize: 14, transition: "all .2s",
              }}>{m === "login" ? "Log In" : "Sign Up"}</button>
            ))}
          </div>

          {mode === "signup" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={IS} />}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" style={IS} />

          {/* Role selector — shows after email is typed in signup mode */}
          {mode === "signup" && (
            isHostEmail(email) ? (
              <>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Select Role</p>
                <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,.3)", borderRadius: 14, padding: 4, marginBottom: 14 }}>
                  {(["user", "host"] as Role[]).map(r => (
                    <button key={r} onClick={() => { setRole(r); setError(""); }} style={{
                      flex: 1, padding: "11px", borderRadius: 10, border: "none",
                      background: role === r ? "#00e676" : "transparent",
                      color: role === r ? "#070d1a" : "rgba(255,255,255,.45)",
                      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: .5, transition: "all .2s",
                    }}>{r === "user" ? "👤 Player" : "⭐ Host"}</button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "rgba(0,230,118,.06)", border: "1px solid rgba(0,230,118,.15)", color: "rgba(255,255,255,.5)", fontSize: 13 }}>
                👤 Signing up as Player
              </div>
            )
          )}

          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            style={{ ...IS, marginBottom: 6 }}
            onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
          />

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:8, marginBottom:16, fontSize:13,
              background: error.startsWith("✓") ? "rgba(0,230,118,.1)" : "rgba(255,82,82,.1)",
              color: error.startsWith("✓") ? "#00e676" : "#ff5252",
              border:`1px solid ${error.startsWith("✓") ? "rgba(0,230,118,.2)" : "rgba(255,82,82,.2)"}`,
            }}>{error}</div>
          )}

          <button onClick={mode==="login" ? handleLogin : handleSignup} disabled={busy} style={{
            width:"100%", padding:"15px", background: busy ? "rgba(0,230,118,.4)" : "linear-gradient(135deg,#00e676,#00c853)",
            border:"none", borderRadius:12, color:"#070d1a",
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900, fontSize:18, letterSpacing:1.5, textTransform:"uppercase",
            boxShadow:"0 4px 20px rgba(0,230,118,.3)", transition:"all .2s",
          }}>
            {busy ? "Please wait…" : mode==="login" ? "Log In" : "Create Account"}
          </button>

          {mode==="signup" && (
            <p style={{ textAlign:"center", marginTop:14, fontSize:12, color:"rgba(255,255,255,.3)", lineHeight:1.6 }}>
              A verification email will be sent after sign up.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
