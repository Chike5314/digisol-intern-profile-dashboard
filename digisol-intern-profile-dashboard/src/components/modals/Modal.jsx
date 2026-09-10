import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ title, onClose, children, dismissable = true }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (dismissable && e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, dismissable]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--line)] rounded-md p-6 shadow-xl outline-none max-h-[90vh] overflow-y-auto"
      >
        <div className={`flex justify-between items-center ${dismissable ? "border-b border-[var(--line)] pb-3" : ""}`}>
          <h3 className="font-display font-semibold text-[var(--ink)]">{title}</h3>
          {dismissable && (
            <button onClick={onClose} aria-label="Close dialog" className="text-[var(--ink)]/50 hover:text-[var(--ink)]">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
