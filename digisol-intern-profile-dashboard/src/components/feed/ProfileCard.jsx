function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function ProfileCard({ item }) {
  return (
    <div className="flex items-center gap-3">
      {item.avatarUrl ? (
        <img
          src={item.avatarUrl}
          alt={item.name}
          className="h-11 w-11 shrink-0 rounded-full object-cover bg-slate-100"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
          {initials(item.name) || "?"}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
        <p className="text-xs text-indigo-600 truncate">{item.field}</p>
        <p className="text-xs text-slate-400 truncate">{item.school}</p>
      </div>
    </div>
  );
}
