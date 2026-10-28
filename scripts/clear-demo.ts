import "dotenv/config";

import { PrismaClient } from "@prisma/client";

/** Remove todo o conteúdo marcado como demonstração (isDemo = true). */
const prisma = new PrismaClient();

async function main() {
  const [projects, technologies, technologyCategories, projectCategories, experiences, certifications] =
    await prisma.$transaction([
      prisma.project.deleteMany({ where: { isDemo: true } }),
      prisma.technology.deleteMany({ where: { isDemo: true } }),
      prisma.technologyCategory.deleteMany({ where: { isDemo: true } }),
      prisma.projectCategory.deleteMany({ where: { isDemo: true } }),
      prisma.professionalExperience.deleteMany({ where: { isDemo: true } }),
      prisma.certification.deleteMany({ where: { isDemo: true } }),
    ]);

  console.log(
    `Removidos: ${projects.count} projetos, ${technologies.count} tecnologias, ` +
      `${technologyCategories.count} categorias de tecnologia, ${projectCategories.count} categorias de projeto, ` +
      `${experiences.count} experiências, ${certifications.count} certificações.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
