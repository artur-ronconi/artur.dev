"use client";

import { createContext, useContext, type ReactNode } from "react";

const CsrfContext = createContext<string>("");

export function CsrfProvider({ token, children }: { token: string; children: ReactNode }) {
  return <CsrfContext.Provider value={token}>{children}</CsrfContext.Provider>;
}

/** Double-submit token echoed on every admin mutation. */
export function useCsrf(): string {
  return useContext(CsrfContext);
}
