import { useState } from "react";
import { Modal } from "./Modal";
import { useToast } from "../ui/ToastProvider";

const initialForm = { caption: "", file: null, visibility: "PRIVATE" };

export function UploadPhotoModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialForm);
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.file) {
      toast.error("Select an image first");
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal title="Upload Department Photo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
          className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700"
        />
        <input
          type="text"
          placeholder="Caption / Description"
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
          className="w-full rounded-xl border p-2.5 text-sm outline-none"
        />
        <select
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value })}
          className="w-full rounded-xl border p-2.5 text-sm outline-none"
        >
          <option value="PRIVATE">Keep Private to Department</option>
          <option value="PUBLIC">Publish Directly to General Feed</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Uploading..." : "Upload Image"}
        </button>
      </form>
    </Modal>
  );
}
