"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  rectIntersection,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ClipboardList,
  Download,
  User2,
  Paperclip,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type CadDesignerOption,
  type ClinicOption,
  type ComponentOption,
  type EditableCase,
  type ServiceTypeOption,
} from "@/app/cases/case.shared";
import {
  type CurrentUser,
  FILTER_OPTIONS,
  type FilterOption,
  KANBAN_COLUMNS,
  formatKanbanDate,
  isCaseDueToday,
  isCaseOverdue,
} from "../kanban.shared";
import { CaseDetailsDialog } from "@/components/cases/case-details-dialog";
import {
  getColumnDownloadUrlsApi,
  updateCaseStatusApi,
} from "@/lib/api/cases-client";

type Props = {
  currentUser: CurrentUser;
  initialCases: EditableCase[];
  designers: CadDesignerOption[];
  clinics: ClinicOption[];
  serviceTypes: ServiceTypeOption[];
  components: ComponentOption[];
};

export function CadKanbanBoard({
  currentUser,
  initialCases,
  designers,
  clinics,
  serviceTypes,
  components,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const [cases, setCases] = React.useState<EditableCase[]>(initialCases);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [selectedDesignerId, setSelectedDesignerId] = React.useState("all");
  const [selectedFilter, setSelectedFilter] = React.useState<FilterOption>(
    FILTER_OPTIONS.ALL,
  );
  const [detailsCaseId, setDetailsCaseId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCases(initialCases);
  }, [initialCases]);

  const visibleCases = React.useMemo(() => {
    let base = cases;

    if (currentUser.role === "CAD_DESIGNER") {
      base = base.filter((item) => item.cadDesignerId === currentUser.id);
    } else if (selectedDesignerId === "unassigned") {
      base = base.filter((item) => !item.cadDesignerId);
    } else if (selectedDesignerId !== "all") {
      base = base.filter((item) => item.cadDesignerId === selectedDesignerId);
    }

    switch (selectedFilter) {
      case FILTER_OPTIONS.OVERDUE:
        base = base.filter((item) => isCaseOverdue(item.dueDate));
        break;
      case FILTER_OPTIONS.DUE_TODAY:
        base = base.filter((item) => isCaseDueToday(item.dueDate));
        break;
      case FILTER_OPTIONS.URGENT:
        base = base.filter((item) => item.isUrgent);
        break;
      case FILTER_OPTIONS.WAITING:
        base = base.filter(
          (item) =>
            item.currentStatus === "WAITING_INFO" ||
            item.currentStatus === "WAITING_APPROVAL",
        );
        break;
      default:
        break;
    }

    return base;
  }, [
    cases,
    currentUser.id,
    currentUser.role,
    selectedDesignerId,
    selectedFilter,
  ]);

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return rectIntersection(args);
  };

  const cardsByColumn = React.useMemo(() => {
    const grouped = Object.fromEntries(
      KANBAN_COLUMNS.map((column) => [column.id, [] as EditableCase[]]),
    ) as Record<(typeof KANBAN_COLUMNS)[number]["id"], EditableCase[]>;

    for (const item of visibleCases) {
      grouped[item.currentStatus].push(item);
    }

    return grouped;
  }, [visibleCases]);

  const boardSummary = React.useMemo(() => {
    const initial = {
      millingCases: 0,
      millingElements: 0,
      printedCases: 0,
      printedElements: 0,
      missingShadeElements: 0,
      shades: new Map<string, number>(),
    };

    for (const item of visibleCases) {
      const normalizedServiceType = item.serviceTypeName.trim().toLowerCase();
      const elementsQty = item.elementsQty ?? 0;
      const isPlanning = normalizedServiceType === "planejamento";

      if (isPlanning) {
        initial.printedCases += 1;
        initial.printedElements += elementsQty;
        continue;
      }

      initial.millingCases += 1;
      initial.millingElements += elementsQty;

      if (!elementsQty) {
        continue;
      }

      const shade = item.shade.trim().toUpperCase();

      if (!shade) {
        initial.missingShadeElements += elementsQty;
        continue;
      }

      initial.shades.set(shade, (initial.shades.get(shade) ?? 0) + elementsQty);
    }

    const shadeEntries = Array.from(initial.shades.entries()).sort(
      (left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }

        return left[0].localeCompare(right[0]);
      },
    );

    return {
      millingCases: initial.millingCases,
      millingElements: initial.millingElements,
      printedCases: initial.printedCases,
      printedElements: initial.printedElements,
      missingShadeElements: initial.missingShadeElements,
      shadeEntries,
    };
  }, [visibleCases]);

  const activeCase = React.useMemo(
    () => cases.find((item) => item.id === activeId) ?? null,
    [cases, activeId],
  );

  const detailsCase = React.useMemo(
    () => cases.find((item) => item.id === detailsCaseId) ?? null,
    [cases, detailsCaseId],
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const draggedId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;

    if (!overId) return;

    const draggedCase = cases.find((item) => item.id === draggedId);
    if (!draggedCase) return;

    const targetColumn = KANBAN_COLUMNS.find((column) => column.id === overId);
    const targetCard = cases.find((item) => item.id === overId);

    const nextStatus = targetColumn?.id ?? targetCard?.currentStatus ?? null;

    if (!nextStatus || draggedCase.currentStatus === nextStatus) return;

    const previousCases = cases;

    setCases((prev) =>
      prev.map((item) =>
        item.id === draggedId ? { ...item, currentStatus: nextStatus } : item,
      ),
    );

    try {
      await updateCaseStatusApi(draggedId, nextStatus);
    } catch (error) {
      console.error(error);
      setCases(previousCases);
      alert(
        error instanceof Error ? error.message : "Could not update status.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto space-y-6 p-4 md:p-6 md:px-12">
        <header className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              CAD Kanban
            </h1>
            <p className="text-sm text-muted-foreground">
              Arraste no desktop. No celular, abra o caso e atualize por
              detalhes.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={selectedFilter === FILTER_OPTIONS.ALL}
                onClick={() => setSelectedFilter(FILTER_OPTIONS.ALL)}
              >
                Todos
              </FilterChip>
              <FilterChip
                active={selectedFilter === FILTER_OPTIONS.OVERDUE}
                onClick={() => setSelectedFilter(FILTER_OPTIONS.OVERDUE)}
              >
                Atrasados
              </FilterChip>
              <FilterChip
                active={selectedFilter === FILTER_OPTIONS.DUE_TODAY}
                onClick={() => setSelectedFilter(FILTER_OPTIONS.DUE_TODAY)}
              >
                Hoje
              </FilterChip>
              <FilterChip
                active={selectedFilter === FILTER_OPTIONS.URGENT}
                onClick={() => setSelectedFilter(FILTER_OPTIONS.URGENT)}
              >
                Urgentes
              </FilterChip>
              <FilterChip
                active={selectedFilter === FILTER_OPTIONS.WAITING}
                onClick={() => setSelectedFilter(FILTER_OPTIONS.WAITING)}
              >
                Pendentes
              </FilterChip>
            </div>

            {currentUser.role !== "CAD_DESIGNER" ? (
              <div className="grid gap-1">
                <label className="text-sm font-medium">Filtrar CADista</label>
                <select
                  value={selectedDesignerId}
                  onChange={(e) => setSelectedDesignerId(e.target.value)}
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="unassigned">Não atribuído</option>
                  {designers.map((designer) => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name ?? "Sem nome"}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <KanbanSummary summary={boardSummary} />
        </header>

        <div className="hidden md:block">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4  justify-between ">
              {KANBAN_COLUMNS.map((column) => (
                <KanbanColumn
                  key={column.id}
                  columnId={column.id}
                  title={column.title}
                  hint={column.hint}
                  cards={cardsByColumn[column.id]}
                  onOpenDetails={(id) => setDetailsCaseId(id)}
                  currentUserRole={currentUser.role}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCase ? (
                <CaseCard
                  item={activeCase}
                  dragging
                  currentUserRole={currentUser.role}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className="space-y-5 md:hidden ">
          {KANBAN_COLUMNS.map((column) => {
            const cards = cardsByColumn[column.id];
            if (!cards.length) return null;

            return (
              <section key={column.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{column.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {column.hint}
                    </p>
                  </div>
                  <Badge variant="secondary">{cards.length}</Badge>
                </div>

                <div className="space-y-3">
                  {cards.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full text-left"
                      onClick={() => setDetailsCaseId(item.id)}
                    >
                      <CaseCard
                        item={item}
                        currentUserRole={currentUser.role}
                      />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <CaseDetailsDialog
          open={Boolean(detailsCase)}
          onOpenChange={(open) => {
            if (!open) setDetailsCaseId(null);
          }}
          item={detailsCase}
          currentUserRole={currentUser.role}
          clinics={clinics}
          serviceTypes={serviceTypes}
          cadDesigners={designers}
          components={components}
        />
      </div>
    </main>
  );
}

function KanbanSummary({
  summary,
}: {
  summary: {
    millingCases: number;
    millingElements: number;
    printedCases: number;
    printedElements: number;
    missingShadeElements: number;
    shadeEntries: Array<[string, number]>;
  };
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="rounded-2xl border bg-card/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Resumo para blocos
              </p>
              <p className="text-xs text-muted-foreground">
                Baseado nos casos visiveis no kanban.
              </p>
            </div>
            <Badge variant="secondary">Fresagem</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryMetric
              label="Elementos para fresar"
              value={summary.millingElements}
            />
            <SummaryMetric
              label="Casos de fresagem"
              value={summary.millingCases}
            />
            <SummaryMetric
              label="Sem cor definida"
              value={summary.missingShadeElements}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                Cores para pedir
              </p>
              <span className="text-xs text-muted-foreground">
                Soma por numero de elementos
              </span>
            </div>

            {summary.shadeEntries.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.shadeEntries.map(([shade, qty]) => (
                  <Badge
                    key={shade}
                    variant="outline"
                    className="rounded-full px-3 py-1"
                  >
                    {shade}: {qty}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma cor definida para os casos de fresagem visiveis.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-dashed bg-card/70 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Separado de Planejamento
              </p>
              <p className="text-xs text-muted-foreground">
                Estes casos ficam fora da conta de blocos.
              </p>
            </div>
            <Badge variant="outline">Impressao</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryMetric
              label="Elementos em Planejamento"
              value={summary.printedElements}
            />
            <SummaryMetric
              label="Casos em Planejamento"
              value={summary.printedCases}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background/80 p-3">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function getScanCount(item: EditableCase) {
  return item.attachments.filter(
    (attachment) => attachment.kind === "SCAN_INPUT",
  ).length;
}

function getFinalCount(item: EditableCase) {
  return item.attachments.filter(
    (attachment) =>
      attachment.kind === "DESIGN_OUTPUT" || attachment.kind === "MODEL_OUTPUT",
  ).length;
}

function getColumnDownloadKind(
  columnId: (typeof KANBAN_COLUMNS)[number]["id"],
): "SCAN_INPUT" | "FINAL_OUTPUTS" | "ALL" {
  if (
    columnId === "ENTRY" ||
    columnId === "WAITING_INFO" ||
    columnId === "DESIGNING"
  ) {
    return "SCAN_INPUT";
  }

  if (
    columnId === "WAITING_APPROVAL" ||
    columnId === "DESIGN_READY" ||
    columnId === "MILLING_PRINTING" ||
    columnId === "DONE"
  ) {
    return "FINAL_OUTPUTS";
  }

  return "ALL";
}

function getColumnDownloadLabel(kind: "SCAN_INPUT" | "FINAL_OUTPUTS" | "ALL") {
  if (kind === "SCAN_INPUT") {
    return "Baixar scans";
  }

  if (kind === "FINAL_OUTPUTS") {
    return "Baixar finais";
  }

  return "Baixar arquivos";
}

function KanbanColumn({
  columnId,
  title,
  hint,
  cards,
  onOpenDetails,
  currentUserRole,
}: {
  columnId: (typeof KANBAN_COLUMNS)[number]["id"];
  title: string;
  hint: string;
  cards: EditableCase[];
  onOpenDetails: (id: string) => void;
  currentUserRole: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  const [isDownloading, setIsDownloading] = React.useState(false);
  const preferredDownloadKind = getColumnDownloadKind(columnId);
  const hasDownloads = cards.some((card) => {
    if (preferredDownloadKind === "SCAN_INPUT") {
      return getScanCount(card) > 0;
    }

    if (preferredDownloadKind === "FINAL_OUTPUTS") {
      return getFinalCount(card) > 0;
    }

    return card.attachments.length > 0;
  });

  async function handleDownloadAll() {
    if (!cards.length) {
      return;
    }

    try {
      setIsDownloading(true);
      const downloads = await getColumnDownloadUrlsApi(
        cards.map((card) => card.id),
        preferredDownloadKind,
      );

      if (!downloads.length) {
        alert("Nenhum arquivo disponível nesta coluna ainda.");
        return;
      }

      for (const item of downloads) {
        const response = await fetch(item.signedUrl);
        if (!response.ok) {
          throw new Error(`Could not download ${item.fileName}.`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeCaseLabel = (item.caseLabel || item.caseId).replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );

        link.href = objectUrl;
        link.download = `${safeCaseLabel}-${item.fileName}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Could not download files.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[320px] shrink-0 rounded-2xl border bg-card/50 p-3 transition-colors",
        isOver && "border-primary bg-accent/40",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="secondary">{cards.length}</Badge>
          {hasDownloads ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleDownloadAll()}
              disabled={isDownloading}
              className="h-8 px-2 text-xs"
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              {isDownloading
                ? "Baixando..."
                : getColumnDownloadLabel(preferredDownloadKind)}
            </Button>
          ) : null}
        </div>
      </div>

      <SortableContext
        items={cards.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-30 space-y-3">
          {cards.map((item) => (
            <SortableCaseCard
              key={item.id}
              item={item}
              onOpenDetails={onOpenDetails}
              currentUserRole={currentUserRole}
            />
          ))}
          {cards.length === 0 ? (
            <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
              Solte um caso aqui
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCaseCard({
  item,
  onOpenDetails,
  currentUserRole,
}: {
  item: EditableCase;
  onOpenDetails: (id: string) => void;
  currentUserRole: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div {...attributes} {...listeners}>
        <CaseCard
          item={item}
          dragging={isDragging}
          currentUserRole={currentUserRole}
          onOpen={() => onOpenDetails(item.id)}
        />
      </div>
    </div>
  );
}

function CaseCard({
  item,
  dragging = false,
  onOpen,
  currentUserRole,
}: {
  item: EditableCase;
  dragging?: boolean;
  onOpen?: () => void;
  currentUserRole: string;
}) {
  const overdue = isCaseOverdue(item.dueDate);
  const isDesigner = currentUserRole === "CAD_DESIGNER";
  const scanCount = getScanCount(item);
  const finalCount = getFinalCount(item);

  return (
    <Card
      className={cn(
        "rounded-xl border shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-90 shadow-lg",
        onOpen && "cursor-pointer",
      )}
      onClick={onOpen}
    >
      <CardHeader className="space-y-2 p-3 pb-2">
        <div className="flex flex-col gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.patientName}</div>
            <div className="truncate text-xs text-muted-foreground">
              {item.code || "Sem código"}
              {!isDesigner && item.clinicName ? ` • ${item.clinicName}` : ""}
            </div>
          </div>

          <div className="flex gap-1">
            {item.shade ? <Badge variant="outline">{item.shade}</Badge> : null}
            {item.isUrgent ? (
              <Badge variant="destructive">Urgente</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-3 pt-0 text-sm">
        <div className="grid gap-2 text-xs text-muted-foreground">
          {!isDesigner && item.dentistName ? (
            <div className="flex items-center gap-2">
              <User2 className="h-3.5 w-3.5" />
              <span className="truncate">{item.dentistName}</span>
            </div>
          ) : null}

          {item.serviceTypeName ? (
            <div className="flex items-start gap-2">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">
                Serviço: {item.serviceTypeName}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <User2 className="h-3.5 w-3.5" />
            <span className="truncate">
              CAD: {item.cadDesignerName || "Não atribuído"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className={cn(overdue && "font-medium text-red-500")}>
              {formatKanbanDate(item.dueDate)}
            </span>
          </div>

          {item.teeth ? (
            <div className="flex items-start gap-2">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">
                {item.teeth ? `Dentes: ${item.teeth}` : ""}
              </span>
            </div>
          ) : null}

          {item.elementsQty ? (
            <div className="flex items-start gap-2">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">
                {item.elementsQty
                  ? `Quantidade de Elementos: ${item.elementsQty}`
                  : ""}
              </span>
            </div>
          ) : null}

          {item.attachments.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5" />
                <span>{item.attachments.length} arquivo(s)</span>
              </div>
              {scanCount > 0 ? (
                <Badge variant="outline">Scan {scanCount}</Badge>
              ) : null}
              {finalCount > 0 ? (
                <Badge variant="secondary">Final {finalCount}</Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {item.pendingNote ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="font-medium">Pendente:</span> {item.pendingNote}
          </div>
        ) : null}

        {item.components.length > 0 ? (
          <div className="rounded-lg border bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
            <div className="mb-2 font-medium text-foreground">Componentes</div>
            <div className="space-y-1.5">
              {item.components.map((component) => (
                <div
                  key={component.id}
                  className="rounded-md border bg-background/80 px-2 py-1.5"
                >
                  <div className="font-medium text-foreground">
                    {component.componentName} x{component.quantity}
                  </div>
                  {component.notes ? (
                    <div className="line-clamp-2">{component.notes}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {item.observations ? (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {item.observations}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
