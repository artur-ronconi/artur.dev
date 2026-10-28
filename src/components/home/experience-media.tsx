"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

import { isExternalUrl, youtubeId, youtubeThumbnail, type MediaItem } from "@/lib/media";

/**
 * Fotos e vídeos de uma experiência: miniaturas que abrem em um visualizador
 * em tela cheia, navegável por teclado (← → e Esc).
 */
export function ExperienceMedia({ items, company }: { items: MediaItem[]; company: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((current) => (current === null ? current : (current + delta + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [close, move, openIndex]);

  if (items.length === 0) return null;
  const active = openIndex === null ? null : items[openIndex];
  const describe = (item: MediaItem, index: number) =>
    item.caption ?? `${item.kind === "VIDEO" ? "Vídeo" : "Foto"} ${index + 1} de ${company}`;

  return (
    <>
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item, index) => {
          const youtube = item.kind === "VIDEO" ? youtubeId(item.url) : null;
          const still = item.kind === "IMAGE" ? item.url : youtube ? youtubeThumbnail(youtube) : null;

          return (
            <li key={`${item.url}-${index}`}>
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                aria-label={`Abrir ${describe(item, index)}`}
                className="group/media relative block h-[72px] w-28 overflow-hidden rounded-lg border border-line bg-base-900 transition-colors hover:border-accent/60 sm:h-20 sm:w-32"
              >
                {still ? (
                  <Image
                    src={still}
                    alt=""
                    fill
                    sizes="128px"
                    unoptimized={isExternalUrl(still)}
                    className="object-cover transition-transform duration-300 group-hover/media:scale-105"
                  />
                ) : (
                  // #t=0.1 faz o navegador mostrar o primeiro quadro como miniatura.
                  <video
                    src={`${item.url}#t=0.1`}
                    preload="metadata"
                    muted
                    playsInline
                    tabIndex={-1}
                    className="h-full w-full object-cover"
                  />
                )}
                {item.kind === "VIDEO" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-base-950/25">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-base-950/80 text-accent">
                      <Play size={13} fill="currentColor" aria-hidden />
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* No <body>: o cartão ganha `transform` no hover, o que prenderia um `fixed` dentro dele. */}
      {active && openIndex !== null
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={describe(active, openIndex)}
              className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-base-950/92 p-4 backdrop-blur-sm sm:p-8"
              onClick={close}
            >
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                autoFocus
                className="absolute right-4 top-4 rounded-lg border border-line bg-base-850 p-2 text-ink-muted transition-colors hover:text-ink"
              >
                <X size={18} />
              </button>

              <div
                className="relative flex max-h-[80vh] w-full max-w-5xl items-center justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                <Viewer key={active.url} item={active} label={describe(active, openIndex)} />
              </div>

              <div
                className="flex w-full max-w-5xl items-center justify-between gap-4"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="min-w-0 text-[13px] text-ink-muted">
                  {active.caption ?? ""}
                  <span className="ml-2 font-mono text-[11px] text-ink-faint">
                    {openIndex + 1}/{items.length}
                  </span>
                </p>
                {items.length > 1 ? (
                  <span className="flex shrink-0 gap-1.5">
                    <NavButton label="Anterior" onClick={() => move(-1)}>
                      <ChevronLeft size={16} />
                    </NavButton>
                    <NavButton label="Próxima" onClick={() => move(1)}>
                      <ChevronRight size={16} />
                    </NavButton>
                  </span>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Viewer({ item, label }: { item: MediaItem; label: string }) {
  const youtube = item.kind === "VIDEO" ? youtubeId(item.url) : null;

  if (youtube) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`}
        title={label}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="aspect-video w-full rounded-xl border border-line bg-black"
      />
    );
  }

  if (item.kind === "VIDEO") {
    return (
      <video
        src={item.url}
        controls
        autoPlay
        playsInline
        aria-label={label}
        className="max-h-[80vh] w-full rounded-xl border border-line bg-black"
      />
    );
  }

  return (
    <Image
      src={item.url}
      alt={label}
      width={1600}
      height={1000}
      sizes="(max-width: 1024px) 100vw, 1024px"
      unoptimized={isExternalUrl(item.url)}
      className="max-h-[80vh] w-auto max-w-full rounded-xl border border-line object-contain"
    />
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-lg border border-line bg-base-850 p-2 text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
    >
      {children}
    </button>
  );
}
