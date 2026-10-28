"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageOff, Loader2, Upload, X } from "lucide-react";

import { useUpload } from "@/components/admin/use-upload";
import { useToast } from "@/components/admin/toast";
import { Input } from "@/components/ui/field";
import { isExternalUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Image input with upload: sends the file to /api/admin/upload (local disk in
 * development, S3-compatible bucket in production) and stores the public URL.
 */
export function ImageField({
  value,
  onChange,
  label = "Imagem",
  id,
  shape = "wide",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  id?: string;
  /** A prévia segue o recorte usado no site: quadrado (ícones) ou circular (foto de perfil). */
  shape?: "wide" | "square" | "circle";
}) {
  const send = useUpload();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const stored = await send(file);
      if (stored) {
        onChange(stored.url);
        toast.success("Imagem enviada.");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "relative h-20 shrink-0 overflow-hidden border border-line bg-base-900",
            shape === "square" ? "w-20 rounded-xl" : shape === "circle" ? "w-20 rounded-full" : "w-32 rounded-lg",
          )}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="128px" unoptimized={isExternalUrl(value)} className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-ink-faint">
              <ImageOff size={18} aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            id={id}
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value || null)}
            placeholder="/uploads/… ou https://…"
            aria-label={`URL da ${label.toLowerCase()}`}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-accent disabled:opacity-60"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando…" : "Enviar arquivo"}
            </button>

            {value ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:text-rose"
              >
                <X size={13} /> Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
