"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSavedIds,
  getSavedIdsServer,
  subscribeSaved,
  toggleSaved as writeToggle,
} from "./saved";

export function useSavedIds(): string[] {
  return useSyncExternalStore(subscribeSaved, getSavedIds, getSavedIdsServer);
}

export function useSaved(id?: string) {
  const ids = useSavedIds();
  const saved = id ? ids.includes(id) : false;
  const toggle = useCallback(() => {
    if (!id) return false;
    return writeToggle(id);
  }, [id]);
  return { ids, saved, toggle, count: ids.length };
}
