import { KanbanBoardWrapper } from "@/features/kanban/components/kanban-board-wrapper";
import {
  mockCadDesigners,
  mockCases,
  mockClinics,
  mockComponents,
  mockServiceTypes,
  mockUser,
} from "@/lib/mock-data/pages";

export default function KanbanPage() {
  return (
    <KanbanBoardWrapper
      currentUser={mockUser}
      initialCases={mockCases.filter(
        (caseItem) => caseItem.currentStatus !== "DONE",
      )}
      designers={mockCadDesigners}
      clinics={mockClinics}
      serviceTypes={mockServiceTypes}
      components={mockComponents}
    />
  );
}
