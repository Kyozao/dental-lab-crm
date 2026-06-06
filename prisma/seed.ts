// prisma/seed.ts
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEFAULT_CLIENT_COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const DEFAULT_DENTAL_LAB_ID = "seed-dental-lab";
const DEFAULT_LAB_CUSTOMER_ID = "seed-lab-customer";

async function main() {
  // Optional for dev-only seeding:
  // wipe transactional/mock tables first so re-running stays clean
  await prisma.case_millings.deleteMany();
  await prisma.case_component_usages.deleteMany();
  await prisma.case_attachments.deleteMany().catch(() => {});
  await prisma.cases.deleteMany();
  await prisma.dentists.deleteMany();
  await prisma.clinics.deleteMany();

  const clientCompany = await prisma.client_companies.upsert({
    where: { id: DEFAULT_CLIENT_COMPANY_ID },
    update: {},
    create: {
      id: DEFAULT_CLIENT_COMPANY_ID,
      name: "Seed Client Company",
      isActive: true,
    },
  });

  const dentalLab = await prisma.dental_labs.upsert({
    where: { id: DEFAULT_DENTAL_LAB_ID },
    update: {},
    create: {
      id: DEFAULT_DENTAL_LAB_ID,
      clientCompanyId: clientCompany.id,
      name: "Seed Dental Lab",
      isActive: true,
    },
  });

  const labCustomer = await prisma.lab_customers.upsert({
    where: { id: DEFAULT_LAB_CUSTOMER_ID },
    update: {},
    create: {
      id: DEFAULT_LAB_CUSTOMER_ID,
      dentalLabId: dentalLab.id,
      name: "Seed Lab Customer",
      isActive: true,
    },
  });

  // Users
  const designers = await Promise.all([
    prisma.users.upsert({
      where: { email: "designer1@example.com" },
      update: {},
      create: {
        id: "d84eba90-270a-406d-af29-d6e9b03a3459",
        name: "Designer 1",
        email: "designer1@example.com",
        isActive: true,
        clientCompanyId: clientCompany.id,
      },
    }),
    prisma.users.upsert({
      where: { email: "designer2@example.com" },
      update: {},
      create: {
        id: "b3bc7a1e-4f53-4b6c-8d6b-8fd7d02db111",
        name: "Designer 2",
        email: "designer2@example.com",
        isActive: true,
        clientCompanyId: clientCompany.id,
      },
    }),
    prisma.users.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        id: "c11e3b07-76e1-4f6f-ae3d-0f1f658ff222",
        name: "Admin",
        email: "admin@example.com",
        isActive: true,
        clientCompanyId: clientCompany.id,
      },
    }),
  ]);

  await Promise.all([
    prisma.user_lab_memberships.upsert({
      where: { userId: designers[0].id },
      update: { dentalLabId: dentalLab.id, role: "CAD_DESIGNER" },
      create: {
        userId: designers[0].id,
        dentalLabId: dentalLab.id,
        role: "CAD_DESIGNER",
      },
    }),
    prisma.user_lab_memberships.upsert({
      where: { userId: designers[1].id },
      update: { dentalLabId: dentalLab.id, role: "CAD_DESIGNER" },
      create: {
        userId: designers[1].id,
        dentalLabId: dentalLab.id,
        role: "CAD_DESIGNER",
      },
    }),
    prisma.user_lab_memberships.upsert({
      where: { userId: designers[2].id },
      update: { dentalLabId: dentalLab.id, role: "ADMIN" },
      create: {
        userId: designers[2].id,
        dentalLabId: dentalLab.id,
        role: "ADMIN",
      },
    }),
  ]);

  // Clinics
  const clinicA = await prisma.clinics.create({
    data: {
      dentalLabId: dentalLab.id,
      labCustomerId: labCustomer.id,
      name: "Clínica Sorriso Prime",
      phone: "11999990001",
      email: "contato@sorrisoprime.com",
      notes: "Cliente frequente",
    },
  });

  const clinicB = await prisma.clinics.create({
    data: {
      dentalLabId: dentalLab.id,
      labCustomerId: labCustomer.id,
      name: "Odonto Centro",
      phone: "11999990002",
      email: "contato@odontocentro.com",
      notes: "Casos de protocolo e implante",
    },
  });

  const clinicC = await prisma.clinics.create({
    data: {
      dentalLabId: dentalLab.id,
      labCustomerId: labCustomer.id,
      name: "Estética Oral",
      phone: "11999990003",
      email: "contato@esteticaoral.com",
      notes: "Foco em estética",
    },
  });

  // Dentists
  const [dentistA1, dentistA2, dentistB1, dentistC1] = await Promise.all([
    prisma.dentists.create({
      data: {
        dentalLabId: dentalLab.id,
        clinicId: clinicA.id,
        name: "Dr. João",
        phone: "11988880001",
        email: "joao@sorrisoprime.com",
      },
    }),
    prisma.dentists.create({
      data: {
        dentalLabId: dentalLab.id,
        clinicId: clinicA.id,
        name: "Dra. Carla",
        phone: "11988880002",
        email: "carla@sorrisoprime.com",
      },
    }),
    prisma.dentists.create({
      data: {
        dentalLabId: dentalLab.id,
        clinicId: clinicB.id,
        name: "Dr. Rafael",
        phone: "11988880003",
        email: "rafael@odontocentro.com",
      },
    }),
    prisma.dentists.create({
      data: {
        dentalLabId: dentalLab.id,
        clinicId: clinicC.id,
        name: "Dra. Marina",
        phone: "11988880004",
        email: "marina@esteticaoral.com",
      },
    }),
  ]);

  // Service types
  const [crown, protocol, lens, implant] = await Promise.all([
    prisma.service_types.upsert({
      where: { dentalLabId_name: { dentalLabId: dentalLab.id, name: "Coroa" } },
      update: {},
      create: { dentalLabId: dentalLab.id, name: "Coroa", isActive: true },
    }),
    prisma.service_types.upsert({
      where: { dentalLabId_name: { dentalLabId: dentalLab.id, name: "Protocolo" } },
      update: {},
      create: { dentalLabId: dentalLab.id, name: "Protocolo", isActive: true },
    }),
    prisma.service_types.upsert({
      where: { dentalLabId_name: { dentalLabId: dentalLab.id, name: "Lente" } },
      update: {},
      create: { dentalLabId: dentalLab.id, name: "Lente", isActive: true },
    }),
    prisma.service_types.upsert({
      where: { dentalLabId_name: { dentalLabId: dentalLab.id, name: "Implante Unitario" } },
      update: {},
      create: { dentalLabId: dentalLab.id, name: "Implante Unitario", isActive: true },
    }),
  ]);
  // Components
  const [tiBase, analog, ucla, miniPilar] = await Promise.all([
    prisma.components.upsert({
      where: { id: "seed-component-tibase" },
      update: {},
      create: {
        id: "seed-component-tibase",
        dentalLabId: dentalLab.id,
        name: "Ti Base",
        category: "Implante",
        brand: "Genérica",
        defaultCost: "25.00",
        defaultPrice: "60.00",
      },
    }),
    prisma.components.upsert({
      where: { id: "seed-component-analog" },
      update: {},
      create: {
        id: "seed-component-analog",
        dentalLabId: dentalLab.id,
        name: "Análogo",
        category: "Implante",
        brand: "Genérica",
        defaultCost: "15.00",
        defaultPrice: "35.00",
      },
    }),
    prisma.components.upsert({
      where: { id: "seed-component-ucla" },
      update: {},
      create: {
        id: "seed-component-ucla",
        dentalLabId: dentalLab.id,
        name: "UCLA",
        category: "Implante",
        brand: "Genérica",
        defaultCost: "30.00",
        defaultPrice: "75.00",
      },
    }),
    prisma.components.upsert({
      where: { id: "seed-component-minipilar" },
      update: {},
      create: {
        id: "seed-component-minipilar",
        dentalLabId: dentalLab.id,
        name: "Mini Pilar",
        category: "Implante",
        brand: "Genérica",
        defaultCost: "40.00",
        defaultPrice: "95.00",
      },
    }),
  ]);

  // Blocks
  const [zirconiaA2, zirconiaBleach, pmma, wax] = await Promise.all([
    prisma.block_types.upsert({
      where: { id: "seed-block-zirconia-a2" },
      update: {},
      create: {
        id: "seed-block-zirconia-a2",
        dentalLabId: dentalLab.id,
        name: "Zircônia A2",
        material: "Zircônia",
        shade: "A2",
        brand: "Genérica",
        size: "98mm",
        defaultCost: "120.00",
      },
    }),
    prisma.block_types.upsert({
      where: { id: "seed-block-zirconia-bleach" },
      update: {},
      create: {
        id: "seed-block-zirconia-bleach",
        dentalLabId: dentalLab.id,
        name: "Zircônia Bleach",
        material: "Zircônia",
        shade: "BL",
        brand: "Genérica",
        size: "98mm",
        defaultCost: "130.00",
      },
    }),
    prisma.block_types.upsert({
      where: { id: "seed-block-pmma" },
      update: {},
      create: {
        id: "seed-block-pmma",
        dentalLabId: dentalLab.id,
        name: "PMMA",
        material: "PMMA",
        brand: "Genérica",
        size: "98mm",
        defaultCost: "45.00",
      },
    }),
    prisma.block_types.upsert({
      where: { id: "seed-block-wax" },
      update: {},
      create: {
        id: "seed-block-wax",
        dentalLabId: dentalLab.id,
        name: "Wax Disc",
        material: "Cera",
        brand: "Genérica",
        size: "98mm",
        defaultCost: "20.00",
      },
    }),
  ]);

  // Drills
  const [drill1, drill2] = await Promise.all([
    prisma.milling_drills.create({
      data: {
        dentalLabId: dentalLab.id,
        name: "Broca 1",
        type: "Standard",
        brand: "Genérica",
        maxTeethRecommended: 120,
        isActive: true,
      },
    }),
    prisma.milling_drills.create({
      data: {
        dentalLabId: dentalLab.id,
        name: "Broca 2",
        type: "Fine",
        brand: "Genérica",
        maxTeethRecommended: 90,
        isActive: true,
      },
    }),
  ]);

  const caseSeeds = [
    {
      code: "CASE-0001",
      dentalLabId: dentalLab.id,
      clientCaseCode: "SP-101",
      patientName: "Maria Silva",
      clinicId: clinicA.id,
      dentistId: dentistA1.id,
      serviceTypeId: crown.id,
      currentStatus: "ENTRY",
      teeth: "11",
      shade: "A2",
      isUrgent: false,
      observations: "Caso de coroa unitária",
      pendingNote: "Confirmar tipo de implante",
    },
    {
      code: "CASE-0002",
      dentalLabId: dentalLab.id,
      clientCaseCode: "SP-102",
      patientName: "Pedro Oliveira",
      clinicId: clinicA.id,
      dentistId: dentistA2.id,
      serviceTypeId: implant.id,
      currentStatus: "WAITING_INFO",
      teeth: "21",
      shade: "A1",
      isUrgent: true,
      observations: "Paciente com urgência",
      pendingNote: "Enviar foto oclusal e modelo escaneado",
    },
    {
      code: "CASE-0003",
      dentalLabId: dentalLab.id,
      clientCaseCode: "OC-900",
      patientName: "Ana Costa",
      clinicId: clinicB.id,
      dentistId: dentistB1.id,
      serviceTypeId: protocol.id,
      currentStatus: "DESIGNING",
      teeth: "14,15,16",
      shade: "BL2",
      isUrgent: false,
      observations: "Protocolo superior parcial",
      pendingNote: null,
    },
    {
      code: "CASE-0004",
      dentalLabId: dentalLab.id,
      clientCaseCode: "EO-501",
      patientName: "Lucas Mendes",
      clinicId: clinicC.id,
      dentistId: dentistC1.id,
      serviceTypeId: lens.id,
      currentStatus: "MILLING_PRINTING",
      teeth: "11,12,21,22",
      shade: "BL1",
      isUrgent: false,
      observations: "Lentes anteriores",
      pendingNote: null,
    },
    {
      code: "CASE-0005",
      dentalLabId: dentalLab.id,
      clientCaseCode: "OC-901",
      patientName: "Fernanda Rocha",
      clinicId: clinicB.id,
      dentistId: dentistB1.id,
      serviceTypeId: crown.id,
      currentStatus: "DONE",
      teeth: "36",
      shade: "A3",
      isUrgent: false,
      observations: "Caso concluído",
      pendingNote: null,
    },
    {
      code: "CASE-0006",
      dentalLabId: dentalLab.id,
      clientCaseCode: "SP-103",
      patientName: "Bruno Lima",
      clinicId: clinicA.id,
      dentistId: dentistA1.id,
      serviceTypeId: implant.id,
      currentStatus: "ENTRY",
      teeth: "46",
      shade: "A2",
      isUrgent: true,
      observations: "Paciente veio de indicação",
      pendingNote: "Checar conexão da plataforma",
    },
    {
      code: "CASE-0007",
      dentalLabId: dentalLab.id,
      clientCaseCode: "EO-502",
      patientName: "Juliana Alves",
      clinicId: clinicC.id,
      dentistId: dentistC1.id,
      serviceTypeId: crown.id,
      currentStatus: "DESIGNING",
      teeth: "24",
      shade: "A1",
      isUrgent: false,
      observations: "Precisa contato proximal leve",
      pendingNote: null,
    },
    {
      code: "CASE-0008",
      dentalLabId: dentalLab.id,
      clientCaseCode: "OC-902",
      patientName: "Ricardo Souza",
      clinicId: clinicB.id,
      dentistId: dentistB1.id,
      serviceTypeId: protocol.id,
      currentStatus: "WAITING_INFO",
      teeth: "31,32,33,34",
      shade: "A2",
      isUrgent: false,
      observations: "Solicitada nova moldagem",
      pendingNote: "Aguardando mordida e fotos frontais",
    },
  ] as const;

  const createdCases = [];
  for (const item of caseSeeds) {
    const created = await prisma.cases.create({
      data: item,
    });
    createdCases.push(created);
  }

  // Component usages
  await prisma.case_component_usages.createMany({
    data: [
      {
        id: randomUUID(),
        caseId: createdCases[0].id,
        componentId: tiBase.id,
        quantity: 1,
        chargeClient: true,
        unitCost: "25.00",
        unitPrice: "60.00",
        notes: "Componente inicial",
      },
      {
        id: randomUUID(),
        caseId: createdCases[1].id,
        componentId: analog.id,
        quantity: 1,
        chargeClient: true,
        unitCost: "15.00",
        unitPrice: "35.00",
        notes: "Análogo para modelo",
      },
      {
        id: randomUUID(),
        caseId: createdCases[2].id,
        componentId: ucla.id,
        quantity: 3,
        chargeClient: true,
        unitCost: "30.00",
        unitPrice: "75.00",
        notes: "Protocolo parcial",
      },
      {
        id: randomUUID(),
        caseId: createdCases[5].id,
        componentId: miniPilar.id,
        quantity: 1,
        chargeClient: true,
        unitCost: "40.00",
        unitPrice: "95.00",
        notes: "Mini pilar unitário",
      },
    ],
  });

  // Milling rows
  await prisma.case_millings.createMany({
    data: [
      {
        id: randomUUID(),
        dentalLabId: dentalLab.id,
        caseId: createdCases[0].id,
        blockTypeId: zirconiaA2.id,
        millingDrillId: drill1.id,
        status: "SUCCESS",
        teethMilledQty: 1,
        notes: "Primeira fresagem seed",
      },
      {
        id: randomUUID(),
        dentalLabId: dentalLab.id,
        caseId: createdCases[2].id,
        blockTypeId: pmma.id,
        millingDrillId: drill2.id,
        status: "SUCCESS",
        teethMilledQty: 3,
        notes: "Provisorio PMMA",
      },
      {
        id: randomUUID(),
        dentalLabId: dentalLab.id,
        caseId: createdCases[3].id,
        blockTypeId: zirconiaBleach.id,
        millingDrillId: drill1.id,
        status: "SUCCESS",
        teethMilledQty: 4,
        notes: "Em producao",
      },
      {
        id: randomUUID(),
        dentalLabId: dentalLab.id,
        caseId: createdCases[4].id,
        blockTypeId: wax.id,
        millingDrillId: drill2.id,
        status: "SUCCESS",
        teethMilledQty: 1,
        notes: "Caso finalizado",
      },
    ],
  });
  console.log("Seed finished");
  console.log({
    users: designers.length,
    clinics: 3,
    dentists: 4,
    service_types: 4,
    components: 4,
    blocks: 4,
    drills: 2,
    cases: createdCases.length,
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






