import { useEffect, useState } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";

export function useUserAttrs() {
  const [attrs, setAttrs] = useState({ department: "General", role: "MEMBER" });

  useEffect(() => {
    let cancelled = false;
    fetchUserAttributes()
      .then((raw) => {
        if (cancelled) return;
        setAttrs({
          department: raw["custom:department"] || "General",
          role: raw["custom:role"] || "MEMBER",
        });
      })
      .catch((err) => console.error("Error loading user attributes:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return attrs;
}
