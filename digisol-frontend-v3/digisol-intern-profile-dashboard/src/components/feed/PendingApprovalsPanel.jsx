import { useCallback, useEffect, useState } from "react";
import { UserCheck, Check, X } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { getPendingMembers, reviewPendingMember } from "../../api/departments";
import { useToast } from "../ui/ToastProvider";

export function PendingApprovalsPanel({ api }) {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [actingOn, setActingOn] = useState(null);
  const toast = useToast();

  const refetch = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api(getPendingMembers);
      setMembers(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      console.error("Error fetching pending members:", err);
      setStatus("error");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens after the awaited call
    refetch();
  }, [refetch]);

  const handleReview = async (userId, decision) => {
    setActingOn(userId);
    try {
      await api(reviewPendingMember, userId, decision);
      toast.success(decision === "APPROVED" ? "Member approved" : "Request declined");
      refetch();
    } catch (err) {
      toast.error(err.message || "Couldn't update this request");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Pending approvals</h2>
      <p className="text-sm text-[var(--ink)]/55 mt-0.5 mb-7">People requesting to join your department.</p>

      {status === "loading" && <p className="text-sm text-[var(--ink)]/45">Loading...</p>}
      {status === "error" && <EmptyState title="Couldn't load requests" subtitle="Check your connection and try again." />}
      {status === "ready" && members.length === 0 && (
        <EmptyState title="No pending requests" subtitle="New membership requests will show up here." />
      )}

      {status === "ready" && members.length > 0 && (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between border border-[var(--line)] bg-[var(--surface)] rounded-md px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <UserCheck size={18} className="text-[var(--steel)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{m.userEmail || "Unknown email"}</p>
                  <p className="text-xs text-[var(--ink)]/45">Requested {new Date(m.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReview(m.userId, "APPROVED")}
                  disabled={actingOn === m.userId}
                  aria-label="Approve"
                  className="flex items-center gap-1 text-xs bg-[var(--moss)]/10 text-[var(--moss)] px-3 py-1.5 rounded-md hover:bg-[var(--moss)]/20 font-medium transition disabled:opacity-50"
                >
                  <Check size={13} /> Approve
                </button>
                <button
                  onClick={() => handleReview(m.userId, "REJECTED")}
                  disabled={actingOn === m.userId}
                  aria-label="Reject"
                  className="flex items-center gap-1 text-xs text-[#B5432F] px-3 py-1.5 rounded-md hover:bg-[#B5432F]/10 font-medium transition disabled:opacity-50"
                >
                  <X size={13} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
