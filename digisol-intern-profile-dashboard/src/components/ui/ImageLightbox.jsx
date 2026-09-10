import { useEffect } from "react";
import { X } from "lucide-react";

export function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--ink)]/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
    >
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-5 right-5 text-white/80 hover:text-white transition"
      >
        <X size={26} />
      </button>
      <img
        src={src}
        alt={alt || ""}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] object-contain rounded-sm shadow-2xl"
      />
    </div>
  );
}
