export function VisibilityBadge({ visibility }) {
  const isPublic = visibility === "PUBLIC";
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        isPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {visibility}
    </span>
  );
}
