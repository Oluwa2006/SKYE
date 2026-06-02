import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import GlassSidebar from "./GlassSidebar";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="h-screen overflow-hidden bg-white">
        <Suspense fallback={null}>
          <GlassSidebar />
        </Suspense>
        <Suspense fallback={null}>
          <PageIntro />
        </Suspense>
        <main className="h-screen overflow-hidden" style={{ paddingLeft: 60 }}>
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
