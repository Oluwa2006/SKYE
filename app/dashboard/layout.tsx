import { Suspense } from "react";
import Sidebar from "./Sidebar";
import { UserProvider } from "./UserContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen bg-transparent">
        <Suspense fallback={<div className="fixed inset-y-0 left-0 w-[220px]" />}>
          <Sidebar />
        </Suspense>
        <main className="min-h-screen pl-[220px]">
          <div
            className="min-h-screen px-7 py-7 text-[#111111]"
            style={{
              background: "#ffffff",
              borderLeft: "1px solid rgba(16,16,16,0.07)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
}
