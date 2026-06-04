import { KanbanBoardWrapper } from "@/features/kanban/components/kanban-board-wrapper";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "@/features/cases/types";
import { serverApiGet } from "@/lib/api/server";

type UserResponse = {
  id: string;
  name: string | null;
  role: string;
};

type BootstrapResponse = {
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
};

export default async function KanbanPage() {
  const [userEnvelope, casesEnvelope, bootstrapEnvelope] = await Promise.all([
    serverApiGet<UserResponse>("/api/me"),
    serverApiGet<EditableCase[]>("/api/cases?pageSize=100"),
    serverApiGet<BootstrapResponse>("/api/registry/bootstrap"),
  ]);

  const appUser = userEnvelope.data;
  const bootstrap = bootstrapEnvelope.data;

  return (
    <KanbanBoardWrapper
      currentUser={{
        id: appUser.id,
        name: appUser.name ?? "Demo User",
        role: appUser.role,
      }}
      initialCases={casesEnvelope.data.filter(
        (caseItem) => caseItem.currentStatus !== "DONE",
      )}
      designers={bootstrap.cadDesigners}
      clinics={bootstrap.clinics}
      serviceTypes={bootstrap.serviceTypes}
      components={bootstrap.components}
    />
  );
}
