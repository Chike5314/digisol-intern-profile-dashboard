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
        department: rawDepartment || "General",
        role: rawRole || "MEMBER",
        // custom:department/custom:role are only ever set by the email/password
        // sign-up form. A federated (Google) sign-in skips that form entirely,
        // so a missing value here means this person hasn't completed that step.
        needsOnboarding: !rawDepartment || !rawRole,
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
