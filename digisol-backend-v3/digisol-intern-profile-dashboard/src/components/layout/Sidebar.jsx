import { NavLink } from "react-router-dom";
import { Globe, Lock, LogOut, Menu, UserCheck } from "lucide-react";

export function Sidebar({ department, role, signOut, open, onToggle }) {
  const linkClass = ({ isActive }) =>
    `relative flex w-full items-center gap-3 pl-4 pr-4 py-3 text-sm font-medium transition ${
      isActive ? "text-[var(--ink)]" : "text-[var(--ink)]/55 hover:text-[var(--ink)]"
    }`;

  const isLead = role === "LEAD";
  const isVisitor = role === "VISITOR";
  const spaceLabel = isVisitor ? "Visitor" : department;

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--paper)]">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-semibold text-lg text-[var(--ink)]">The Roster</span>
        </div>
        <button onClick={onToggle} aria-label="Toggle navigation">
          <Menu size={22} className="text-[var(--ink)]" />
        </button>
      </div>

      <aside
        className={`
          w-64 border-r border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between
          md:static md:translate-x-0
          fixed inset-y-0 left-0 z-40 transition-transform
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div>
          <div className="hidden md:block px-6 py-6 border-b border-[var(--line)]">
            <h1 className="font-display font-semibold text-xl text-[var(--ink)] leading-none">The Roster</h1>
            <span className="text-xs text-[var(--ink)]/50 mt-1.5 block">{spaceLabel}</span>
          </div>

          <nav className="py-3">
            <p className="text-xs text-[var(--ink)]/40 px-4 pt-3 pb-1">General</p>
            <NavLink to="/feed" className={linkClass}>
              {({ isActive }) => (
                <>
                  <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${isActive ? "bg-[var(--amber)]" : "bg-transparent"}`} />
                  <Globe size={17} />
                  <span>Public feed</span>
                </>
              )}
            </NavLink>

            {/* Visitors don't belong to a department, so no workspace to show them. */}
            {!isVisitor && (
              <>
                <p className="text-xs text-[var(--ink)]/40 px-4 pt-5 pb-1">{department}</p>
                <NavLink to="/workspace" className={linkClass}>
                  {({ isActive }) => (
                    <>
                      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${isActive ? "bg-[var(--amber)]" : "bg-transparent"}`} />
                      <Lock size={17} />
                      <span>Workspace</span>
                    </>
                  )}
                </NavLink>
                {isLead && (
                  <NavLink to="/approvals" className={linkClass}>
                    {({ isActive }) => (
                      <>
                        <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${isActive ? "bg-[var(--amber)]" : "bg-transparent"}`} />
                        <UserCheck size={17} />
                        <span>Approvals</span>
                      </>
                    )}
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--line)] space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className={`h-1.5 w-1.5 rounded-full ${isLead ? "bg-[var(--amber)]" : "bg-[var(--steel)]"}`} />
            <span className="text-xs text-[var(--ink)]/70">
              {isLead ? "Lead" : isVisitor ? "Visitor" : "Member"}
            </span>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-white border border-[var(--line)] transition"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-[var(--ink)]/30 md:hidden" onClick={onToggle} />}
    </>
  );
}
