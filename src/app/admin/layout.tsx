import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Painel administrativo",
  robots: { index: false, follow: false, nocache: true },
};

/** Shared metadata for /admin; the guarded shell lives in the (painel) group. */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
