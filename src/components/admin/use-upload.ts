"use client";

import { useCallback } from "react";

import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";

export type UploadedFile = { url: string; mimeType: string };

/**
 * Envia um arquivo para /api/admin/upload (disco local em desenvolvimento,
 * bucket S3 em produção). Erros já aparecem como toast; devolve `null` neles.
 */
export function useUpload() {
  const csrf = useCsrf();
  const toast = useToast();

  return useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      try {
        const body = new FormData();
        body.append("file", file);

        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body,
          headers: { "x-csrf-token": csrf },
        });
        const data = (await response.json()) as
          | { ok: true; asset: UploadedFile }
          | { ok: false; message: string };

        if (!data.ok) {
          toast.error(`${file.name}: ${data.message}`);
          return null;
        }
        return data.asset;
      } catch {
        toast.error(`Falha ao enviar ${file.name}.`);
        return null;
      }
    },
    [csrf, toast],
  );
}
