import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="h-screen overflow-hidden relative">
        {/* ── Animated wavy gradient background ── */}
        <div className="fixed inset-0 -z-10" style={{
          background: "linear-gradient(-45deg,#e8f0fe,#ede7ff,#fce8f3,#e0f7fa,#e8f5e9,#fff8e1)",
          backgroundSize: "600% 600%",
          animation: "mesh-shift 18s ease infinite",
        }}/>
        <style>{`
          @keyframes mesh-shift {
            0%   { background-position: 0% 50%;   }
            25%  { background-position: 50% 100%; }
            50%  { background-position: 100% 50%; }
            75%  { background-position: 50% 0%;   }
            100% { background-position: 0% 50%;   }
          }
          @keyframes wave-float {
            0%,100% { transform: translateY(0) rotate(0deg); }
            50%     { transform: translateY(-12px) rotate(1deg); }
          }
        `}</style>

        {/* Floating soft blobs for depth */}
        <div className="fixed pointer-events-none -z-10 inset-0">
          <div style={{
            position:"absolute", width:600, height:600, borderRadius:"50%",
            background:"rgba(147,197,253,0.18)", filter:"blur(80px)",
            top:"-10%", left:"-5%", animation:"wave-float 12s ease-in-out infinite",
          }}/>
          <div style={{
            position:"absolute", width:500, height:500, borderRadius:"50%",
            background:"rgba(196,181,253,0.18)", filter:"blur(80px)",
            bottom:"0%", right:"5%", animation:"wave-float 15s ease-in-out infinite reverse",
          }}/>
          <div style={{
            position:"absolute", width:400, height:400, borderRadius:"50%",
            background:"rgba(167,243,208,0.15)", filter:"blur(70px)",
            top:"40%", left:"40%", animation:"wave-float 10s ease-in-out infinite 3s",
          }}/>
        </div>

        <Suspense fallback={null}><PageIntro /></Suspense>
        <main className="h-screen overflow-hidden">{children}</main>
      </div>
    </UserProvider>
  );
}
