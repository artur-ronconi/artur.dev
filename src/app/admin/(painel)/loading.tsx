export default function AdminLoading() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando…</span>
      <div className="h-7 w-48 animate-pulse rounded bg-base-800" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-24 animate-pulse" />
        ))}
      </div>
      <div className="panel h-64 animate-pulse" />
    </div>
  );
}
