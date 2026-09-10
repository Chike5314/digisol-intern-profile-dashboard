import { useState } from "react";
import { Expand } from "lucide-react";
import { ImageLightbox } from "../ui/ImageLightbox";

export function PhotoCard({ item }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setPreviewOpen(true)}
        aria-label="Preview photo"
        className="group relative block w-full"
      >
        <img
          src={item.imageUrl}
          alt={item.caption || "Department photo"}
          loading="lazy"
          className="h-48 w-full object-cover border border-[var(--ink)]/15 bg-[var(--paper)]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-[var(--ink)]/0 group-hover:bg-[var(--ink)]/30 transition">
          <Expand size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
        </span>
      </button>
      {item.caption && (
        <p className="mt-2.5 text-sm italic text-[var(--ink)]/70 leading-snug">{item.caption}</p>
      )}

      {previewOpen && (
        <ImageLightbox src={item.imageUrl} alt={item.caption || "Department photo"} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
