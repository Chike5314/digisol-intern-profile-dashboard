import { useState } from "react";
import { Modal } from "./Modal";

export function EditPhotoModal({ item, onClose, onSubmit, submitting }) {
  const [caption, setCaption] = useState(item.caption || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ caption });
  };

  return (
    <Modal title="Edit Photo Caption" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <img src={item.imageUrl} alt={item.caption || "Department photo"} className="h-40 w-full object-cover rounded-xl bg-slate-100" />
        <input
          type="text"
          placeholder="Caption / Description"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded-xl border p-2.5 text-sm outline-none"
        />
        <p className="text-xs text-slate-400">To replace the image itself, delete this photo and upload a new one.</p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
}
