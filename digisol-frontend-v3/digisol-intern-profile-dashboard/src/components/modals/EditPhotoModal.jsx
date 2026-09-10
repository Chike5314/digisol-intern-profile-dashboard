import { useState } from "react";
import { Modal } from "./Modal";

export function EditPhotoModal({ item, onClose, onSubmit, submitting }) {
  const [caption, setCaption] = useState(item.caption || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ caption });
  };

  return (
    <Modal title="Edit photo caption" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <img
          src={item.imageUrl}
          alt={item.caption || "Department photo"}
          className="h-40 w-full object-cover border border-[var(--line)]"
        />
        <input
          type="text"
          placeholder="Caption / description"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40"
        />
        <p className="text-xs text-[var(--ink)]/45">To replace the image itself, delete this photo and upload a new one.</p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--ink)] text-white rounded-md py-2.5 font-medium text-sm hover:bg-[#2A3547] transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
