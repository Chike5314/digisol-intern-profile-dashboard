import { useState } from "react";
import { ImageLightbox } from "../ui/ImageLightbox";

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export function ProfileCard({ item }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="flex items-center gap-3.5">
      {item.avatarUrl ? (
        <button
          onClick={() => setPreviewOpen(true)}
          aria-label={`Preview ${item.name}'s photo`}
          className="shrink-0"
        >
          <img
            src={item.avatarUrl}
            alt={item.name}
            className="h-12 w-12 rounded-full object-cover border-2 border-[var(--ink)] hover:opacity-85 transition"
          />
        </button>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] font-display font-semibold text-sm text-[var(--ink)]">
          {initials(item.name) || "?"}
        </div>
      )}
      <div className="min-w-0">
        <h3 className="font-display font-semibold text-[var(--ink)] truncate leading-tight">{item.name}</h3>
        <p className="text-xs text-[var(--steel)] font-medium truncate mt-0.5">{item.field}</p>
        <p className="text-xs text-[var(--ink)]/50 truncate">{item.school}</p>
      </div>

      {previewOpen && item.avatarUrl && (
        <ImageLightbox src={item.avatarUrl} alt={item.name} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
