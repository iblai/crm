"use client";

import { useState } from "react";
import { useTranslations, type Messages } from "next-intl";
import {
  ArrowDownAZ,
  Check,
  ChevronDown,
  Columns3,
  Filter,
  KanbanSquare,
  Plus,
  Save,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OwnerSelect } from "@/components/crm/owner-select";
import { SearchPicker } from "@/components/crm/search-picker";
import { SimpleSelect, type SelectOption } from "@/components/crm/simple-select";
import {
  errorMessage,
  useCreateSavedViewMutation,
  useDeleteSavedViewMutation,
  useListSavedViewsQuery,
  useListTagsQuery,
  useUpdateSavedViewMutation,
} from "@/lib/crm/api";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { SavedView, SavedViewObject, ViewFilter, ViewSort } from "@/lib/crm/types";
import {
  FILTER_OPERANDS,
  nextFilterOp,
  VIEW_FIELDS,
  isDirty,
  type FieldDef,
  type ViewDraft,
} from "@/lib/crm/views";
import { cn } from "@/lib/utils";

/** A `fields.<object>.<id>` label; `views.test.ts` proves every view field has one. */
type FieldLabelKey = {
  [O in SavedViewObject]: `${O}.${keyof Messages["fields"][O] & string}`;
}[SavedViewObject];

/**
 * Twenty's view bar: a view picker, filter / sort / columns dropdowns and, for
 * deals, the table ⇄ kanban toggle. The page owns the draft; this component
 * edits it and saves it through `/api/crm/views/`.
 */
export function ViewBar({
  objectType,
  draft,
  onChange,
  onSelectView,
  stageOptions,
  sourceOptions,
  defaultDraft,
  canKanban = false,
  className,
}: {
  objectType: SavedViewObject;
  draft: ViewDraft;
  onChange: (draft: ViewDraft) => void;
  /** `null` = back to the default (unsaved) view. */
  onSelectView: (view: SavedView | null) => void;
  stageOptions?: SelectOption[];
  sourceOptions?: SelectOption[];
  /** The page's unsaved starting view, when it is not the empty one. */
  defaultDraft?: ViewDraft;
  canKanban?: boolean;
  className?: string;
}) {
  const t = useTranslations("views");
  const tc = useTranslations("common");
  const tf = useTranslations("fields");
  const { data: views, error: viewsError } = useListSavedViewsQuery({ object_type: objectType });
  const [createView, { isLoading: creating }] = useCreateSavedViewMutation();
  const [updateView, { isLoading: updating }] = useUpdateSavedViewMutation();
  const [deleteView] = useDeleteSavedViewMutation();
  const saved = views?.results.find((v) => v.id === draft.id);
  const dirty = isDirty(draft, saved, defaultDraft);
  const fields = VIEW_FIELDS[objectType];
  const fieldLabel = (id: string) => tf(`${objectType}.${id}` as FieldLabelKey);

  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const payload = {
    object_type: objectType,
    type: draft.type,
    columns: draft.columns,
    filters: draft.filters,
    sorts: draft.sorts,
    group_by: draft.group_by,
  };

  const saveAsNew = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const view = await createView({ ...payload, name: trimmed }).unwrap();
      setNaming(false);
      setName("");
      onSelectView(view);
      toast.success(t("saved", { name: view.name }));
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  const update = async () => {
    if (!saved) return;
    try {
      const view = await updateView({ id: saved.id, body: payload }).unwrap();
      onSelectView(view);
      toast.success(t("updated", { name: view.name }));
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  const remove = async () => {
    if (!saved) return;
    try {
      await deleteView(saved.id).unwrap();
      onSelectView(null);
      toast.success(t("deleted", { name: saved.name }));
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  const setFilter = (index: number, filter: ViewFilter) =>
    onChange({ ...draft, filters: draft.filters.map((f, i) => (i === index ? filter : f)) });
  const removeFilter = (index: number) =>
    onChange({ ...draft, filters: draft.filters.filter((_, i) => i !== index) });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* ---------------------------------------------------- view picker */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="sm" className="max-w-56 font-medium" />}
          >
            <span className="truncate">{saved ? saved.name : t("allRecords")}</span>
            {dirty ? (
              <span className="size-1.5 rounded-full bg-gray-400" aria-label={t("unsaved")} />
            ) : null}
            <ChevronDown className="text-muted-foreground size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                {t("pickerTitle")}
              </DropdownMenuLabel>
              {viewsError ? (
                <p className="text-muted-foreground px-2 py-1 text-xs">
                  {errorMessage(viewsError, tc("errorGeneric"))}
                </p>
              ) : null}
              <DropdownMenuItem onClick={() => onSelectView(null)} className="gap-2">
                <span className="flex-1 truncate">{t("allRecords")}</span>
                {!saved ? <Check className="size-4 text-[#0058cc]" /> : null}
              </DropdownMenuItem>
              {(views?.results ?? []).map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => onSelectView(view)}
                  className="gap-2"
                >
                  {view.type === "kanban" ? (
                    <KanbanSquare className="text-muted-foreground size-4" strokeWidth={1.75} />
                  ) : (
                    <Table2 className="text-muted-foreground size-4" strokeWidth={1.75} />
                  )}
                  <span className="flex-1 truncate">{view.name}</span>
                  {view.id === saved?.id ? <Check className="size-4 text-[#0058cc]" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setNaming(true)} className="gap-2">
              <Plus className="size-4" strokeWidth={1.75} /> {t("saveAsNew")}
            </DropdownMenuItem>
            {saved ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void remove()}
                className="gap-2"
              >
                <Trash2 className="size-4" strokeWidth={1.75} /> {t("deleteView")}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        {canKanban ? (
          <div className="flex rounded-md border border-[var(--border-color,#e5e7eb)] bg-white p-0.5">
            {(["table", "kanban"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ ...draft, type })}
                aria-pressed={draft.type === type}
                aria-label={t(type === "table" ? "tableView" : "kanbanView")}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded px-2 text-xs",
                  draft.type === type
                    ? "bg-gray-100 text-gray-900"
                    : "text-[#5f5f61] hover:bg-gray-50",
                )}
              >
                {type === "table" ? (
                  <Table2 className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <KanbanSquare className="size-3.5" strokeWidth={1.75} />
                )}
                {t(type === "table" ? "tableView" : "kanbanView")}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-1">
          {/* --------------------------------------------------------- filter */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <Filter className="size-3.5" strokeWidth={1.75} /> {t("filter")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {t("addFilter")}
                </DropdownMenuLabel>
                {fields
                  .flatMap((field) => {
                    const op = nextFilterOp(field, draft.filters);
                    return op ? [{ field, op }] : [];
                  })
                  .map(({ field, op }) => (
                    <DropdownMenuItem
                      key={field.id}
                      onClick={() =>
                        onChange({
                          ...draft,
                          filters: [...draft.filters, { field: field.id, op, value: undefined }],
                        })
                      }
                    >
                      {fieldLabel(field.id)}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ----------------------------------------------------------- sort */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <ArrowDownAZ className="size-3.5" strokeWidth={1.75} /> {t("sort")}
              {draft.sorts[0] ? (
                <span className="text-muted-foreground text-xs">
                  · {fieldLabel(draft.sorts[0].field)} {draft.sorts[0].dir === "desc" ? "↓" : "↑"}
                </span>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {t("sortBy")}
                </DropdownMenuLabel>
                {fields
                  .filter((f) => f.sortable)
                  .map((field) => {
                    const current = draft.sorts[0];
                    const dir: ViewSort["dir"] =
                      current?.field === field.id && current.dir === "asc" ? "desc" : "asc";
                    return (
                      <DropdownMenuItem
                        key={field.id}
                        onClick={() => onChange({ ...draft, sorts: [{ field: field.id, dir }] })}
                        className="gap-2"
                      >
                        <span className="flex-1">{fieldLabel(field.id)}</span>
                        {current?.field === field.id ? (
                          <span className="text-muted-foreground text-xs">
                            {current.dir === "desc" ? "↓" : "↑"}
                          </span>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuGroup>
              {draft.sorts.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onChange({ ...draft, sorts: [] })}>
                    {t("clearSort")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* -------------------------------------------------------- columns */}
          {draft.type === "table" && draft.columns.length > 0 ? (
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
                <Columns3 className="size-3.5" strokeWidth={1.75} /> {t("columns")}
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 gap-1">
                <p className="text-muted-foreground px-1 text-xs">{t("columnsHint")}</p>
                {draft.columns.map((column) => (
                  <label
                    key={column.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={column.visible}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...draft,
                          columns: draft.columns.map((c) =>
                            c.id === column.id ? { ...c, visible: checked === true } : c,
                          ),
                        })
                      }
                    />
                    <span className="truncate">{fieldLabel(column.id)}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          ) : null}

          {/* ----------------------------------------------------------- save */}
          {dirty && saved ? (
            <Button variant="outline" size="sm" onClick={() => void update()} disabled={updating}>
              <Save className="size-3.5" strokeWidth={1.75} /> {t("updateView")}
            </Button>
          ) : null}
          {dirty ? (
            <Button variant="outline" size="sm" onClick={() => setNaming(true)}>
              <Plus className="size-3.5" strokeWidth={1.75} /> {t("saveAsNew")}
            </Button>
          ) : null}
        </div>
      </div>

      {/* ------------------------------------------------------ filter chips */}
      {draft.filters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {draft.filters.map((filter, index) => {
            const field = fields.find((f) => f.id === filter.field);
            if (!field) return null;
            return (
              <FilterChip
                key={`${filter.field}-${index}`}
                field={field}
                filter={filter}
                label={fieldLabel(field.id)}
                stageOptions={stageOptions}
                sourceOptions={sourceOptions}
                onChange={(next) => setFilter(index, next)}
                onRemove={() => removeFilter(index)}
              />
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...draft, filters: [] })}>
            {tc("clearFilters")}
          </Button>
        </div>
      ) : null}

      {/* ------------------------------------------------------- name prompt */}
      {naming ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveAsNew();
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            className="h-8 max-w-xs text-sm"
            aria-label={t("namePlaceholder")}
          />
          <Button
            type="submit"
            size="sm"
            className="ibl-button-primary"
            disabled={creating || !name.trim()}
          >
            {tc("save")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setNaming(false)}>
            {tc("cancel")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function FilterChip({
  field,
  filter,
  label,
  stageOptions,
  sourceOptions,
  onChange,
  onRemove,
}: {
  field: FieldDef;
  filter: ViewFilter;
  label: string;
  stageOptions?: SelectOption[];
  sourceOptions?: SelectOption[];
  onChange: (filter: ViewFilter) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("views");
  const enums = useCrmEnums();
  const { data: tags } = useListTagsQuery(undefined, { skip: field.relation !== "tag" });
  const needsValue = !["isEmpty", "isNotEmpty"].includes(filter.op);
  const value = filter.value as string | number | boolean | null | undefined;

  const operandOptions = FILTER_OPERANDS[field.kind].map((op) => ({
    value: op,
    label: t(`op.${op}`),
  }));
  const enumOptions =
    field.options === "lifecycle"
      ? enums.lifecycleOptions
      : field.options === "dealStatus"
        ? enums.dealStatusOptions
        : field.options === "activityType"
          ? enums.activityTypeOptions
          : [];

  let input: React.ReactNode = null;
  if (needsValue) {
    if (field.kind === "text") {
      input = (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange({ ...filter, value: event.target.value })}
          className="h-7 w-40 text-xs"
          aria-label={label}
        />
      );
    } else if (field.kind === "date") {
      input = (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange({ ...filter, value: event.target.value })}
          className="h-7 w-40 text-xs"
          aria-label={label}
        />
      );
    } else if (field.kind === "boolean") {
      input = (
        <SimpleSelect
          value={value === undefined ? "" : String(value)}
          onChange={(v) => onChange({ ...filter, value: v === "" ? undefined : v === "true" })}
          options={[
            { value: "true", label: t("yes") },
            { value: "false", label: t("no") },
          ]}
          size="sm"
          className="w-28"
          aria-label={label}
        />
      );
    } else if (field.kind === "select") {
      input = (
        <SimpleSelect
          value={typeof value === "string" ? value : ""}
          onChange={(v) => onChange({ ...filter, value: v || undefined })}
          options={enumOptions}
          size="sm"
          className="w-40"
          aria-label={label}
        />
      );
    } else if (field.relation === "owner") {
      input = (
        <OwnerSelect
          value={typeof value === "number" ? value : null}
          onChange={(owner) => onChange({ ...filter, value: owner ?? undefined })}
          size="sm"
          className="w-44"
        />
      );
    } else if (field.relation === "person" || field.relation === "organization") {
      input = (
        <SearchPicker
          kind={field.relation}
          value={typeof value === "string" ? value : null}
          onChange={(id) => onChange({ ...filter, value: id ?? undefined })}
          size="sm"
          className="w-48"
        />
      );
    } else if (field.relation === "stage" || field.relation === "source") {
      input = (
        <SimpleSelect
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(v) => onChange({ ...filter, value: v ? Number(v) : undefined })}
          options={(field.relation === "stage" ? stageOptions : sourceOptions) ?? []}
          size="sm"
          className="w-44"
          aria-label={label}
        />
      );
    } else if (field.relation === "tag") {
      input = (
        <SimpleSelect
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(v) => onChange({ ...filter, value: v ? Number(v) : undefined })}
          options={(tags?.results ?? []).map((tag) => ({ value: String(tag.id), label: tag.name }))}
          size="sm"
          className="w-40"
          aria-label={label}
        />
      );
    } else {
      input = (
        <Input
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => onChange({ ...filter, value: event.target.value || undefined })}
          className="h-7 w-40 text-xs"
          aria-label={label}
        />
      );
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-[var(--border-color,#e5e7eb)] bg-white py-0.5 pr-0.5 pl-2 text-xs">
      <span className="font-medium text-gray-700">{label}</span>
      <SimpleSelect
        value={filter.op}
        onChange={(op) =>
          onChange({
            ...filter,
            op,
            value: ["isEmpty", "isNotEmpty"].includes(op) ? undefined : filter.value,
          })
        }
        options={operandOptions}
        size="sm"
        className="w-32 border-transparent bg-transparent shadow-none"
        aria-label={t("operand")}
      />
      {input}
      <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label={t("removeFilter")}>
        <X className="size-3" />
      </Button>
    </div>
  );
}
