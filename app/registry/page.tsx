import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegistryForm } from "@/features/registry/components/registry-form";
import { CreateDentistForm } from "@/features/registry/components/create-dentist-form";
import { RegistryList } from "@/features/registry/components/registry-list";
import { serverApiGet } from "@/lib/api/server";

export default async function RegistryPage() {
  const registryEnvelope = await serverApiGet<{
    clinics: Array<{
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
    }>;
    dentists: Array<{
      id: string;
      clinicId?: string;
      name: string;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      clinic: { name: string };
    }>;
    components: Array<{
      id: string;
      name: string;
      category?: string | null;
      brand?: string | null;
      defaultCost?: string | null;
      defaultPrice?: string | null;
      isActive?: boolean;
    }>;
    blockTypes: Array<{
      id: string;
      name: string;
      material?: string | null;
      brand?: string | null;
      size?: string | null;
      shade?: string | null;
      defaultCost?: string | null;
      isActive?: boolean;
    }>;
    serviceTypes: Array<{
      id: string;
      name: string;
      notes?: string | null;
      isActive?: boolean;
    }>;
    drills: Array<{
      id: string;
      name: string;
      type?: string | null;
      brand?: string | null;
      serialNumber?: string | null;
      maxTeethRecommended?: number | null;
      notes?: string | null;
      isActive?: boolean;
      fineMillings: Array<{
        id: string;
        teethMilledQty: number;
        milledAt: string;
        case: { code: string; patientName: string };
      }>;
      coarseMillings: Array<{
        id: string;
        teethMilledQty: number;
        milledAt: string;
        case: { code: string; patientName: string };
      }>;
    }>;
  }>("/api/registry");
  const { clinics, dentists, components, blockTypes, serviceTypes, drills } =
    registryEnvelope.data;

  return (
    <PageShell width="default">
      <PageHeader
        title="Registry Management"
        description="Create and manage clinics, dentists, components, and equipment"
      />

      <Tabs defaultValue="clinics" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="clinics">Clinics</TabsTrigger>
          <TabsTrigger value="dentists">Dentists</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="block-types">Block Types</TabsTrigger>
          <TabsTrigger value="service-types">Service Types</TabsTrigger>
          <TabsTrigger value="milling-drills">Drills</TabsTrigger>
        </TabsList>

        {/* Clinics Tab */}
        <TabsContent value="clinics" className="space-y-4">
          <RegistryForm
            title="Add New Clinic"
            description="Register a new dental clinic"
            entity="clinics"
            fields={[
              {
                name: "name",
                label: "Clinic Name",
                placeholder: "Silva Dental",
              },
              {
                name: "phone",
                label: "Phone",
                type: "text",
                placeholder: "(11) 3456-7890",
                optional: true,
              },
              {
                name: "email",
                label: "Email",
                type: "email",
                placeholder: "contact@clinic.com",
                optional: true,
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Additional information about the clinic...",
                optional: true,
              },
            ]}
            submitLabel="Add Clinic"
          />

          <RegistryList
            entity="clinics"
            columnLabels={["Name", "Phone", "Email"]}
            entityLabel="Clinic"
            fields={[
              {
                name: "name",
                label: "Clinic Name",
                placeholder: "Silva Dental",
              },
              {
                name: "phone",
                label: "Phone",
                type: "text",
                placeholder: "(11) 3456-7890",
                optional: true,
              },
              {
                name: "email",
                label: "Email",
                type: "email",
                placeholder: "contact@clinic.com",
                optional: true,
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Additional information...",
                optional: true,
              },
            ]}
            rows={clinics.map((c) => ({
              id: c.id,
              cells: [c.name, c.phone ?? "-", c.email ?? "-"],
              values: {
                name: c.name,
                phone: c.phone ?? "",
                email: c.email ?? "",
                notes: c.notes ?? "",
              },
            }))}
          />
        </TabsContent>

        {/* Dentists Tab */}
        <TabsContent value="dentists" className="space-y-4">
          <CreateDentistForm clinics={clinics} />

          <RegistryList
            entity="dentists"
            columnLabels={["Name", "Clinic", "Phone", "Email"]}
            entityLabel="Dentist"
            fields={[
              {
                name: "clinicId",
                label: "Clinic",
                type: "select",
                options: clinics.map((c) => ({ value: c.id, label: c.name })),
              },
              { name: "name", label: "Dentist Name", placeholder: "Dr. Silva" },
              { name: "phone", label: "Phone", type: "text", optional: true },
              { name: "email", label: "Email", type: "email", optional: true },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                optional: true,
              },
            ]}
            rows={dentists.map((d) => ({
              id: d.id,
              cells: [d.name, d.clinic.name, d.phone ?? "-", d.email ?? "-"],
              values: {
                clinicId: d.clinicId,
                name: d.name,
                phone: d.phone ?? "",
                email: d.email ?? "",
                notes: d.notes ?? "",
              },
            }))}
          />
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4">
          <RegistryForm
            title="Add New Component"
            description="Register a new dental component or material"
            entity="components"
            fields={[
              {
                name: "name",
                label: "Component Name",
                placeholder: "Zirconium Disc",
              },
              {
                name: "category",
                label: "Category",
                placeholder: "Materials",
                optional: true,
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "defaultCost",
                label: "Default Cost",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "defaultPrice",
                label: "Default Price",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This component is active",
                optional: true,
              },
            ]}
            submitLabel="Add Component"
          />

          <RegistryList
            entity="components"
            columnLabels={[
              "Name",
              "Category",
              "Brand",
              "Cost",
              "Price",
              "Status",
            ]}
            entityLabel="Component"
            fields={[
              {
                name: "name",
                label: "Component Name",
                placeholder: "Zirconium Disc",
              },
              {
                name: "category",
                label: "Category",
                placeholder: "Materials",
                optional: true,
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "defaultCost",
                label: "Default Cost",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "defaultPrice",
                label: "Default Price",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This component is active",
                optional: true,
              },
            ]}
            rows={components.map((c) => ({
              id: c.id,
              cells: [
                c.name,
                c.category ?? "-",
                c.brand ?? "-",
                c.defaultCost ? `R$ ${Number(c.defaultCost).toFixed(2)}` : "-",
                c.defaultPrice
                  ? `R$ ${Number(c.defaultPrice).toFixed(2)}`
                  : "-",
                <Badge
                  key="status"
                  variant={c.isActive ? "success" : "neutral"}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </Badge>,
              ],
              values: {
                name: c.name,
                category: c.category ?? "",
                brand: c.brand ?? "",
                defaultCost: c.defaultCost ? Number(c.defaultCost) : "",
                defaultPrice: c.defaultPrice ? Number(c.defaultPrice) : "",
                isActive: c.isActive,
              },
            }))}
          />
        </TabsContent>

        {/* Block Types Tab */}
        <TabsContent value="block-types" className="space-y-4">
          <RegistryForm
            title="Add New Block Type"
            description="Register a new milling block or CAD/CAM material"
            entity="block-types"
            fields={[
              {
                name: "name",
                label: "Block Type Name",
                placeholder: "Zirconia Block A1",
              },
              {
                name: "material",
                label: "Material",
                placeholder: "Zirconia",
                optional: true,
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "size",
                label: "Size",
                placeholder: "14x19x71",
                optional: true,
              },
              {
                name: "shade",
                label: "Shade",
                placeholder: "A1",
                optional: true,
              },
              {
                name: "defaultCost",
                label: "Default Cost",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This block type is active",
                optional: true,
              },
            ]}
            submitLabel="Add Block Type"
          />

          <RegistryList
            entity="block-types"
            columnLabels={[
              "Name",
              "Material",
              "Brand",
              "Size",
              "Shade",
              "Cost",
              "Status",
            ]}
            entityLabel="Block Type"
            fields={[
              {
                name: "name",
                label: "Block Type Name",
                placeholder: "Zirconia Block A1",
              },
              {
                name: "material",
                label: "Material",
                placeholder: "Zirconia",
                optional: true,
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "size",
                label: "Size",
                placeholder: "14x19x71",
                optional: true,
              },
              {
                name: "shade",
                label: "Shade",
                placeholder: "A1",
                optional: true,
              },
              {
                name: "defaultCost",
                label: "Default Cost",
                type: "number",
                placeholder: "0.00",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This block type is active",
                optional: true,
              },
            ]}
            rows={blockTypes.map((b) => ({
              id: b.id,
              cells: [
                b.name,
                b.material ?? "-",
                b.brand ?? "-",
                b.size ?? "-",
                b.shade ?? "-",
                b.defaultCost ? `R$ ${Number(b.defaultCost).toFixed(2)}` : "-",
                <Badge
                  key="status"
                  variant={b.isActive ? "success" : "neutral"}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </Badge>,
              ],
              values: {
                name: b.name,
                material: b.material ?? "",
                brand: b.brand ?? "",
                size: b.size ?? "",
                shade: b.shade ?? "",
                defaultCost: b.defaultCost ? Number(b.defaultCost) : "",
                isActive: b.isActive,
              },
            }))}
          />
        </TabsContent>

        {/* Service Types Tab */}
        <TabsContent value="service-types" className="space-y-4">
          <RegistryForm
            title="Add New Service Type"
            description="Register a new dental service or treatment type"
            entity="service-types"
            fields={[
              {
                name: "name",
                label: "Service Type Name",
                placeholder: "Full Crown",
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Description of the service...",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This service type is active",
                optional: true,
              },
            ]}
            submitLabel="Add Service Type"
          />

          <RegistryList
            entity="service-types"
            columnLabels={["Name", "Notes", "Status"]}
            entityLabel="Service Type"
            fields={[
              {
                name: "name",
                label: "Service Type Name",
                placeholder: "Full Crown",
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Description...",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This service type is active",
                optional: true,
              },
            ]}
            rows={serviceTypes.map((s) => ({
              id: s.id,
              cells: [
                s.name,
                s.notes ?? "-",
                <Badge
                  key="status"
                  variant={s.isActive ? "success" : "neutral"}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>,
              ],
              values: {
                name: s.name,
                notes: s.notes ?? "",
                isActive: s.isActive,
              },
            }))}
          />
        </TabsContent>

        {/* Milling Drills Tab */}
        <TabsContent value="milling-drills" className="space-y-4">
          <RegistryForm
            title="Add New Milling Drill"
            description="Register a new milling drill or cutting tool"
            entity="milling-drills"
            fields={[
              {
                name: "name",
                label: "Drill Name",
                placeholder: "Cylindrical Drill 0.8mm",
              },
              {
                name: "type",
                label: "Type",
                type: "select",
                placeholder: "Select drill type",
                options: [
                  { value: "1.0MM", label: "1.0mm" },
                  { value: "2.5MM", label: "2.5mm" },
                ],
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "serialNumber",
                label: "Serial Number",
                placeholder: "SN123456",
                optional: true,
              },
              {
                name: "maxTeethRecommended",
                label: "Max Teeth Recommended",
                type: "number",
                placeholder: "100",
                optional: true,
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Additional information about the drill...",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This drill is active",
                optional: true,
              },
            ]}
            submitLabel="Add Drill"
          />

          <Panel>
            <PanelHeader className="py-3">
              <h3 className="font-semibold">Drill History</h3>
              <p className="text-sm text-muted-foreground">
                Total teeth milled and recent jobs per drill.
              </p>
            </PanelHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drill</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Teeth Milled</TableHead>
                    <TableHead className="text-center">
                      Max Recommended
                    </TableHead>
                    <TableHead>Last Milling</TableHead>
                    <TableHead>Recent Jobs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drills.map((drill) => {
                    const usages = [
                      ...drill.fineMillings,
                      ...drill.coarseMillings,
                    ]
                      .reduce<
                        Array<{
                          id: string;
                          teethMilledQty: number;
                          milledAt: string;
                          case: { code: string; patientName: string };
                        }>
                      >((acc, usage) => {
                        if (!acc.some((item) => item.id === usage.id)) {
                          acc.push(usage);
                        }
                        return acc;
                      }, [])
                      .sort(
                        (a, b) =>
                          new Date(b.milledAt).getTime() -
                          new Date(a.milledAt).getTime(),
                      );

                    const totalTeeth = usages.reduce(
                      (sum, milling) => sum + milling.teethMilledQty,
                      0,
                    );
                    const lastMilledAt =
                      usages.length > 0 ? new Date(usages[0].milledAt) : null;
                    const recentJobs = usages.slice(0, 3);

                    return (
                      <TableRow key={drill.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{drill.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {drill.brand ?? "No brand"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {drill.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {totalTeeth}
                        </TableCell>
                        <TableCell className="text-center">
                          {drill.maxTeethRecommended ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lastMilledAt
                            ? lastMilledAt.toLocaleDateString("pt-BR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {recentJobs.length
                            ? recentJobs
                                .map(
                                  (job) =>
                                    job.case.code || job.case.patientName,
                                )
                                .join(", ")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {drills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState title="No drills registered yet" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>

          <RegistryList
            entity="milling-drills"
            columnLabels={[
              "Name",
              "Type",
              "Brand",
              "Serial",
              "Max Teeth",
              "Status",
            ]}
            entityLabel="Drill"
            fields={[
              {
                name: "name",
                label: "Drill Name",
                placeholder: "Cylindrical Drill 0.8mm",
              },
              {
                name: "type",
                label: "Type",
                type: "select",
                placeholder: "Select drill type",
                options: [
                  { value: "1.0MM", label: "1.0mm" },
                  { value: "2.5MM", label: "2.5mm" },
                ],
              },
              {
                name: "brand",
                label: "Brand",
                placeholder: "Ivoclar",
                optional: true,
              },
              {
                name: "serialNumber",
                label: "Serial Number",
                placeholder: "SN123456",
                optional: true,
              },
              {
                name: "maxTeethRecommended",
                label: "Max Teeth Recommended",
                type: "number",
                placeholder: "100",
                optional: true,
              },
              {
                name: "notes",
                label: "Notes",
                type: "textarea",
                placeholder: "Additional information...",
                optional: true,
              },
              {
                name: "isActive",
                label: "Active",
                type: "checkbox",
                placeholder: "This drill is active",
                optional: true,
              },
            ]}
            rows={drills.map((d) => ({
              id: d.id,
              cells: [
                d.name,
                d.type ?? "-",
                d.brand ?? "-",
                d.serialNumber ?? "-",
                d.maxTeethRecommended ?? "-",
                <Badge
                  key="status"
                  variant={d.isActive ? "success" : "neutral"}
                >
                  {d.isActive ? "Active" : "Inactive"}
                </Badge>,
              ],
              values: {
                name: d.name,
                type: d.type ?? "",
                brand: d.brand ?? "",
                serialNumber: d.serialNumber ?? "",
                maxTeethRecommended: d.maxTeethRecommended ?? "",
                notes: d.notes ?? "",
                isActive: d.isActive,
              },
            }))}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
