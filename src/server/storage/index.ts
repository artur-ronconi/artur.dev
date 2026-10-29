import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024; // 64 MB

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/gif",
] as const;

/** Formatos que os navegadores reproduzem direto na tag <video>. */
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

/** Documentos aceitos (currículo). Mesmo limite das imagens. */
export const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

const isOneOf = (types: readonly string[], mime: string) => types.includes(mime);

export type StoredFile = { key: string; url: string };

export class UploadError extends Error {}

function extensionFor(mime: string, fallbackName: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "application/pdf": "pdf",
  };
  return map[mime] ?? (path.extname(fallbackName).replace(".", "") || "bin");
}

function buildKey(fileName: string, mime: string): string {
  const base = slugify(path.basename(fileName, path.extname(fileName))) || "arquivo";
  const stamp = new Date().toISOString().slice(0, 10);
  return `uploads/${stamp}/${base}-${randomUUID().slice(0, 8)}.${extensionFor(mime, fileName)}`;
}

let s3: S3Client | null = null;

function s3Client(): S3Client {
  if (s3) return s3;

  const config = env();
  if (!config.S3_BUCKET) {
    throw new UploadError(
      "STORAGE_DRIVER=s3 exige S3_BUCKET. Configure as variáveis de ambiente do bucket.",
    );
  }

  s3 = new S3Client({
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
    ...(config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: config.S3_ACCESS_KEY_ID,
            secretAccessKey: config.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  return s3;
}

function publicUrlFor(key: string): string {
  const config = env();
  if (config.S3_PUBLIC_URL) return `${config.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  if (config.S3_ENDPOINT) {
    return `${config.S3_ENDPOINT.replace(/\/$/, "")}/${config.S3_BUCKET}/${key}`;
  }
  return `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`;
}

/**
 * Persists an uploaded image or video. Local driver writes to ./public/uploads
 * (dev); the s3 driver targets any S3-compatible bucket (AWS S3, R2, MinIO).
 */
export async function storeFile(file: File): Promise<StoredFile> {
  const video = isOneOf(VIDEO_MIME_TYPES, file.type);
  if (!video && !isOneOf(IMAGE_MIME_TYPES, file.type) && !isOneOf(DOCUMENT_MIME_TYPES, file.type)) {
    throw new UploadError(
      `Formato não suportado: ${file.type || "desconhecido"}. Envie imagens (JPG, PNG, WebP, AVIF, SVG, GIF), vídeos (MP4, WebM) ou PDF.`,
    );
  }

  const limit = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    throw new UploadError(
      `${video ? "Vídeo" : "Imagem"} muito grande (máximo ${limit / 1024 / 1024} MB).`,
    );
  }

  const key = buildKey(file.name, file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (env().STORAGE_DRIVER === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: env().S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: publicUrlFor(key) };
  }

  const target = path.join(process.cwd(), "public", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return { key, url: `/${key}` };
}

export async function removeFile(key: string): Promise<void> {
  if (env().STORAGE_DRIVER === "s3") {
    await s3Client().send(new DeleteObjectCommand({ Bucket: env().S3_BUCKET, Key: key }));
    return;
  }

  await unlink(path.join(process.cwd(), "public", key)).catch(() => {
    // Already gone — nothing to clean up.
  });
}
