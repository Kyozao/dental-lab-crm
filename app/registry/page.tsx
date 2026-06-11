import { PageHeader } from "@/components/app/page-header";
import { PageShell } from "@/components/app/page-shell";
import { Panel, PanelHeader } from "@/components/app/panel";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockRegistry } from "@/lib/mock-data/pages";

export default function RegistryPage() {
  return (
    <PageShell width="default">
      <PageHeader
        title="Registry Management"
        description="Read-only mock registry data. API-backed create/edit/delete is disabled for now."
      />

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="customers">customers</TabsTrigger>
          <TabsTrigger value="dentists">Dentists</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="block-types">Block Types</TabsTrigger>
          <TabsTrigger value="service-types">Service Types</TabsTrigger>
          <TabsTrigger value="milling-drills">Drills</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">customers</h2>
            </PanelHeader>
            <SimpleTable
              headers={["Name", "Phone", "Email"]}
              rows={mockRegistry.customers.map((customer) => [
                customer.name,
                customer.phone ?? "-",
                customer.email ?? "-",
              ])}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="dentists">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Dentists</h2>
            </PanelHeader>
            <SimpleTable
              headers={["Name", "customer", "Phone", "Email"]}
              rows={mockRegistry.dentists.map((dentist) => [
                dentist.name,
                dentist.customerName,
                dentist.phone ?? "-",
                dentist.email ?? "-",
              ])}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="components">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Components</h2>
            </PanelHeader>
            <SimpleTable
              headers={["Name", "Category", "Brand", "Cost", "Price"]}
              rows={mockRegistry.components.map((component) => [
                component.name,
                component.category ?? "-",
                component.brand ?? "-",
                component.defaultCost ?? "-",
                component.defaultPrice ?? "-",
              ])}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="block-types">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Block Types</h2>
            </PanelHeader>
            <SimpleTable
              headers={["Name", "Material", "Brand", "Size", "Shade"]}
              rows={mockRegistry.blockTypes.map((block) => [
                block.name,
                block.material ?? "-",
                block.brand ?? "-",
                block.size ?? "-",
                block.shade ?? "-",
              ])}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="service-types">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Service Types</h2>
            </PanelHeader>
            <SimpleTable
              headers={["Name", "Status"]}
              rows={mockRegistry.serviceTypes.map((serviceType) => [
                serviceType.name,
                serviceType.isActive ? "Active" : "Inactive",
              ])}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="milling-drills">
          <Panel>
            <PanelHeader>
              <h2 className="text-xl font-semibold">Milling Drills</h2>
            </PanelHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4">Name</TableHead>
                    <TableHead className="px-6 py-4">Type</TableHead>
                    <TableHead className="px-6 py-4">Brand</TableHead>
                    <TableHead className="px-6 py-4">Serial</TableHead>
                    <TableHead className="px-6 py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRegistry.drills.map((drill) => (
                    <TableRow key={drill.id}>
                      <TableCell className="px-6 py-4 font-medium">
                        {drill.name}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {drill.type ?? "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {drill.brand ?? "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {drill.serialNumber ?? "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={drill.isActive ? "success" : "neutral"}>
                          {drill.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="px-6 py-4">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.join("-")}>
              {row.map((cell, index) => (
                <TableCell
                  key={`${cell}-${index}`}
                  className={index === 0 ? "px-6 py-4 font-medium" : "px-6 py-4"}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
