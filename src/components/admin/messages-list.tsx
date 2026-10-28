"use client";

import { useRouter } from "next/navigation";
import { Mail, MailOpen, Trash2 } from "lucide-react";

import { ConfirmButton } from "@/components/admin/confirm-button";
import { useCsrf } from "@/components/admin/csrf";
import { useToast } from "@/components/admin/toast";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { deleteMessageAction, markMessageReadAction } from "@/server/actions/portfolio";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: string;
};

export function MessagesList({ messages }: { messages: Message[] }) {
  const csrf = useCsrf();
  const toast = useToast();
  const router = useRouter();

  return (
    <ul className="space-y-3">
      {messages.map((message) => (
        <li key={message.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-ink">{message.name}</span>
                {!message.read ? <Badge tone="accent" mono>nova</Badge> : null}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                <a href={`mailto:${message.email}`} className="hover:text-accent">
                  {message.email}
                </a>
                <span className="ml-2 font-mono text-[11.5px] text-ink-faint">
                  {formatDateTime(message.createdAt)}
                </span>
              </p>
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                aria-label={message.read ? "Marcar como não lida" : "Marcar como lida"}
                onClick={async () => {
                  const result = await markMessageReadAction(csrf, message.id, !message.read);
                  if (result.ok) router.refresh();
                  else toast.error(result.message);
                }}
                className="rounded border border-line p-1.5 text-ink-muted transition-colors hover:text-accent"
              >
                {message.read ? <Mail size={14} /> : <MailOpen size={14} />}
              </button>

              <ConfirmButton
                variant="ghost"
                size="sm"
                className="!px-1.5 text-ink-muted hover:text-rose"
                title="Excluir mensagem?"
                description="A mensagem será removida permanentemente."
                confirmLabel="Excluir"
                onConfirm={async () => {
                  const result = await deleteMessageAction(csrf, message.id);
                  if (result.ok) {
                    toast.success(result.message ?? "Mensagem removida.");
                    router.refresh();
                  } else {
                    toast.error(result.message);
                  }
                }}
              >
                <Trash2 size={14} />
              </ConfirmButton>
            </div>
          </div>

          {message.subject ? (
            <p className="mt-3 text-[13.5px] font-medium text-ink">{message.subject}</p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-muted">
            {message.message}
          </p>
        </li>
      ))}
    </ul>
  );
}
