import { useCallback } from "react";

export function useApi(signOut) {
  return useCallback((fn, ...args) => fn(...args, { onSessionExpired: signOut }), [signOut]);
}
