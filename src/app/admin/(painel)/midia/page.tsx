import { PageHeader } from "@/components/admin/shell";
import { MediaManager } from "@/components/admin/media-manager";
import { listMedia } from "@/server/modules/media";

export default async function AdminMediaPage() {
  const assets = await listMedia();

  return (
    <>
      <PageHeader
        title="Mídia"
        description="Biblioteca de imagens usada por capas, galerias e diagramas dos projetos."
      />

      <MediaManager
        driver={process.env.STORAGE_DRIVER ?? "local"}
        assets={assets.map((asset) => ({
          id: asset.id,
          url: asset.url,
          alt: asset.alt,
          mimeType: asset.mimeType,
          size: asset.size,
        }))}
      />
    </>
  );
}
