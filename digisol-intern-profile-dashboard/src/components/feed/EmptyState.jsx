import { ImageOff } from "lucide-react";

export function EmptyState({ title, subtitle }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-slate-400">
      <ImageOff size={32} className="mb-3" />
      <p className="font-semibold text-slate-500">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
