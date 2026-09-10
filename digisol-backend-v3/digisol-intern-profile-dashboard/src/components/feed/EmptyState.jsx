import { ImageOff } from "lucide-react";

export function EmptyState({ title, subtitle }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border border-dashed border-[var(--line)] rounded-md">
      <ImageOff size={26} className="mb-3 text-[var(--ink)]/30" />
      <p className="font-display font-medium text-[var(--ink)]/70">{title}</p>
      {subtitle && <p className="text-sm mt-1 text-[var(--ink)]/45">{subtitle}</p>}
    </div>
  );
}
