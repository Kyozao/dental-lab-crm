import "dotenv/config";

import {
  createWorkflowForExistingCase,
  getWorkflowForCaseCreate,
} from "@/app/api/cases/cases.workflow";
import { prisma } from "@/lib/prisma";

async function main() {
  const cases = await prisma.cases.findMany({
    where: {
      service_type_id: { not: null },
      case_processes: {
        none: {},
      },
    },
    select: {
      id: true,
      code: true,
      lab_id: true,
      service_type_id: true,
    },
    orderBy: { created_at: "asc" },
  });

  let repairedCount = 0;

  for (const caseItem of cases) {
    if (!caseItem.service_type_id) continue;

    const workflow = await getWorkflowForCaseCreate(
      caseItem.lab_id,
      caseItem.service_type_id,
    );

    const repaired = await prisma.$transaction((tx) =>
      createWorkflowForExistingCase(
        tx,
        caseItem.id,
        caseItem.service_type_id!,
        workflow,
      ),
    );

    if (repaired) {
      repairedCount += 1;
      console.log(`Created workflow rows for case ${caseItem.code} (${caseItem.id}).`);
    }
  }

  console.log(`Backfilled ${repairedCount} case workflow(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
