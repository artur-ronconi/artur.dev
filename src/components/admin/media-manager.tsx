"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, Copy, Loader2, Trash2, Upload } from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteMediaAction } from "@/server/actions/portfolio";

type Asset = { id: string; url: string; alt: string | null; mimeType: string; size: number };

export function MediaManager({ assets, driver }: { assets: Asset[]; driver: string }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body,
          headers: { "x-csrf-token": csrf },
        });
        const data = (await response.json()) as { ok: boolean; message?: string };

        if (!data.ok) {
          toast.error(data.message ?? "Falha no envio.");
          return;
        }
      }
      toast.success("Upload concluído.");
      router.refresh();
    } catch {
      toast.error("Falha ao enviar o arquivo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Enviar imagens e vídeos</h2>
          <p className="mt-1 text-[12.5px] text-ink-faint">
            Driver de armazenamento ativo: <span className="font-mono text-accent">{driver}</span>
            {driver === "local"
              ? " — os arquivos ficam em ./public/uploads (apenas para desenvolvimento)."
              : " — os arquivos vão para o bucket S3 configurado."}
          </p>
        </div>

        <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Enviando…" : "Enviar arquivos"}
        </Button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files);
          }}
        />
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={<Upload size={20} />}
          title="Nenhuma imagem enviada"
          description="Envie capas, screenshots e diagramas para reutilizar nos projetos."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id} className="panel overflow-hidden">
              <div className="relative aspect-[4/3] w-full bg-base-900">
                {asset.mimeType.startsWith("video/") ? (
                  <video src={`${asset.url}#t=0.1`} preload="metadata" controls muted className="h-full w-full object-contain" />
                ) : asset.mimeType === "application/pdf" ? (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-full w-full items-center justify-center font-mono text-[12px] text-ink-muted hover:text-accent"
                  >
                    PDF · abrir
                  </a>
                ) : (
                  <Image
                    src={asset.url}
                    alt={asset.alt ?? ""}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                <span className="truncate font-mono text-[11px] text-ink-faint">
                  {asset.size >= 1024 * 1024
                    ? `${(asset.size / 1024 / 1024).toFixed(1)} MB`
                    : `${(asset.size / 1024).toFixed(0)} KB`}
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Copiar URL"
                    onClick={() => {
                      void navigator.clipboard?.writeText(asset.url);
                      setCopied(asset.id);
                      setTimeout(() => setCopied(null), 1500);
                    }}
                    className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-accent"
                  >
                    {copied === asset.id ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  </button>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    className="!px-1.5 text-ink-muted hover:text-rose"
                    title="Remover arquivo?"
                    description="O arquivo será apagado do armazenamento. Projetos e experiências que o utilizam ficarão sem ele."
                    confirmLabel="Remover"
                    onConfirm={async () => {
                      const result = await deleteMediaAction(csrf, asset.id);
                      if (result.ok) {
                        toast.success(result.message ?? "Removida.");
                        router.refresh();
                      } else {
                        toast.error(result.message);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </ConfirmButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
