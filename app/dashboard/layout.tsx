import Sidebar from "./Sidebar";
import { UserProvider } from "./UserContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen bg-transparent">
        <Sidebar />
        <main className="min-h-screen pl-[220px]">
          <div
            className="min-h-screen px-7 py-7 text-[#111111]"
            style={{
              background: "rgba(255,255,255,0.94)",
              borderLeft: "1px solid rgba(16,16,16,0.08)",
              backdropFilter: "blur(18px)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </UserProvider>
  );
}
