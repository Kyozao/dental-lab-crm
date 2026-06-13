import "dotenv/config";

import { ensureDefaultCatalogForLab } from "@/app/api/_shared/default-catalog";
import { prisma } from "@/lib/prisma";

async function main() {
  const labs = await prisma.labs.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  if (labs.length === 0) {
    console.log("No labs found. Create a lab first, then rerun this seed.");
    return;
  }

  for (const lab of labs) {
    await ensureDefaultCatalogForLab(prisma, lab.id);
    console.log(`Seeded default catalog for ${lab.name} (${lab.id}).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
