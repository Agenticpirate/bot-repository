"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCatalog, type Catalog } from "./catalog";

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setCatalog(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCatalog({ reload: attempt > 0 })
      .then((value) => {
        if (!cancelled) {
          setCatalog(value);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load index");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { catalog, error, retry };
}
