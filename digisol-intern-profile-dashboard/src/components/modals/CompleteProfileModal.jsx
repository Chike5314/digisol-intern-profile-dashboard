import { useState } from "react";
import { Modal } from "./Modal";
import { useToast } from "../ui/ToastProvider";

const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40";

export function CompleteProfileModal({ onComplete }) {
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department.trim()) return;
    setSubmitting(true);
    try {
      await onComplete({ department: department.trim(), role });
      toast.success(`Welcome to ${department.trim()}`);
    } catch (err) {
      toast.error(err.message || "Couldn't save your profile — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="A couple more details" onClose={() => {}} dismissable={false}>
      <p className="text-sm text-[var(--ink)]/60 mb-4">
        You signed in with Google, which skips the usual sign-up form. Tell us your department and role to finish setting up your account.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Department (e.g. SoftwareEngineering)"
          required
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={inputClass}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
          <option value="MEMBER">Member</option>
          <option value="LEAD">Lead</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--ink)] text-white rounded-md py-2.5 font-medium text-sm hover:bg-[#2A3547] transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </Modal>
  );
}
