import "server-only";

import { prisma } from "@/server/db/prisma";
import { removeFile, storeFile } from "@/server/storage";

export async function uploadMedia(file: File, alt?: string) {
  const stored = await storeFile(file);

  return prisma.mediaAsset.create({
    data: {
      key: stored.key,
      url: stored.url,
      mimeType: file.type,
      size: file.size,
      alt: alt?.trim() || null,
    },
  });
}

export async function listMedia(take = 60) {
  return prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take });
}

export async function deleteMedia(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return;

  await removeFile(asset.key);
  await prisma.mediaAsset.delete({ where: { id } });
}
