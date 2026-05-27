import { Suspense } from "react";
import { UserProvider } from "./UserContext";
import HomeButton from "./HomeButton";
import PageIntro from "./PageIntro";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen" style={{ background:"#f8f9fb" }}>
        <HomeButton />
        <Suspense fallback={null}>
          <PageIntro />
        </Suspense>
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
