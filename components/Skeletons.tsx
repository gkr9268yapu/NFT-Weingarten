"use client";

/* ══ SHIMMER STYLES ══════════════════════════════════════════ */
const shimmerCSS = `
@keyframes skeletonShimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.sk {
  background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
  background-size: 800px 100%;
  animation: skeletonShimmer 1.8s ease-in-out infinite;
  border-radius: 8px;
}
.sk-circle { border-radius: 50%; }
`;

function Shimmer() {
    return <style>{shimmerCSS}</style>;
}

/* ══ SKELETON BLOCKS ═════════════════════════════════════════ */
function Box({ w, h, r, mb, style }: { w?: string | number; h?: string | number; r?: number; mb?: number; style?: React.CSSProperties }) {
    return <div className="sk" style={{ width: w ?? "100%", height: h ?? 16, borderRadius: r ?? 8, marginBottom: mb ?? 0, ...style }} />;
}

function Circle({ size = 40, style }: { size?: number; style?: React.CSSProperties }) {
    return <div className="sk sk-circle" style={{ width: size, height: size, flexShrink: 0, ...style }} />;
}

/* ══ NAVBAR SKELETON ═════════════════════════════════════════ */
export function NavbarSkeleton() {
    return (
        <>
            <Shimmer />
            {/* Desktop */}
            <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 62, background: "rgba(7,13,26,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Circle size={38} />
                    <Box w={140} h={20} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    {[80, 80, 90, 70].map((w, i) => <Box key={i} w={w} h={34} r={10} />)}
                </div>
                <Circle size={40} />
            </nav>
            {/* Mobile */}
            <div className="mobile-topbar" style={{ display: "none" }}>
                <Circle size={34} />
                <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 10px" }}>
                            <Box w={20} h={20} r={4} />
                            <Box w={28} h={6} r={3} />
                        </div>
                    ))}
                    <Circle size={26} />
                </div>
            </div>
            <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-topbar {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            height: 56px;
            background: rgba(7,13,26,0.97);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            position: fixed;
            top: 0; left: 0; right: 0;
            z-index: 200;
          }
        }
      `}</style>
        </>
    );
}

/* ══ HOME SKELETON ═══════════════════════════════════════════ */
export function HomeSkeleton() {
    return (
        <div style={{ background: "#070d1a", minHeight: "100vh" }}>
            <NavbarSkeleton />
            <Shimmer />
            <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 28px" }} className="page-main">
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
                    <div>
                        <Box w={320} h={44} r={6} mb={10} />
                        <Box w={260} h={14} r={4} />
                    </div>
                    <Box w={140} h={44} r={12} />
                </div>

                {/* Match cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 28 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, overflow: "hidden" }}>
                            {/* Image area */}
                            <Box w="100%" h={200} r={0} />
                            {/* Content */}
                            <div style={{ padding: "20px 22px 22px" }}>
                                <Box w="70%" h={22} mb={16} />
                                <Box w="90%" h={12} mb={10} />
                                <Box w="60%" h={12} mb={10} />
                                <Box w="75%" h={12} mb={20} />
                                {/* Availability buttons */}
                                <div style={{ display: "flex", gap: 10 }}>
                                    <Box h={42} r={12} style={{ flex: 1 }} />
                                    <Box h={42} r={12} style={{ flex: 1 }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Manage Players skeleton */}
                <div style={{ marginTop: 64 }}>
                    <Box w={240} h={28} mb={22} />
                    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, overflow: "hidden" }}>
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 26px", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <Circle size={40} />
                                    <div>
                                        <Box w={120} h={14} mb={6} />
                                        <Box w={160} h={10} />
                                    </div>
                                </div>
                                <Box w={80} h={32} r={8} />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

/* ══ PLAYERS SKELETON ════════════════════════════════════════ */
export function PlayersSkeleton() {
    return (
        <div style={{ background: "#070d1a", minHeight: "100dvh" }}>
            <NavbarSkeleton />
            <Shimmer />
            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 20px 40px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Box w={240} h={42} r={6} />
                        <Box w={160} h={34} r={20} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Box w={180} h={38} r={20} />
                        <Circle size={36} />
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: "rgba(255,255,255,.03)", border: "2px solid rgba(255,255,255,.08)", borderRadius: 20, overflow: "hidden" }}>
                    {/* Header row */}
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 180px 80px", padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                        <Box w={40} h={14} />
                        <Box w={60} h={14} />
                        <Box w={60} h={14} />
                        <Box w={40} h={14} />
                    </div>
                    {/* Player rows */}
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 180px 80px", padding: "12px 24px", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                            <Circle size={34} />
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <Circle size={42} />
                                <Box w={100 + Math.random() * 60} h={16} />
                            </div>
                            <Box w={80} h={14} />
                            <Box w={50} h={14} style={{ margin: "0 auto" }} />
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

/* ══ CHAT SKELETON ═══════════════════════════════════════════ */
export function ChatSkeleton() {
    return (
        <div style={{ background: "#070d1a", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
            <NavbarSkeleton />
            <Shimmer />
            <div style={{ flex: 1, maxWidth: 680, width: "100%", margin: "0 auto", padding: "80px 0 40px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px" }}>
                    <Box w={120} h={36} r={6} />
                    <Circle size={42} />
                </div>

                {/* Team chat */}
                <div style={{ padding: "0 12px 8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, marginBottom: 6 }}>
                        <Circle size={48} />
                        <div style={{ flex: 1 }}>
                            <Box w={140} h={15} mb={6} />
                            <Box w={100} h={11} />
                        </div>
                        <Circle size={10} />
                    </div>
                </div>

                {/* Private label */}
                <div style={{ padding: "12px 20px 8px" }}>
                    <Box w={130} h={12} />
                </div>

                {/* Conversation rows */}
                <div style={{ padding: "0 12px" }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 14, marginBottom: 4 }}>
                            <Circle size={48} />
                            <div style={{ flex: 1 }}>
                                <Box w={100 + Math.random() * 60} h={15} mb={6} />
                                <Box w={140 + Math.random() * 80} h={11} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                <Box w={40} h={10} />
                                {i % 3 === 0 && <Circle size={18} />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ══ MEDIA SKELETON ══════════════════════════════════════════ */
export function MediaSkeleton() {
    return (
        <div style={{ background: "#070d1a", minHeight: "100vh" }}>
            <NavbarSkeleton />
            <Shimmer />
            <main style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 28px" }} className="page-main">
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <Box w={280} h={44} r={6} mb={10} />
                        <Box w={200} h={14} r={4} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                        <Box w={46} h={46} r={12} />
                        <Box w={46} h={46} r={12} />
                        <Box w={140} h={46} r={12} />
                    </div>
                </div>

                {/* Image grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                        <div key={i} style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden" }}>
                            <Box w="100%" h={200} r={0} />
                            <div style={{ padding: "12px 14px" }}>
                                <Box w="60%" h={12} mb={6} />
                                <Box w="40%" h={10} />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <style>{`
        @media (max-width: 768px) {
          .page-main .sk-media-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        }
      `}</style>
        </div>
    );
}

/* ══ LOGIN SKELETON ══════════════════════════════════════════ */
export function LoginSkeleton() {
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#070d1a 0%,#0d1b35 60%,#070d1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <Shimmer />
            <div style={{ position: "absolute", inset: 0, opacity: .04, backgroundImage: "radial-gradient(circle,#00e676 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

            <div style={{ width: "100%", maxWidth: 460, padding: "0 24px" }}>
                {/* Logo + title */}
                <div style={{ textAlign: "center", marginBottom: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Circle size={72} style={{ marginBottom: 18, boxShadow: "0 0 40px rgba(0,230,118,.15)" }} />
                    <Box w={220} h={36} mb={10} />
                    <Box w={200} h={12} />
                </div>

                {/* Card */}
                <div style={{ background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 24, padding: "36px 32px", backdropFilter: "blur(20px)" }}>
                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                        <Box h={42} r={10} style={{ flex: 1 }} />
                        <Box h={42} r={10} style={{ flex: 1 }} />
                    </div>

                    {/* Input fields */}
                    <Box h={44} r={10} mb={14} />
                    <Box h={44} r={10} mb={14} />

                    {/* Button */}
                    <Box h={52} r={12} style={{ marginTop: 6 }} />
                </div>
            </div>
        </div>
    );
}