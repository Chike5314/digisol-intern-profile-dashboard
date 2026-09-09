export function PhotoCard({ item }) {
  return (
    <div>
      <img
        src={item.imageUrl}
        alt={item.caption || "Department photo"}
        loading="lazy"
        className="h-48 w-full object-cover rounded-xl bg-slate-100"
      />
      {item.caption && <p className="mt-2 text-xs font-semibold text-slate-600">{item.caption}</p>}
    </div>
  );
}
