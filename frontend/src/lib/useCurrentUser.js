"use client";

import { useMemo, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getServerSnapshot = () => "";

function getUserCookieSnapshot() {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/(?:^|; )user=([^;]*)/)?.[1] || "";
}

export function useCurrentUser() {
  const encodedUser = useSyncExternalStore(
    subscribe,
    getUserCookieSnapshot,
    getServerSnapshot,
  );

  return useMemo(() => {
    if (!encodedUser) return null;
    try {
      return JSON.parse(decodeURIComponent(encodedUser));
    } catch {
      return null;
    }
  }, [encodedUser]);
}
