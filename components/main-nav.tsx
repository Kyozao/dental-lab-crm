import { NavClient } from "./nav-client";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  SearchCaseItem,
  ServiceTypeOption,
} from "@/features/cases/types";
import { serverApiGet } from "@/lib/api/server";

type UserResponse = {
  id: string;
  role: string;
};

type BootstrapResponse = {
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  cadDesigners: CadDesignerOption[];
  components: ComponentOption[];
};

export async function MainNav() {
  const [userEnvelope, casesEnvelope, bootstrapEnvelope] = await Promise.all([
    serverApiGet<UserResponse>("/api/me"),
    serverApiGet<EditableCase[]>("/api/cases?pageSize=100"),
    serverApiGet<BootstrapResponse>("/api/registry/bootstrap"),
  ]);
  const appUser = userEnvelope.data;
  const { clinics, serviceTypes, cadDesigners, components } =
    bootstrapEnvelope.data;
  const cases: SearchCaseItem[] = casesEnvelope.data.map((item) => ({
    id: item.id,
    code: item.code,
    patientName: item.patientName,
    currentStatus: item.currentStatus,
    clinicName: item.clinicName,
  }));

  return (
    <NavClient
      userRole={appUser.role}
      currentUserRole={appUser.role}
      currentUserId={appUser.id}
      cases={cases}
      clinics={clinics}
      serviceTypes={serviceTypes}
      cadDesigners={cadDesigners}
      components={components}
    />
  );
}
