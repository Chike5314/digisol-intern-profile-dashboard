import { Search } from "lucide-react";

export function FilterBar({ query, onQueryChange, visibility, onVisibilityChange, showVisibilityFilter }) {
  return (
    <div className="flex gap-3 mb-7">
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/35" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition"
        />
      </div>
      {showVisibilityFilter && (
        <select
          value={visibility}
          onChange={(e) => onVisibilityChange(e.target.value)}
          className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition"
        >
          <option value="ALL">All</option>
          <option value="PUBLIC">Published</option>
          <option value="PRIVATE">Private</option>
        </select>
      )}
    </div>
  );
}
