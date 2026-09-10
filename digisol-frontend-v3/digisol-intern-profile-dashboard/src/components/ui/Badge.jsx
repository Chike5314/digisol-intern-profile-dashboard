export function VisibilityBadge({ visibility }) {
  const isPublic = visibility === "PUBLIC";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink)]/70">
      <span
        className={`h-1.5 w-1.5 rounded-full ${isPublic ? "bg-[var(--amber)]" : "bg-[var(--ink)]/30"}`}
        aria-hidden="true"
      />
      {isPublic ? "Published" : "Private"}
    </span>
  );
}
