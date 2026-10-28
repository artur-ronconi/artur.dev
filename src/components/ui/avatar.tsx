import Image from "next/image";

import { isExternalUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Foto de perfil em recorte circular, com um anel no verde do site. A imagem
 * pode ter qualquer proporção: ela preenche o círculo e o excesso é cortado.
 */
export function Avatar({
  src,
  alt,
  size,
  priority = false,
  online = false,
  className,
}: {
  src: string;
  alt: string;
  /** Diâmetro em pixels. */
  size: number;
  priority?: boolean;
  /** Mostra o ponto de "disponível" sobre a foto. */
  online?: boolean;
  className?: string;
}) {
  const dot = Math.max(10, Math.round(size * 0.17));

  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <span className="block h-full w-full rounded-full bg-gradient-to-br from-accent via-accent-strong to-emerald p-[3px]">
        <span className="relative block h-full w-full overflow-hidden rounded-full border-2 border-base-950 bg-base-800">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={`${size}px`}
            priority={priority}
            unoptimized={isExternalUrl(src)}
            className="object-cover"
          />
        </span>
      </span>

      {online ? (
        <span
          aria-hidden
          className="absolute rounded-full border-2 border-base-950 bg-accent"
          style={{ width: dot, height: dot, right: size * 0.04, bottom: size * 0.04 }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
        </span>
      ) : null}
    </span>
  );
}
