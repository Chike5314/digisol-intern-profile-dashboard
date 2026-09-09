import { useState } from "react";
import { Modal } from "./Modal";
import { UserCircle } from "lucide-react";

const initialForm = { name: "", role: "", institution: "", visibility: "PRIVATE", avatarFile: null };

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
    <Modal title="Add Department Intern" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 overflow-hidden">
            {preview ? (
              <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
            ) : (
              <UserCircle size={28} className="text-slate-400" />
            )}
          </div>
          <label className="flex-1 text-xs text-slate-500 cursor-pointer">
            <span className="inline-block mb-1 font-semibold text-slate-600">Avatar (optional)</span>
            <input type="file" accept="image/*" onChange={handleFile} className="block w-full text-xs" />
          </label>
        </div>

        <input
          type="text"
          placeholder="Full Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border p-2.5 text-sm outline-none"
        />
        <input
          type="text"
          placeholder="Role / Specialization"
          required
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full rounded-xl border p-2.5 text-sm outline-none"
        />
        <input
          type="text"
          placeholder="Institution"
          required
          value={form.institution}
          onChange={(e) => setForm({ ...form, institution: e.target.value })}
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
          className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Create Profile"}
        </button>
      </form>
    </Modal>
  );
}
