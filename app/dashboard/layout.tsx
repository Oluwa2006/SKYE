import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import GlassSidebar from "./GlassSidebar";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen" style={{
        background: "linear-gradient(160deg,#eef2ff 0%,#f9fafb 50%,#f3f0ff 100%)",
      }}>
        <Suspense fallback={null}>
          <GlassSidebar />
        </Suspense>
        <Suspense fallback={null}>
          <PageIntro />
        </Suspense>
        {/* Offset for the floating sidebar (56px wide + 12px left margin + 12px gap) */}
        <main className="min-h-screen" style={{ paddingLeft: 80 }}>
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
