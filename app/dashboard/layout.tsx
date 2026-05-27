import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import GlassSidebar from "./GlassSidebar";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      {/* Soft mesh gradient background */}
      <div className="min-h-screen" style={{
        background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 40%, #f5f0ff 100%)",
      }}>
        <Suspense fallback={null}>
          <GlassSidebar />
        </Suspense>

        <Suspense fallback={null}>
          <PageIntro />
        </Suspense>

        {/* Main content offset by sidebar width */}
        <main className="min-h-screen" style={{ paddingLeft: 220 }}>
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
