import * as simpleIcons from "simple-icons";

import { cn } from "@/lib/utils";

/**
 * Renders a technology logo as inline SVG.
 *
 * Resolution order:
 *  1. local registry — AWS service marks and anything simple-icons does not ship;
 *  2. simple-icons — official brand paths (Node.js, Docker, Terraform, …);
 *  3. a neutral monogram fallback, so an unknown slug never breaks the layout.
 *
 * Import this only from server components: `simple-icons` is a large package
 * and must never reach the client bundle.
 */

type Glyph = { path: string; hex: string; title: string; viewBox?: string };

const LOCAL_ICONS: Record<string, Glyph> = {
  // AWS marks are not distributed by simple-icons, so these are neutral
  // geometric glyphs that stand in for each service.
  aws: {
    title: "AWS",
    hex: "FF9900",
    path: "M6.6 14.2c-1.1 0-2-.3-2.7-1a3.4 3.4 0 0 1-1-2.6c0-1 .3-2 1-2.7a3.5 3.5 0 0 1 2.3-1.1 4.7 4.7 0 0 1 8.8-1.4 3.9 3.9 0 0 1 1.3-.2 4 4 0 0 1 4 4 3.7 3.7 0 0 1-.6 2 4 4 0 0 1-3.4 1.9H6.6Zm-3.2 3.3a.9.9 0 0 1 0-1.8h17.2a.9.9 0 0 1 0 1.8H3.4Zm3.4 2.9a.9.9 0 0 1 0-1.8h10.4a.9.9 0 0 1 0 1.8H6.8Z",
  },
  "aws-lambda": {
    title: "AWS Lambda",
    hex: "ED7100",
    path: "M3 3h5.3l8.9 18H12L9.9 16.4 7.6 21H2l5-9.8L3 3Zm3.4 2 3.8 7.9-2.1 4.2h1.6l5.8-11.9L13.9 5H6.4Z",
  },
  "amazon-s3": {
    title: "Amazon S3",
    hex: "569A31",
    path: "M5 3h14l1.6 15.4c.1 1-.4 1.6-1.3 2A14.6 14.6 0 0 1 12 21a14.6 14.6 0 0 1-7.3-1.6c-.9-.4-1.4-1-1.3-2L5 3Zm1.8 2-1.3 13c.3.5 2.7 1.1 6.5 1.1s6.2-.6 6.5-1.1L17.2 5H6.8Z",
  },
  "amazon-dynamodb": {
    title: "Amazon DynamoDB",
    hex: "4053D6",
    path: "M12 2c4.4 0 8 1.2 8 2.8v14.4C20 20.8 16.4 22 12 22s-8-1.2-8-2.8V4.8C4 3.2 7.6 2 12 2Zm6 6.6c-1.6.8-3.9 1.2-6 1.2s-4.4-.4-6-1.2v2.8c1.6.8 3.9 1.2 6 1.2s4.4-.4 6-1.2V8.6Zm0 5.6c-1.6.8-3.9 1.2-6 1.2s-4.4-.4-6-1.2V18c.5.7 2.9 1.5 6 1.5s5.5-.8 6-1.5v-3.8ZM12 4C9.1 4 6.6 4.6 6 5.3c.6.7 3.1 1.4 6 1.4s5.4-.7 6-1.4C17.4 4.6 14.9 4 12 4Z",
  },
  "amazon-ec2": {
    title: "Amazon EC2",
    hex: "ED7100",
    path: "M12 1.6 22 6.6v10.8l-10 5-10-5V6.6l10-5Zm0 2.3L4.6 7.5 12 11.2l7.4-3.7L12 3.9ZM4 9.2v7l7 3.5v-7L4 9.2Zm9 10.5 7-3.5v-7l-7 3.5v7Z",
  },
  "amazon-sqs": {
    title: "Amazon SQS",
    hex: "CC2264",
    path: "M3 4h8v5H3V4Zm0 7h8v5H3v-5Zm0 7h8v2.8H3V18Zm10.5-9.5h2.2V4.6a1 1 0 0 1 1.7-.7l3.3 3.4a1 1 0 0 1 0 1.4l-3.3 3.4a1 1 0 0 1-1.7-.7V8.5h-2.2v-2Zm0 9h2.2v-2.9a1 1 0 0 1 1.7-.7l3.3 3.4a1 1 0 0 1 0 1.4l-3.3 3.4a1 1 0 0 1-1.7-.7v-2.9h-2.2v-1Z",
  },
  "amazon-apigateway": {
    title: "Amazon API Gateway",
    hex: "A166FF",
    path: "M12 1.8 21 7v10l-9 5.2L3 17V7l9-5.2Zm0 2.3L5 8.1v7.8l7 4 7-4V8.1l-7-4ZM8.4 9.6h2v1.6h3.2V9.6h2l-3.6-3-3.6 3Zm7.2 4.8h-2v-1.6h-3.2v1.6h-2l3.6 3 3.6-3Z",
  },
  "amazon-cloudwatch": {
    title: "Amazon CloudWatch",
    hex: "E7157B",
    path: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-5 8.1h2.2l1.6-3.6 2.2 6 1.5-2.4H17v1.8h-1.5l-2.3 3.6-2.2-5.9-1.1 2.3H7v-1.8Z",
  },
  "amazon-ecs": {
    title: "Amazon ECS",
    hex: "ED7100",
    path: "M3 4h8v7H3V4Zm10 0h8v7h-8V4ZM3 13h8v7H3v-7Zm10 0h8v7h-8v-7Zm-8 2v3h4v-3H5Zm10 0v3h4v-3h-4ZM5 6v3h4V6H5Zm10 0v3h4V6h-4Z",
  },
  "amazon-vpc": {
    title: "Amazon VPC",
    hex: "8C4FFF",
    path: "M12 2 3 6.2v11.6L12 22l9-4.2V6.2L12 2Zm0 2.2 6.6 3.1L12 10.4 5.4 7.3 12 4.2ZM4.8 8.9 11 11.8v7.3l-6.2-2.9V8.9Zm8.2 10.2v-7.3l6.2-2.9v7.4L13 19.1Z",
  },
  "ci-cd": {
    title: "CI/CD",
    hex: "8CC84B",
    path: "M12 3a9 9 0 0 1 8.5 6h-2.2A7 7 0 0 0 5.3 11H8l-3.6 4.4L1 11h2.3A9 9 0 0 1 12 3Zm0 18a9 9 0 0 1-8.5-6h2.2A7 7 0 0 0 18.7 13H16l3.6-4.4L23 13h-2.3A9 9 0 0 1 12 21Z",
  },
  serverless: {
    title: "Serverless",
    hex: "FD5750",
    path: "M3 4.5h18v3H3v-3Zm0 5.5h12v3H3v-3Zm0 5.5h18v3H3v-3Zm14-5.5h4v3h-4v-3Z",
  },
  "rest-api": {
    title: "REST API",
    hex: "8CC84B",
    path: "M4 6h7v2H6v3h4v2H6v3h5v2H4V6Zm9 0h4.5A3.5 3.5 0 0 1 19 12.8L21 18h-2.2l-1.8-4.7H15V18h-2V6Zm2 2v3.4h2.5a1.7 1.7 0 0 0 0-3.4H15Z",
  },
  microservices: {
    title: "Microsserviços",
    hex: "8B7BF7",
    path: "M11 2h2v4.1a4 4 0 0 1 2.6 1.5l3.5-2 1 1.7-3.5 2a4 4 0 0 1 0 2.4l3.5 2-1 1.7-3.5-2A4 4 0 0 1 13 17.9V22h-2v-4.1a4 4 0 0 1-2.6-1.5l-3.5 2-1-1.7 3.5-2a4 4 0 0 1 0-2.4l-3.5-2 1-1.7 3.5 2A4 4 0 0 1 11 6.1V2Zm1 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  },
  "event-driven": {
    title: "Arquitetura orientada a eventos",
    hex: "FBBF24",
    path: "M13 2 4 13.5h6L11 22l9-11.5h-6L13 2Z",
  },
  iac: {
    title: "Infraestrutura como código",
    hex: "7C3AED",
    path: "M8.6 4.5 10 6 5.9 10.2 10 14.4l-1.4 1.4L3 10.2l5.6-5.7Zm6.8 0L21 10.2l-5.6 5.6-1.4-1.4 4.1-4.2L14 6l1.4-1.5ZM4 18h16v2H4v-2Z",
  },
  websocket: {
    title: "WebSocket",
    hex: "8CC84B",
    path: "M3 7h11.2a4.4 4.4 0 1 1 0 8.8H9.8v-2h4.4a2.4 2.4 0 1 0 0-4.8H3V7Zm0 6h4v2H3v-2Zm14.5 2.8h2.3A4.4 4.4 0 0 1 15.4 20H8v-2h7.4a2.4 2.4 0 0 0 2.1-1.2Z",
  },
};

const ALIASES: Record<string, string> = {
  "amazon-web-services": "aws",
  "amazonwebservices": "aws",
  lambda: "aws-lambda",
  s3: "amazon-s3",
  dynamodb: "amazon-dynamodb",
  ec2: "amazon-ec2",
  sqs: "amazon-sqs",
  vpc: "amazon-vpc",
  ecs: "amazon-ecs",
  cloudwatch: "amazon-cloudwatch",
  cicd: "ci-cd",
  "github-actions": "githubactions",
  "node-js": "nodedotjs",
  nodejs: "nodedotjs",
  node: "nodedotjs",
  nextjs: "nextdotjs",
  "next-js": "nextdotjs",
  "rest": "rest-api",
  apis: "rest-api",
};

function simpleIconKey(slug: string): string {
  const normalized = slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `si${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

export function resolveTechGlyph(slug: string | null | undefined): Glyph | null {
  if (!slug) return null;

  const key = slug.trim().toLowerCase();
  const aliased = ALIASES[key] ?? key;

  const local = LOCAL_ICONS[aliased];
  if (local) return local;

  const icons = simpleIcons as unknown as Record<string, Glyph | undefined>;
  const found = icons[simpleIconKey(aliased)];
  if (found?.path) return { path: found.path, hex: found.hex, title: found.title };

  return null;
}

/** Logos quase pretos (Next.js, Express…) ficariam invisíveis no tema escuro: usam a cor do texto. */
function readableColor(hex: string): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return `#${hex}`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.22 ? "var(--color-ink)" : `#${value}`;
}

export function TechIcon({
  slug,
  name,
  size = 24,
  className,
  monochrome = false,
  color,
}: {
  slug?: string | null;
  name: string;
  size?: number;
  className?: string;
  monochrome?: boolean;
  color?: string | null;
}) {
  const glyph = resolveTechGlyph(slug);

  if (!glyph) {
    const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
    return (
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-line bg-base-800 font-mono font-semibold text-ink-muted",
          className,
        )}
      >
        {initials}
      </span>
    );
  }

  return (
    <svg
      role="img"
      aria-label={name}
      viewBox={glyph.viewBox ?? "0 0 24 24"}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill={monochrome ? "currentColor" : (color ?? readableColor(glyph.hex))}
    >
      <path d={glyph.path} />
    </svg>
  );
}
