import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import GlassSidebar from "./GlassSidebar";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen" style={{
        background: "linear-gradient(145deg,#c7d7ff 0%,#e8e0ff 35%,#fce4ff 65%,#c9f0ff 100%)",
      }}>
        <Suspense fallback={null}>
          <GlassSidebar />
        </Suspense>
        <Suspense fallback={null}>
          <PageIntro />
        </Suspense>
        {/* Offset for the floating sidebar (56px wide + 12px left margin + 12px gap) */}
        <main className="min-h-screen" style={{ paddingLeft: 68 }}>
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
