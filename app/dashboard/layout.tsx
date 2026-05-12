import { UserProvider } from "./UserContext";
import HomeButton from "./HomeButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider initial={null}>
      <div className="min-h-screen" style={{ background:"#f8f9fb" }}>
        <HomeButton />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
