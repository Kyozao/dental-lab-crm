"use client";

import dynamic from "next/dynamic";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";
import type { CurrentUser } from "@/features/kanban/shared";

const CadKanbanBoard = dynamic(
  () => import("./cad-kanban-board").then((mod) => mod.CadKanbanBoard),
  { ssr: false },
);

interface KanbanBoardWrapperProps {
  currentUser: CurrentUser;
  initialCases: EditableCase[];
  designers: CadDesignerOption[];
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  components: ComponentOption[];
}

export function KanbanBoardWrapper({
  currentUser,
  initialCases,
  designers,
  clinics,
  serviceTypes,
  components,
}: KanbanBoardWrapperProps) {
  return (
    <CadKanbanBoard
      currentUser={currentUser}
      initialCases={initialCases}
      designers={designers}
      clinics={clinics}
      serviceTypes={serviceTypes}
      components={components}
    />
  );
}
