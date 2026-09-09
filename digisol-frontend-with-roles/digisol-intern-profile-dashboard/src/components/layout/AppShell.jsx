import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function AppShell({ department, role, signOut, children }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800">
      <Sidebar
        department={department}
        role={role}
        signOut={signOut}
        open={navOpen}
        onToggle={() => setNavOpen((o) => !o)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
