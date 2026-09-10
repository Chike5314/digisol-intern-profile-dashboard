import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useToast } from "../ui/ToastProvider";
import { fetchPublicDepartments } from "../../api/departments";

const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-[var(--surface)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--steel)] transition placeholder:text-[var(--ink)]/40";

export function CompleteProfileModal({ onComplete }) {
  const [role, setRole] = useState("MEMBER");
  const [department, setDepartment] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [departments, setDepartments] = useState([]);
  const [deptStatus, setDeptStatus] = useState("loading");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchPublicDepartments()
      .then((names) => {
        if (cancelled) return;
        setDepartments(names);
        setDeptStatus("ready");
      })
      .catch(() => !cancelled && setDeptStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalDepartment = "";
    if (role === "MEMBER") {
      if (!department) {
        toast.error("Choose the department you're joining");
        return;
      }
      finalDepartment = department;
    } else if (role === "LEAD") {
      if (!newDepartmentName.trim()) {
        toast.error("Name the department you're leading");
        return;
      }
      finalDepartment = newDepartmentName.trim();
    }

    setSubmitting(true);
    try {
      await onComplete({ department: finalDepartment, role });
    } catch (err) {
      toast.error(err.message || "Couldn't save your profile — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="A couple more details" onClose={() => {}} dismissable={false}>
      <p className="text-sm text-[var(--ink)]/60 mb-4">
        You signed in with Google, which skips the usual sign-up form. Tell us your role to finish setting up your account.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
          <option value="MEMBER">Member — join an existing department</option>
          <option value="LEAD">Lead — register a new department</option>
          <option value="VISITOR">Visitor — browse the public feed only</option>
        </select>

        {role === "MEMBER" && (
          <>
            {deptStatus === "loading" && <p className="text-xs text-[var(--ink)]/45">Loading departments...</p>}
            {deptStatus === "error" && <p className="text-xs text-[#B5432F]">Couldn't load departments — try again shortly.</p>}
            {deptStatus === "ready" && departments.length === 0 && (
              <p className="text-xs text-[var(--ink)]/55">No departments exist yet — ask a lead to sign up first, or choose Lead above.</p>
            )}
            {deptStatus === "ready" && departments.length > 0 && (
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
                <option value="">Choose a department...</option>
                {departments.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </>
        )}

        {role === "LEAD" && (
          <input
            type="text"
            placeholder="Department name (e.g. SoftwareEngineering)"
            required
            value={newDepartmentName}
            onChange={(e) => setNewDepartmentName(e.target.value)}
            className={inputClass}
          />
        )}

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
