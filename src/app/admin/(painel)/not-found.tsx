import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="panel max-w-lg p-6">
      <h1 className="text-lg font-semibold text-ink">Registro não encontrado</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        O conteúdo que você tentou abrir não existe mais ou foi removido.
      </p>
      <Link href="/admin/projetos" className="mt-4 inline-block text-[13.5px] text-accent">
        Voltar para projetos
      </Link>
    </div>
  );
}
