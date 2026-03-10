"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp, logIn } from "@/lib/firebaseAuth";
import { useApp } from "@/lib/AppContext";

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

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const PASS_RULES = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function LoginPage() {
  const { loading } = useApp();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070d1a" }}>
      <img src="/logo.png" alt="Club Logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", animation: "pulse 1.2s infinite" }} />
    </div>
  );

  const passResults = PASS_RULES.map(r => ({ label: r.label, ok: r.test(password) }));
  const passValid = passResults.every(r => r.ok);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!validateEmail(email)) { setError("Invalid email address."); return; }
    setBusy(true); setError("");
    try {
      await logIn(email, password);
      router.push("/home");
    } catch (e: unknown) {
      setError((e as Error).message || "Login failed.");
    } finally { setBusy(false); }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) { setError("All fields are required."); return; }
    if (!validateEmail(email)) { setError("Invalid email address."); return; }
    if (!passValid) { setError("Please fix password requirements."); return; }
    setBusy(true); setError("");
    try {
      await signUp(name, email, password, "user");
      setError("✓ Account created! Check your email to verify, then log in.");
      setMode("login");
      setPassword("");
    } catch (e: unknown) {
      setError((e as Error).message || "Sign up failed.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#070d1a 0%,#0d1b35 60%,#070d1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "radial-gradient(circle,#00e676 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ position: "absolute", top: "10%", right: "5%", width: 300, height: 300, background: "radial-gradient(circle,rgba(0,230,118,.08),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400, background: "radial-gradient(circle,rgba(0,112,255,.06),transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      <div className="slide-up" style={{ width: "100%", maxWidth: 460, padding: "0 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.png" alt="Club Logo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", marginBottom: 18, boxShadow: "0 0 40px rgba(0,230,118,.3)" }} />
          <h1 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: 3, lineHeight: 1 }}>NFT Weingarten</h1>
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13, marginTop: 8, letterSpacing: 1 }}>TEAM MANAGEMENT PLATFORM</p>
        </div>

        <div style={{ background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 24, padding: "36px 32px", backdropFilter: "blur(20px)" }}>

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setEmailErr(""); }} style={{
                flex: 1, padding: "11px", borderRadius: 10,
                border: `2px solid ${mode === m ? "#00e676" : "rgba(255,255,255,.08)"}`,
                background: "transparent",
                color: mode === m ? "#00e676" : "rgba(255,255,255,.4)",
                fontWeight: 600, fontSize: 14, transition: "all .2s",
              }}>{m === "login" ? "Log In" : "Sign Up"}</button>
            ))}
          </div>

          {/* Name — signup only */}
          {mode === "signup" && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" style={IS} />
          )}

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setEmailErr(e.target.value && !validateEmail(e.target.value) ? "Invalid email address" : "");
            }}
            placeholder="Email Address"
            style={{ ...IS, borderColor: emailErr ? "#ff5252" : "rgba(255,255,255,0.12)" }}
          />
          {emailErr && <p style={{ color: "#ff5252", fontSize: 12, marginTop: -10, marginBottom: 12 }}>{emailErr}</p>}

          {/* Password */}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            style={{ ...IS, marginBottom: 6, borderColor: mode === "signup" && password && !passValid ? "#ff5252" : "rgba(255,255,255,0.12)" }}
            onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
          />

          {/* Password rules — signup only */}
          {mode === "signup" && password && (
            <div style={{ marginBottom: 16 }}>
              {passResults.map(r => (
                <div key={r.label} style={{ fontSize: 12, color: r.ok ? "#00e676" : "#ff5252", marginBottom: 3 }}>
                  {r.ok ? "✓" : "✗"} {r.label}
                </div>
              ))}
            </div>
          )}

          {/* Error / success message */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: error.startsWith("✓") ? "rgba(0,230,118,.1)" : "rgba(255,82,82,.1)",
              color: error.startsWith("✓") ? "#00e676" : "#ff5252",
              border: `1px solid ${error.startsWith("✓") ? "rgba(0,230,118,.2)" : "rgba(255,82,82,.2)"}`,
            }}>{error}</div>
          )}

          <button onClick={mode === "login" ? handleLogin : handleSignup} disabled={busy} style={{
            width: "100%", padding: "15px",
            background: busy ? "rgba(0,230,118,.4)" : "linear-gradient(135deg,#00e676,#00c853)",
            border: "none", borderRadius: 12, color: "#070d1a",
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: 1.5, textTransform: "uppercase",
            boxShadow: "0 4px 20px rgba(0,230,118,.3)", transition: "all .2s",
          }}>
            {busy ? "Please wait…" : mode === "login" ? "Log In" : "Create Account"}
          </button>

          {mode === "signup" && (
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "rgba(255,255,255,.3)", lineHeight: 1.6 }}>
              A verification email will be sent after sign up.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}