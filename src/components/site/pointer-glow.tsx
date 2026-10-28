"use client";

import { useEffect } from "react";

/**
 * Alimenta o "holofote" dos cartões: guarda a posição do cursor em --mx/--my no
 * cartão `.panel-hover` sob o ponteiro (o gradiente em si fica no globals.css).
 * Um único listener para a página inteira.
 */
export function PointerGlow() {
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>(".panel-hover") : null;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
