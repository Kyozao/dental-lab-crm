import { prisma } from "@/lib/prisma";
import { getAuthenticatedAppUser } from "@/lib/auth/get-app-user";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegistryForm } from "./components/registry-form";
import { CreateDentistForm } from "./components/create-dentist-form";
import { RegistryList } from "./components/registry-list";
import {
  createClinicAction,
  createDentistAction,
  createComponentAction,
  createBlockTypeAction,
  createServiceTypeAction,
  createMillingDrillAction,
  markMillingDrillChangedAction,
  updateClinicAction,
  updateDentistAction,
  updateComponentAction,
  updateBlockTypeAction,
  updateServiceTypeAction,
  updateMillingDrillAction,
  deleteClinicAction,
  deleteDentistAction,
  deleteComponentAction,
  deleteBlockTypeAction,
  deleteServiceTypeAction,
  deleteMillingDrillAction,
} from "./actions";

export default async function RegistryPage() {
  const appUser = await getAuthenticatedAppUser();

  if (!appUser) {
    redirect("/login");
  }

  const [clinics, dentists, components, blockTypes, serviceTypes, drills] =
    await Promise.all([
      prisma.clinic.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, phone: true, email: true, notes: true },
      }),
      prisma.dentist.findMany({
        orderBy: { name: "asc" },
        include: { clinic: { select: { name: true } } },
      }),
      prisma.component.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.blockType.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.serviceType.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.millingDrill.findMany({
        orderBy: { name: "asc" },
        include: {
          millings: {
            select: {
              id: true,
              teethMilledQty: true,
              milledAt: true,
            },
          },
        },
      }),
    ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Registry Management</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage clinics, dentists, components, and equipment
        </p>
      </div>

      <Tabs defaultValue="clinics" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
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
            action={createClinicAction}
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
            columnLabels={["Name", "Phone", "Email"]}
            entityLabel="Clinic"
            updateAction={updateClinicAction}
            deleteAction={deleteClinicAction}
            fields={[
              { name: "name", label: "Clinic Name", placeholder: "Silva Dental" },
              { name: "phone", label: "Phone", type: "text", placeholder: "(11) 3456-7890", optional: true },
              { name: "email", label: "Email", type: "email", placeholder: "contact@clinic.com", optional: true },
              { name: "notes", label: "Notes", type: "textarea", placeholder: "Additional information...", optional: true },
            ]}
            rows={clinics.map((c) => ({
              id: c.id,
              cells: [c.name, c.phone ?? "-", c.email ?? "-"],
              values: { name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" },
            }))}
          />
        </TabsContent>

        {/* Dentists Tab */}
        <TabsContent value="dentists" className="space-y-4">
          <CreateDentistForm action={createDentistAction} clinics={clinics} />

          <RegistryList
            columnLabels={["Name", "Clinic", "Phone", "Email"]}
            entityLabel="Dentist"
            updateAction={updateDentistAction}
            deleteAction={deleteDentistAction}
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
              { name: "notes", label: "Notes", type: "textarea", optional: true },
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
            action={createComponentAction}
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
            columnLabels={["Name", "Category", "Brand", "Cost", "Price", "Status"]}
            entityLabel="Component"
            updateAction={updateComponentAction}
            deleteAction={deleteComponentAction}
            fields={[
              { name: "name", label: "Component Name", placeholder: "Zirconium Disc" },
              { name: "category", label: "Category", placeholder: "Materials", optional: true },
              { name: "brand", label: "Brand", placeholder: "Ivoclar", optional: true },
              { name: "defaultCost", label: "Default Cost", type: "number", placeholder: "0.00", optional: true },
              { name: "defaultPrice", label: "Default Price", type: "number", placeholder: "0.00", optional: true },
              { name: "isActive", label: "Active", type: "checkbox", placeholder: "This component is active", optional: true },
            ]}
            rows={components.map((c) => ({
              id: c.id,
              cells: [
                c.name,
                c.category ?? "-",
                c.brand ?? "-",
                c.defaultCost ? `R$ ${Number(c.defaultCost).toFixed(2)}` : "-",
                c.defaultPrice ? `R$ ${Number(c.defaultPrice).toFixed(2)}` : "-",
                <Badge key="status" variant={c.isActive ? "outline" : "secondary"}>
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
            action={createBlockTypeAction}
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
            columnLabels={["Name", "Material", "Brand", "Size", "Shade", "Cost", "Status"]}
            entityLabel="Block Type"
            updateAction={updateBlockTypeAction}
            deleteAction={deleteBlockTypeAction}
            fields={[
              { name: "name", label: "Block Type Name", placeholder: "Zirconia Block A1" },
              { name: "material", label: "Material", placeholder: "Zirconia", optional: true },
              { name: "brand", label: "Brand", placeholder: "Ivoclar", optional: true },
              { name: "size", label: "Size", placeholder: "14x19x71", optional: true },
              { name: "shade", label: "Shade", placeholder: "A1", optional: true },
              { name: "defaultCost", label: "Default Cost", type: "number", placeholder: "0.00", optional: true },
              { name: "isActive", label: "Active", type: "checkbox", placeholder: "This block type is active", optional: true },
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
                <Badge key="status" variant={b.isActive ? "outline" : "secondary"}>
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
            action={createServiceTypeAction}
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
            columnLabels={["Name", "Notes", "Status"]}
            entityLabel="Service Type"
            updateAction={updateServiceTypeAction}
            deleteAction={deleteServiceTypeAction}
            fields={[
              { name: "name", label: "Service Type Name", placeholder: "Full Crown" },
              { name: "notes", label: "Notes", type: "textarea", placeholder: "Description...", optional: true },
              { name: "isActive", label: "Active", type: "checkbox", placeholder: "This service type is active", optional: true },
            ]}
            rows={serviceTypes.map((s) => ({
              id: s.id,
              cells: [
                s.name,
                s.notes ?? "-",
                <Badge key="status" variant={s.isActive ? "outline" : "secondary"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>,
              ],
              values: { name: s.name, notes: s.notes ?? "", isActive: s.isActive },
            }))}
          />
        </TabsContent>

        {/* Milling Drills Tab */}
        <TabsContent value="milling-drills" className="space-y-4">
          <RegistryForm
            title="Add New Milling Drill"
            description="Register a new milling drill or cutting tool"
            action={createMillingDrillAction}
            fields={[
              {
                name: "name",
                label: "Drill Name",
                placeholder: "Cylindrical Drill 0.8mm",
              },
              {
                name: "type",
                label: "Type",
                placeholder: "Cylindrical",
                optional: true,
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

          <div className="rounded-lg border border-border/40 bg-card">
            <div className="border-b border-border/40 px-4 py-3">
              <h3 className="font-semibold">Drill History</h3>
              <p className="text-sm text-muted-foreground">
                Total teeth milled and replacement date per drill.
              </p>
            </div>

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
                    <TableHead>Changed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drills.map((drill) => {
                    const totalTeeth = drill.millings.reduce(
                      (sum, milling) => sum + milling.teethMilledQty,
                      0,
                    );
                    const lastMilledAt =
                      drill.millings.length > 0
                        ? drill.millings
                            .map((m) => m.milledAt)
                            .sort((a, b) => b.getTime() - a.getTime())[0]
                        : null;

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
                            <Badge variant="outline">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
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
                          {drill.changedAt
                            ? new Date(drill.changedAt).toLocaleDateString(
                                "pt-BR",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <form
                              action={async () => {
                                "use server";
                                await markMillingDrillChangedAction(drill.id);
                              }}
                            >
                              <Button type="submit" variant="outline" size="sm">
                                Mark Changed
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {drills.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No drills registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <RegistryList
            columnLabels={["Name", "Type", "Brand", "Serial", "Max Teeth", "Status"]}
            entityLabel="Drill"
            updateAction={updateMillingDrillAction}
            deleteAction={deleteMillingDrillAction}
            fields={[
              { name: "name", label: "Drill Name", placeholder: "Cylindrical Drill 0.8mm" },
              { name: "type", label: "Type", placeholder: "Cylindrical", optional: true },
              { name: "brand", label: "Brand", placeholder: "Ivoclar", optional: true },
              { name: "serialNumber", label: "Serial Number", placeholder: "SN123456", optional: true },
              { name: "maxTeethRecommended", label: "Max Teeth Recommended", type: "number", placeholder: "100", optional: true },
              { name: "notes", label: "Notes", type: "textarea", placeholder: "Additional information...", optional: true },
              { name: "isActive", label: "Active", type: "checkbox", placeholder: "This drill is active", optional: true },
            ]}
            rows={drills.map((d) => ({
              id: d.id,
              cells: [
                d.name,
                d.type ?? "-",
                d.brand ?? "-",
                d.serialNumber ?? "-",
                d.maxTeethRecommended ?? "-",
                <Badge key="status" variant={d.isActive ? "outline" : "secondary"}>
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
    </main>
  );
}
