import { Mail } from "lucide-react";

import { PageHeader } from "@/components/admin/shell";
import { MessagesList } from "@/components/admin/messages-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getContactMessages } from "@/server/modules/portfolio";

export default async function AdminMessagesPage() {
  const messages = await getContactMessages();

  return (
    <>
      <PageHeader title="Mensagens" description="Mensagens enviadas pelo formulário de contato do site." />

      {messages.length === 0 ? (
        <EmptyState
          icon={<Mail size={20} />}
          title="Nenhuma mensagem recebida"
          description="As mensagens enviadas pelo formulário público aparecem aqui."
        />
      ) : (
        <MessagesList
          messages={messages.map((message) => ({
            id: message.id,
            name: message.name,
            email: message.email,
            subject: message.subject,
            message: message.message,
            read: message.read,
            createdAt: message.createdAt.toISOString(),
          }))}
        />
      )}
    </>
  );
}
