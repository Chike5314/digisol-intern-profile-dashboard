import { useState } from "react";
import { Modal } from "./Modal";
import { UserCircle } from "lucide-react";

const initialForm = { name: "", role: "", institution: "", visibility: "PRIVATE", avatarFile: null };
const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40";

export function AddInternModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0] || null;
    setForm({ ...form, avatarFile: file });
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal title="Add intern" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
            {preview ? (
              <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <UserCircle size={26} className="text-[var(--ink)]/30" />
            )}
          </div>
          <label className="flex-1 text-xs text-[var(--ink)]/50 cursor-pointer">
            <span className="inline-block mb-1 font-medium text-[var(--ink)]/70">Photo (optional)</span>
            <input type="file" accept="image/*" onChange={handleFile} className="block w-full text-xs" />
          </label>
        </div>

        <input
          type="text"
          placeholder="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Role / specialization"
          required
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Institution"
          required
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
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
          {submitting ? "Saving..." : "Add intern"}
        </button>
      </form>
    </Modal>
  );
}
