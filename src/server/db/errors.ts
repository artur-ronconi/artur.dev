import { Prisma } from "@prisma/client";

export class DomainError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Translates Prisma failures into messages that are safe (and useful) to show
 * in the admin UI. Anything unexpected bubbles up as a generic message so we
 * never leak connection strings or SQL into the browser.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = (error.meta?.target as string[] | undefined)?.join(", ");
        return target
          ? `Já existe um registro com este valor (${target}).`
          : "Já existe um registro com estes dados.";
      }
      case "P2003":
        return "Registro vinculado a outros dados. Remova os vínculos antes de excluir.";
      case "P2025":
        return "Registro não encontrado.";
      default:
        return "Não foi possível concluir a operação no banco de dados.";
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Não foi possível conectar ao banco de dados. Verifique a variável DATABASE_URL.";
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Dados inválidos enviados ao banco de dados.";
  }

  console.error("[db] erro inesperado:", error);
  return "Erro inesperado. Tente novamente.";
}
