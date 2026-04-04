"use client";

import { Provider } from "react-redux";
import { useMemo } from "react";

import { makeStore, setupStoreListeners } from "@/app/lib/state/store";

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => {
    const s = makeStore();
    setupStoreListeners(s);
    return s;
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
