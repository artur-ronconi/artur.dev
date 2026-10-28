import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Cria (ou atualiza) um administrador.
 *
 *   npm run admin:create                       → pergunta os dados
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin:create
 *
 * Com ADMIN_ONLY_IF_MISSING=1 (usado pelo entrypoint da imagem) nada é alterado
 * se o administrador já existir — assim um redeploy não desfaz a troca de senha
 * feita no painel.
 */

const prisma = new PrismaClient();

function validatePassword(password: string): string | null {
  if (password.length < 10) return "A senha precisa ter ao menos 10 caracteres.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return "A senha precisa conter letras maiúsculas e minúsculas.";
  }
  if (!/[0-9]/.test(password)) return "A senha precisa conter ao menos um número.";
  return null;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const email = (process.env.ADMIN_EMAIL ?? (await rl.question("E-mail: "))).trim().toLowerCase();
  const name = process.env.ADMIN_NAME ?? (await rl.question("Nome: "));
  const password = process.env.ADMIN_PASSWORD ?? (await rl.question("Senha: "));

  rl.close();

  if (!email.includes("@")) throw new Error("E-mail inválido.");

  const invalid = validatePassword(password);
  if (invalid) throw new Error(invalid);

  if (process.env.ADMIN_ONLY_IF_MISSING === "1") {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      console.log(`Administrador já existe: ${existing.email} (nada alterado)`);
      return;
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: name || "Administrador", passwordHash },
    update: { passwordHash, name: name || undefined, isActive: true },
  });

  console.log(`Administrador pronto: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
