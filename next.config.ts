import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

// Allow images served from the configured S3/CDN origin (optional in local dev).
for (const origin of [process.env.S3_PUBLIC_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
  if (!origin) continue;
  try {
    const url = new URL(origin);
    remotePatterns.push({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/**",
    });
  } catch {
    // Ignore malformed values so a bad env var never breaks the build.
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Gera um servidor autocontido em .next/standalone (usado pela imagem Docker).
  output: "standalone",
  // Só WebP: gerar AVIF custa muita CPU/memória e o servidor alvo é uma t4g.nano.
  images: { remotePatterns, formats: ["image/webp"] },
  experimental: { optimizePackageImports: ["lucide-react"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // O painel nunca deve ser cacheado por proxies ou pelo navegador.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
