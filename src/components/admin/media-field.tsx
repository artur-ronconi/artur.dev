"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Film, ImageIcon, Link2, Loader2, Play, Trash2, Upload } from "lucide-react";

import { useUpload } from "@/components/admin/use-upload";
import { Input } from "@/components/ui/field";
import {
  isExternalUrl,
  mediaKindFromMime,
  mediaKindFromUrl,
  youtubeId,
  youtubeThumbnail,
  type MediaItem,
} from "@/lib/media";

/**
 * Galeria de fotos e vídeos: envia vários arquivos de uma vez (ou adiciona por
 * link, inclusive do YouTube), com legenda e ordenação.
 */
export function MediaField({ items, onChange }: { items: MediaItem[]; onChange: (items: MediaItem[]) => void }) {
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [link, setLink] = useState("");

  const addFiles = async (files: File[]) => {
    setPending(files.length);
    const added: MediaItem[] = [];
    for (const file of files) {
      const stored = await upload(file);
      if (stored) added.push({ kind: mediaKindFromMime(stored.mimeType), url: stored.url, caption: null });
      setPending((count) => count - 1);
    }
    setPending(0);
    if (added.length > 0) onChange([...items, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const addLink = () => {
    const url = link.trim();
    if (!/^(https?:\/\/|\/)/.test(url)) return;
    onChange([...items, { kind: mediaKindFromUrl(url), url, caption: null }]);
    setLink("");
  };

  const update = (index: number, patch: Partial<MediaItem>) =>
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    if (moved) next.splice(target, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`} className="overflow-hidden rounded-lg border border-line bg-base-900">
              <div className="relative aspect-video w-full bg-base-950">
                <MediaPreview item={item} />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-base-950/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink">
                  {item.kind === "VIDEO" ? <Film size={10} /> : <ImageIcon size={10} />}
                  {item.kind === "VIDEO" ? "vídeo" : "foto"}
                </span>
              </div>

              <div className="space-y-2 p-2">
                <Input
                  value={item.caption ?? ""}
                  onChange={(event) => update(index, { caption: event.target.value || null })}
                  placeholder="Legenda (opcional)"
                  aria-label={`Legenda da mídia ${index + 1}`}
                  className="!py-1.5 text-[12.5px]"
                />
                <div className="flex items-center justify-between">
                  <span className="flex gap-1">
                    <CardButton label="Mover para antes" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ChevronLeft size={13} />
                    </CardButton>
                    <CardButton label="Mover para depois" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                      <ChevronRight size={13} />
                    </CardButton>
                  </span>
                  <CardButton
                    label="Remover mídia"
                    onClick={() => onChange(items.filter((_, position) => position !== index))}
                    danger
                  >
                    <Trash2 size={13} />
                  </CardButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line bg-base-900/60 px-4 py-5 text-center text-[13px] text-ink-faint">
          Nenhuma foto ou vídeo ainda.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending > 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-base-800 px-3 text-[12.5px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-60"
        >
          {pending > 0 ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {pending > 0 ? `Enviando… (${pending} restante${pending > 1 ? "s" : ""})` : "Enviar fotos ou vídeos"}
        </button>

        <div className="flex min-w-[240px] flex-1 items-center gap-2">
          <Input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLink();
              }
            }}
            placeholder="…ou cole um link (imagem, vídeo .mp4 ou YouTube)"
            aria-label="Link de imagem ou vídeo"
            className="!py-2 text-[12.5px]"
          />
          <button
            type="button"
            onClick={addLink}
            disabled={!/^(https?:\/\/|\/)/.test(link.trim())}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
          >
            <Link2 size={13} /> Adicionar
          </button>
        </div>
      </div>
      <p className="text-[12px] leading-snug text-ink-faint">
        Imagens até 8 MB (JPG, PNG, WebP, AVIF, SVG, GIF) e vídeos até 64 MB (MP4 ou WebM). Para vídeos maiores, use
        um link do YouTube.
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif,video/mp4,video/webm"
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) void addFiles(files);
        }}
      />
    </div>
  );
}

function MediaPreview({ item }: { item: MediaItem }) {
  const youtube = item.kind === "VIDEO" ? youtubeId(item.url) : null;

  if (item.kind === "IMAGE" || youtube) {
    const src = youtube ? youtubeThumbnail(youtube) : item.url;
    return (
      <>
        <Image src={src} alt="" fill sizes="320px" unoptimized={isExternalUrl(src)} className="object-cover" />
        {youtube ? <PlayBadge /> : null}
      </>
    );
  }

  return (
    <>
      {/* #t=0.1 faz o navegador mostrar o primeiro quadro como miniatura. */}
      <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
      <PlayBadge />
    </>
  );
}

function PlayBadge() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-base-950/75 text-accent">
        <Play size={15} fill="currentColor" aria-hidden />
      </span>
    </span>
  );
}

function CardButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded border border-line p-1.5 text-ink-faint transition-colors disabled:opacity-30 ${
        danger ? "hover:text-rose" : "hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
