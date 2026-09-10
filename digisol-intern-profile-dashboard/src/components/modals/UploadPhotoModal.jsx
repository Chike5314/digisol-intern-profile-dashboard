import { useState } from "react";
import { Modal } from "./Modal";
import { useToast } from "../ui/ToastProvider";

const initialForm = { caption: "", file: null, visibility: "PRIVATE" };
const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40";

export function UploadPhotoModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);
  const toast = useToast();

  const handleFile = (e) => {
    const file = e.target.files[0] || null;
    setForm({ ...form, file });
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.file) {
      toast.error("Select an image first");
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal title="Upload photo" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {preview && (
          <img src={preview} alt="Selected preview" className="h-40 w-full object-cover border border-[var(--line)]" />
        )}
        <input
          type="file"
          accept="image/*"
          required
          onChange={handleFile}
          className="w-full text-xs text-[var(--ink)]/60 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-[var(--line)] file:text-xs file:font-medium file:bg-[var(--paper)] file:text-[var(--ink)]"
        />
        <input
          type="text"
          placeholder="Caption / description"
          value={form.caption}
          onChange={(e) => setForm({ ...form, caption: e.target.value })}
          className={inputClass}
        />
        <select
          value={form.visibility}
          onChange={(e) => setForm({ ...form, visibility: e.target.value })}
          className={inputClass}
        >
          <option value="PRIVATE">Keep private to department</option>
          <option value="PUBLIC">Publish to public feed</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--ink)] text-white rounded-md py-2.5 font-medium text-sm hover:bg-[#2A3547] transition disabled:opacity-50"
        >
          {submitting ? "Uploading..." : "Upload photo"}
        </button>
      </form>
    </Modal>
  );
}
