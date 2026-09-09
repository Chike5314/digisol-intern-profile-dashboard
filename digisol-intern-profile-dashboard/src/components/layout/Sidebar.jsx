import { NavLink } from "react-router-dom";
import { Globe, Lock, LogOut, Menu } from "lucide-react";

export function Sidebar({ department, role, signOut, open, onToggle }) {
  const linkClass = ({ isActive }) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">D</div>
          <span className="font-bold text-slate-900">Digisol Portal</span>
        </div>
        <button onClick={onToggle} aria-label="Toggle navigation">
          <Menu size={22} />
        </button>
      </div>

      <aside
        className={`
          w-64 border-r border-slate-200 bg-white flex flex-col justify-between
          md:static md:translate-x-0
          fixed inset-y-0 left-0 z-40 transition-transform
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div>
          <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">D</div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">Digisol Portal</h1>
              <span className="text-xs text-slate-400 font-medium">{department}</span>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 px-3">General Space</p>
            <NavLink to="/feed" className={linkClass}>
              <Globe size={18} />
              <span>Public Feed</span>
            </NavLink>

            <p className="text-[10px] font-bold uppercase text-slate-400 px-3 pt-4">Department Space</p>
            <NavLink to="/workspace" className={linkClass}>
              <Lock size={18} />
              <span>My Workspace</span>
            </NavLink>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="px-2">
            <p className="text-xs text-slate-400">Department Role</p>
            <p className="text-sm font-bold text-slate-800">👑 {role}</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-100"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={onToggle} />}
    </>
  );
}
