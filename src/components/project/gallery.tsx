"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
};

/** Screenshot grid with a keyboard-navigable lightbox. */
export function Gallery({ images, columns = 2 }: { images: GalleryImage[]; columns?: 2 | 3 }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? current : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [close, move, openIndex]);

  if (images.length === 0) return null;
  const active = openIndex === null ? null : images[openIndex];

  return (
    <>
      <ul className={`grid gap-4 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {images.map((image, index) => (
          <li key={image.id}>
            <figure className="panel panel-hover overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIndex(index)}
                className="group relative block aspect-[16/10] w-full overflow-hidden bg-base-900"
                aria-label={`Ampliar imagem: ${image.alt}`}
              >
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-base-950/0 opacity-0 transition-all duration-200 group-hover:bg-base-950/40 group-hover:opacity-100">
                  <ZoomIn size={22} className="text-ink" aria-hidden />
                </span>
              </button>
              {image.caption ? (
                <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
                  {image.caption}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-base-950/95 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="absolute right-5 top-5 rounded-lg border border-line bg-base-850 p-2 text-ink-muted hover:text-ink"
          >
            <X size={18} />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={(event) => {
                  event.stopPropagation();
                  move(-1);
                }}
                className="absolute left-4 rounded-lg border border-line bg-base-850 p-2 text-ink-muted hover:text-ink"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={(event) => {
                  event.stopPropagation();
                  move(1);
                }}
                className="absolute right-4 top-1/2 rounded-lg border border-line bg-base-850 p-2 text-ink-muted hover:text-ink"
              >
                <ChevronRight size={20} />
              </button>
            </>
          ) : null}

          <figure
            className="relative max-h-[82vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={active.url}
              alt={active.alt}
              width={1600}
              height={1000}
              className="h-auto max-h-[75vh] w-full rounded-xl border border-line object-contain"
            />
            {active.caption ? (
              <figcaption className="mt-3 text-center text-[13px] text-ink-muted">{active.caption}</figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </>
  );
}
