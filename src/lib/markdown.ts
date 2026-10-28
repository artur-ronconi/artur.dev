/**
 * Minimal, dependency-free Markdown subset used by case-study content.
 * Supports: headings (###), bold, inline code, links, unordered lists and
 * paragraphs. Everything is escaped first, so stored content can never inject
 * markup into the page.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      continue;
    }

    const listItem = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (listItem) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inline(listItem[1] ?? "")}</li>`);
      continue;
    }

    closeList();

    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      html.push(`<h3>${inline(heading[2] ?? "")}</h3>`);
      continue;
    }

    html.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

/** Plain-text version used for meta descriptions and card excerpts. */
export function stripMarkdown(source: string): string {
  return source
    .replace(/[*`#>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
