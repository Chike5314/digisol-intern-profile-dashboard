import { useCallback, useEffect, useState } from "react";
import { getWorkspace } from "../api/interns";

export function useWorkspace(api) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");

  const refetch = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api(getWorkspace);
      setItems(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      console.error("Error fetching workspace:", err);
      setStatus("error");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; setState happens after the awaited call, not synchronously
    refetch();
  }, [refetch]);

  return { items, status, refetch };
}
