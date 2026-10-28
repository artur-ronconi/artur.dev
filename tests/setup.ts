import "dotenv/config";

/**
 * Os testes de integração escrevem no banco apontado por `DATABASE_URL` — e um
 * deles exercita a remoção de dados de demonstração, que é global.
 *
 * Defina `DATABASE_URL_TEST` (ex.: `file:./test.db`) para usar um banco separado
 * (recomendado). Sem essa variável, os testes usam o banco de desenvolvimento e o
 * conteúdo de demonstração pode ser removido — restaure com `npm run db:seed`.
 *
 * O banco de teste precisa existir com o schema aplicado:
 *   DATABASE_URL=file:./test.db npx prisma migrate deploy
 */
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else {
  console.warn(
    "[testes] DATABASE_URL_TEST não definido — usando o banco de desenvolvimento.\n" +
      "          Após rodar os testes, use `npm run db:seed` para recriar os dados de demonstração.",
  );
}
