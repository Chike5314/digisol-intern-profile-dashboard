import { useCallback, useEffect, useState } from "react";
import { registerDepartment, requestMembership, getMyMembershipStatus } from "../api/departments";

// Orchestrates what happens right after a user is known to have a real
// department/role: LEAD registers their department (idempotent), MEMBER
// requests to join theirs and waits for approval, VISITOR needs nothing.
export function useMembership(api, role, enabled) {
  const [status, setStatus] = useState("checking"); // checking | ready | pending | rejected | department-taken | error

  const check = useCallback(async () => {
    if (!enabled) return;
    setStatus("checking");

    if (role === "LEAD") {
      try {
        await api(registerDepartment);
        setStatus("ready");
      } catch (err) {
        // A 409 means another lead already owns this department name.
        setStatus(err.status === 409 ? "department-taken" : "error");
      }
      return;
    }

    if (role === "VISITOR") {
      setStatus("ready");
      return;
    }

    if (role === "MEMBER") {
      try {
        await api(requestMembership);
        const { status: s } = await api(getMyMembershipStatus);
        setStatus(s === "APPROVED" ? "ready" : s === "REJECTED" ? "rejected" : "pending");
      } catch {
        setStatus("error");
      }
      return;
    }

    setStatus("error");
  }, [api, role, enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setState happens after the awaited calls, not synchronously
    check();
  }, [check]);

  return { status, recheck: check };
}
