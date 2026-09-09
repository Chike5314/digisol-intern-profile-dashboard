import { useCallback, useEffect, useState } from "react";
import { getPublicFeed } from "../api/interns";

export function usePublicFeed(api) {
  const [feed, setFeed] = useState([]);
  const [status, setStatus] = useState("loading");

  const refetch = useCallback(async () => {
    setStatus("loading");
    try {
      const data = await api(getPublicFeed);
      setFeed(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      console.error("Error fetching public feed:", err);
      setStatus("error");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; setState happens after the awaited call, not synchronously
    refetch();
  }, [refetch]);

  return { feed, status, refetch };
}
