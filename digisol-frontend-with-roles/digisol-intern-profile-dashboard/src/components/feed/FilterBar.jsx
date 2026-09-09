import { Search } from "lucide-react";

export function FilterBar({ query, onQueryChange, visibility, onVisibilityChange, showVisibilityFilter }) {
  return (
    <div className="flex gap-3 mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-xl border pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>
      {showVisibilityFilter && (
        <select
          value={visibility}
          onChange={(e) => onVisibilityChange(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
        >
          <option value="ALL">All</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
      )}
    </div>
  );
}
