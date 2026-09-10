import { useCallback, useEffect, useState } from "react";
import { fetchUserAttributes, updateUserAttributes } from "aws-amplify/auth";

export function useUserAttrs() {
  const [state, setState] = useState({
    department: "General",
    role: "MEMBER",
    needsOnboarding: false,
    loading: true,
  });

  const load = useCallback(async () => {
    try {
      const raw = await fetchUserAttributes();
      const rawDepartment = raw["custom:department"];
      const rawRole = raw["custom:role"];
      setState({
        department: rawDepartment || "",
        role: rawRole || "MEMBER",
        // custom:role is only ever set by our sign-up form (or the completion
        // modal). A federated (Google) sign-in skips both entirely, so a
        // missing ROLE means this person hasn't completed that step. Missing
        // department alone is NOT a signal — VISITOR accounts legitimately
        // have no department by design.
        needsOnboarding: !rawRole || ((rawRole === "MEMBER" || rawRole === "LEAD") && !rawDepartment),
        loading: false,
      });
    } catch (err) {
      console.error("Error loading user attributes:", err);
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; setState happens after the awaited call, not synchronously
    load();
  }, [load]);

  const completeProfile = useCallback(
    async ({ department, role }) => {
      await updateUserAttributes({
        userAttributes: {
          "custom:department": department,
          "custom:role": role,
        },
      });
      await load();
    },
    [load]
  );

  return { ...state, completeProfile };
}
