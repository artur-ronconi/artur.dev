export type MediaKind = "IMAGE" | "VIDEO";

export type MediaItem = { kind: MediaKind; url: string; caption: string | null };

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

/** Id do vídeo quando a URL é do YouTube (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string): string | null {
  return url.match(YOUTUBE)?.[1] ?? null;
}

/** Deduz se um link colado no painel é de imagem ou de vídeo. */
export function mediaKindFromUrl(url: string): MediaKind {
  const path = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return youtubeId(url) || /\.(mp4|webm|mov|m4v|ogv)$/.test(path) ? "VIDEO" : "IMAGE";
}

export function mediaKindFromMime(mime: string): MediaKind {
  return mime.startsWith("video/") ? "VIDEO" : "IMAGE";
}

/** Miniatura de um vídeo do YouTube; vídeos enviados usam o próprio arquivo. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Imagens de outros domínios não passam pelo otimizador do Next. */
export const isExternalUrl = (url: string) => /^https?:\/\//.test(url);
