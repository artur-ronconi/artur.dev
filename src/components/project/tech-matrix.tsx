import { TechIcon } from "@/components/icons/tech-icon";

type Entry = {
  role: string | null;
  technology: {
    id: string;
    name: string;
    slug: string;
    iconSlug: string | null;
    color: string | null;
    description: string | null;
    category: { id: string; name: string } | null;
  };
};

/** Technologies grouped by category, each with its role in this project. */
export function TechMatrix({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;

  const groups = new Map<string, { name: string; items: Entry[] }>();
  for (const entry of entries) {
    const key = entry.technology.category?.id ?? "outras";
    const name = entry.technology.category?.name ?? "Outras";
    const group = groups.get(key) ?? { name, items: [] };
    group.items.push(entry);
    groups.set(key, group);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[...groups.values()].map((group) => (
        <div key={group.name} className="panel p-5">
          <h3 className="rule-label mb-4">{group.name}</h3>
          <ul className="space-y-3.5">
            {group.items.map(({ technology, role }) => (
              <li key={technology.id} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-base-850">
                  <TechIcon
                    slug={technology.iconSlug ?? technology.slug}
                    name={technology.name}
                    color={technology.color}
                    size={19}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">{technology.name}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-muted">
                    {role ?? technology.description ?? "—"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
