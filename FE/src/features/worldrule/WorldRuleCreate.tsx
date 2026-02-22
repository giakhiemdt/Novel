import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getAllLocations } from "../location/location.api";
import type { Location } from "../location/location.types";
import { getTimelineSegmentsPage } from "../timeline/timeline-structure.api";
import type { TimelineSegment } from "../timeline/timeline-structure.types";
import {
  createWorldRule,
  deleteWorldRule,
  getWorldRulesPage,
  updateWorldRule,
} from "./worldrule.api";
import { validateWorldRule } from "./worldrule.schema";
import type { WorldRule, WorldRulePayload, WorldRuleStatus } from "./worldrule.types";
import { WorldRuleList } from "./WorldRuleList";

const initialState = {
  ruleCode: "",
  title: "",
  tldr: "",
  category: "",
  description: "",
  scope: [] as string[],
  timelineIds: [] as string[],
  triggerConditions: [] as string[],
  coreRules: [] as string[],
  consequences: [] as string[],
  examples: [] as string[],
  relatedRuleCodes: [] as string[],
  constraints: "",
  exceptions: "",
  status: "draft" as WorldRuleStatus,
  version: "",
  validFrom: "",
  validTo: "",
  notes: "",
  tags: [] as string[],
};

type WorldRuleFormState = typeof initialState;

const STATUS_OPTIONS: WorldRuleStatus[] = ["draft", "active", "deprecated"];

const normalizeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    );
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    return [trimmed];
  }
  return [];
};

export const WorldRuleCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<WorldRuleFormState>(initialState);
  const [items, setItems] = useState<WorldRule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [relatedRuleCodeOptions, setRelatedRuleCodeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WorldRule | null>(null);
  const [editValues, setEditValues] = useState<WorldRuleFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    title: "",
    category: "",
    status: "",
    scope: "",
    tag: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();
  const locationNameById = useMemo(
    () =>
      Object.fromEntries(
        locations.map((location) => [location.id, location.name])
      ) as Record<string, string>,
    [locations]
  );
  const timelineNameById = useMemo(
    () =>
      Object.fromEntries(
        segments.map((segment) => [segment.id, segment.name])
      ) as Record<string, string>,
    [segments]
  );

  const addSelection = (current: string[], itemId: string) => {
    if (!itemId || current.includes(itemId)) {
      return current;
    }
    return [...current, itemId];
  };

  const removeSelection = (current: string[], itemId: string) =>
    current.filter((item) => item !== itemId);

  const getAvailableRelatedRuleOptions = (
    selectedCodes: string[],
    currentRuleCode: string
  ) =>
    relatedRuleCodeOptions.filter(
      (option) =>
        !selectedCodes.includes(option.value) &&
        (currentRuleCode.trim().length === 0 || option.value !== currentRuleCode.trim())
    );

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getWorldRulesPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = response?.data ?? [];
      const total = typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage = total !== undefined ? offset + Math.min(data.length, pageSize) < total : data.length > pageSize;
      const trimmed = nextPage ? data.slice(0, pageSize) : data;
      const normalized = trimmed.map((item) => ({
        ...item,
        scope: normalizeStringList(item.scope),
        timelineIds: normalizeStringList(item.timelineIds),
        triggerConditions: normalizeStringList(item.triggerConditions),
        coreRules: normalizeStringList(item.coreRules),
        consequences: normalizeStringList(item.consequences),
        examples: normalizeStringList(item.examples),
        relatedRuleCodes: normalizeStringList(item.relatedRuleCodes),
      }));
      setTotalCount(total);
      if (trimmed.length === 0 && page > 1) {
        setHasNext(false);
        setItems([]);
        setPage((prev) => Math.max(1, prev - 1));
        return;
      }
      setItems(normalized);
      setHasNext(nextPage);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [page, pageSize, filters, notify, getWorldRulesPage]);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getAllLocations();
      setLocations(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  const loadSegments = useCallback(async () => {
    try {
      const response = await getTimelineSegmentsPage({ limit: 500, offset: 0 });
      setSegments(response?.data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  const loadRelatedRuleCodeOptions = useCallback(async () => {
    try {
      const limit = 200;
      let offset = 0;
      let done = false;
      const seen = new Set<string>();
      const options: { value: string; label: string }[] = [];

      while (!done) {
        const response = await getWorldRulesPage({ limit, offset });
        const batch = response?.data ?? [];
        for (const rule of batch) {
          const code =
            typeof rule.ruleCode === "string" ? rule.ruleCode.trim() : "";
          if (!code || seen.has(code)) {
            continue;
          }
          seen.add(code);
          const title =
            typeof rule.title === "string" ? rule.title.trim() : "";
          options.push({
            value: code,
            label: title ? `${code} - ${title}` : code,
          });
        }

        const total =
          typeof response?.meta?.total === "number"
            ? response.meta.total
            : undefined;
        offset += batch.length;
        if (total !== undefined) {
          done = offset >= total || batch.length === 0;
        } else {
          done = batch.length < limit;
        }
      }

      options.sort((a, b) =>
        a.value.localeCompare(b.value, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
      setRelatedRuleCodeOptions(options);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    void loadLocations();
    void loadSegments();
    void loadRelatedRuleCodeOptions();
  }, [loadLocations, loadSegments, loadRelatedRuleCodeOptions]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadLocations();
    void loadSegments();
    void loadRelatedRuleCodeOptions();
  });

  const handleFilterChange = (
    key: "q" | "title" | "category" | "status" | "scope" | "tag",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      title: "",
      category: "",
      status: "",
      scope: "",
      tag: "",
    });
  };

  const mapWorldRuleToForm = (item: WorldRule): WorldRuleFormState => ({
    ruleCode: item.ruleCode ?? "",
    title: item.title ?? "",
    tldr: item.tldr ?? "",
    category: item.category ?? "",
    description: item.description ?? "",
    scope: normalizeStringList(item.scope),
    timelineIds: normalizeStringList(item.timelineIds),
    triggerConditions: normalizeStringList(item.triggerConditions),
    coreRules: normalizeStringList(item.coreRules),
    consequences: normalizeStringList(item.consequences),
    examples: normalizeStringList(item.examples),
    relatedRuleCodes: normalizeStringList(item.relatedRuleCodes),
    constraints: item.constraints ?? "",
    exceptions: item.exceptions ?? "",
    status: item.status ?? "draft",
    version: item.version ?? "",
    validFrom: item.validFrom !== undefined ? String(item.validFrom) : "",
    validTo: item.validTo !== undefined ? String(item.validTo) : "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (state: WorldRuleFormState): WorldRulePayload => ({
    ruleCode: state.ruleCode || undefined,
    title: state.title,
    tldr: state.tldr || undefined,
    category: state.category || undefined,
    description: state.description || undefined,
    scope: state.scope.length > 0 ? state.scope : undefined,
    timelineIds: state.timelineIds.length > 0 ? state.timelineIds : undefined,
    triggerConditions:
      state.triggerConditions.length > 0 ? state.triggerConditions : undefined,
    coreRules: state.coreRules.length > 0 ? state.coreRules : undefined,
    consequences: state.consequences.length > 0 ? state.consequences : undefined,
    examples: state.examples.length > 0 ? state.examples : undefined,
    relatedRuleCodes:
      state.relatedRuleCodes.length > 0 ? state.relatedRuleCodes : undefined,
    constraints: state.constraints || undefined,
    exceptions: state.exceptions || undefined,
    status: state.status || undefined,
    version: state.version || undefined,
    validFrom: state.validFrom === "" ? undefined : Number(state.validFrom),
    validTo: state.validTo === "" ? undefined : Number(state.validTo),
    notes: state.notes || undefined,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateWorldRule(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createWorldRule(payload);
      notify(t("World rule created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
      void loadRelatedRuleCodeOptions();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: WorldRule) => {
    setEditItem(item);
    setEditValues(mapWorldRuleToForm(item));
    setShowForm(false);
  };

  const handleEditCancel = () => {
    setEditItem(null);
    setEditValues(null);
  };

  const handleEditSave = async () => {
    if (!editItem || !editValues) {
      return;
    }
    const payload = buildPayload(editValues);
    const validation = validateWorldRule(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateWorldRule(editItem.id, payload);
      notify(t("World rule updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
      void loadRelatedRuleCodeOptions();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: WorldRule) => {
    const confirmed = window.confirm(
      t("Delete this world rule? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteWorldRule(item.id);
      notify(t("World rule deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
      void loadRelatedRuleCodeOptions();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <CrudPageShell
        title="World rule nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new world rule"
        onToggleForm={() => setShowForm((prev) => !prev)}
        controls={
          <>
            <FilterPanel>
              <TextInput
                label="Search"
                value={filters.q}
                onChange={(value) => handleFilterChange("q", value)}
                placeholder="Search..."
              />
              <TextInput
                label="Title"
                value={filters.title}
                onChange={(value) => handleFilterChange("title", value)}
              />
              <TextInput
                label="Category"
                value={filters.category}
                onChange={(value) => handleFilterChange("category", value)}
              />
              <Select
                label="Status"
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
                options={STATUS_OPTIONS.map((status) => ({
                  value: status,
                  label: status,
                }))}
                placeholder="All"
              />
              <Select
                label="Scope"
                value={filters.scope}
                onChange={(value) => handleFilterChange("scope", value)}
                options={locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
                placeholder={locations.length > 0 ? "All" : "No locations yet."}
              />
              <TextInput
                label="Tag"
                value={filters.tag}
                onChange={(value) => handleFilterChange("tag", value)}
              />
              <div className="form-field filter-actions">
                <Button type="button" variant="ghost" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              </div>
            </FilterPanel>
            <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
          </>
        }
        list={
          showList ? (
            <>
              <WorldRuleList
                items={items}
                locationNameById={locationNameById}
                timelineNameById={timelineNameById}
                onEdit={handleEditOpen}
                onDelete={handleDelete}
              />
              {items.length > 0 || page > 1 || hasNext ? (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  itemCount={items.length}
                  hasNext={hasNext}
                  totalCount={totalCount}
                  onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
                  onPageSizeChange={(nextSize) => {
                    setPageSize(nextSize);
                    setPage(1);
                  }}
                />
              ) : null}
            </>
          ) : null
        }
      />

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit world rule")}</h3>
                <p className="header__subtitle">{editItem.title}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="World Rule" description="Core rule definition.">
            <div className="form-field--narrow">
              <TextInput
                label="Rule Code"
                value={editValues.ruleCode}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, ruleCode: value })
                }
                placeholder="WL-00"
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Title"
                value={editValues.title}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, title: value })
                }
                required
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="TLDR"
                value={editValues.tldr}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, tldr: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={editValues.status}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, status: value as WorldRuleStatus })
                }
                options={STATUS_OPTIONS.map((value) => ({ label: t(value), value }))}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Category"
                value={editValues.category}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, category: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Scope"
                value=""
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? { ...prev, scope: addSelection(prev.scope, value) }
                      : prev
                  )
                }
                options={locations
                  .filter((location) => !editValues.scope.includes(location.id))
                  .map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                placeholder={locations.length > 0 ? "Select" : "No locations yet."}
                disabled={locations.length === 0}
              />
              {editValues.scope.length > 0 ? (
                <div className="pill-list">
                  {editValues.scope.map((locationId) => (
                    <button
                      type="button"
                      className="pill"
                      key={locationId}
                      onClick={() =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                scope: removeSelection(prev.scope, locationId),
                              }
                            : prev
                        )
                      }
                    >
                      {(locationNameById[locationId] ?? locationId)} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
              />
            </div>
          </FormSection>

          <FormSection
            title="Rule Structure"
            description="Break complex rules into quick lookup blocks."
          >
            <div className="form-field--wide">
              <MultiSelect
                label="Trigger Conditions"
                values={editValues.triggerConditions}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, triggerConditions: value } : prev
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Core Rules"
                values={editValues.coreRules}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, coreRules: value } : prev
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Consequences"
                values={editValues.consequences}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, consequences: value } : prev
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Examples"
                values={editValues.examples}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, examples: value } : prev
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Related Rule Codes"
                value=""
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? {
                          ...prev,
                          relatedRuleCodes: addSelection(prev.relatedRuleCodes, value),
                        }
                      : prev
                  )
                }
                options={getAvailableRelatedRuleOptions(
                  editValues.relatedRuleCodes,
                  editValues.ruleCode
                )}
                placeholder={
                  relatedRuleCodeOptions.length > 0 ? "Select" : "No world rules yet."
                }
                disabled={relatedRuleCodeOptions.length === 0}
              />
              {editValues.relatedRuleCodes.length > 0 ? (
                <div className="pill-list">
                  {editValues.relatedRuleCodes.map((ruleCode) => (
                    <button
                      type="button"
                      className="pill"
                      key={ruleCode}
                      onClick={() =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                relatedRuleCodes: removeSelection(
                                  prev.relatedRuleCodes,
                                  ruleCode
                                ),
                              }
                            : prev
                        )
                      }
                    >
                      {ruleCode} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Constraints" description="Limits and exceptions.">
            <div className="form-field--wide">
              <TextArea
                label="Constraints"
                value={editValues.constraints}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, constraints: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Exceptions"
                value={editValues.exceptions}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, exceptions: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Validity window.">
            <div className="form-field--wide">
              <Select
                label="Timeline"
                value=""
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? {
                          ...prev,
                          timelineIds: addSelection(prev.timelineIds, value),
                        }
                      : prev
                  )
                }
                options={segments
                  .filter((segment) => !editValues.timelineIds.includes(segment.id))
                  .map((segment) => ({
                    value: segment.id,
                    label: segment.name,
                  }))}
                placeholder={segments.length > 0 ? "Select segment" : "No segments yet."}
                disabled={segments.length === 0}
              />
              {editValues.timelineIds.length > 0 ? (
                <div className="pill-list">
                  {editValues.timelineIds.map((timelineId) => (
                    <button
                      type="button"
                      className="pill"
                      key={timelineId}
                      onClick={() =>
                        setEditValues((prev) =>
                          prev
                            ? {
                                ...prev,
                                timelineIds: removeSelection(prev.timelineIds, timelineId),
                              }
                            : prev
                        )
                      }
                    >
                      {(timelineNameById[timelineId] ?? timelineId)} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid From"
                type="number"
                value={editValues.validFrom}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, validFrom: value })
                }
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid To"
                type="number"
                value={editValues.validTo}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, validTo: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Version"
                value={editValues.version}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, version: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the rule.">
            <div className="form-field--wide">
              <TextArea
                label="Notes"
                value={editValues.notes}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, notes: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Tags"
                values={editValues.tags}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, tags: value })
                }
              />
            </div>
          </FormSection>

          <div className="card">
            <Button onClick={handleEditSave} disabled={isSavingEdit}>
              {isSavingEdit ? t("Saving...") : t("Save changes")}
            </Button>
          </div>
        </>
      )}

      {showForm && (
        <>
          <FormSection title="World Rule" description="Core rule definition.">
            <div className="form-field--narrow">
              <TextInput
                label="Rule Code"
                value={values.ruleCode}
                onChange={(value) => setField("ruleCode", value)}
                placeholder="WL-00"
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Title"
                value={values.title}
                onChange={(value) => setField("title", value)}
                required
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="TLDR"
                value={values.tldr}
                onChange={(value) => setField("tldr", value)}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={values.status}
                onChange={(value) => setField("status", value as WorldRuleStatus)}
                options={STATUS_OPTIONS.map((value) => ({ label: t(value), value }))}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Category"
                value={values.category}
                onChange={(value) => setField("category", value)}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Scope"
                value=""
                onChange={(value) =>
                  setField("scope", addSelection(values.scope, value))
                }
                options={locations
                  .filter((location) => !values.scope.includes(location.id))
                  .map((location) => ({
                    value: location.id,
                    label: location.name,
                  }))}
                placeholder={locations.length > 0 ? "Select" : "No locations yet."}
                disabled={locations.length === 0}
              />
              {values.scope.length > 0 ? (
                <div className="pill-list">
                  {values.scope.map((locationId) => (
                    <button
                      type="button"
                      className="pill"
                      key={locationId}
                      onClick={() =>
                        setField("scope", removeSelection(values.scope, locationId))
                      }
                    >
                      {(locationNameById[locationId] ?? locationId)} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
            </div>
          </FormSection>

          <FormSection
            title="Rule Structure"
            description="Break complex rules into quick lookup blocks."
          >
            <div className="form-field--wide">
              <MultiSelect
                label="Trigger Conditions"
                values={values.triggerConditions}
                onChange={(value) => setField("triggerConditions", value)}
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Core Rules"
                values={values.coreRules}
                onChange={(value) => setField("coreRules", value)}
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Consequences"
                values={values.consequences}
                onChange={(value) => setField("consequences", value)}
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Examples"
                values={values.examples}
                onChange={(value) => setField("examples", value)}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Related Rule Codes"
                value=""
                onChange={(value) =>
                  setField(
                    "relatedRuleCodes",
                    addSelection(values.relatedRuleCodes, value)
                  )
                }
                options={getAvailableRelatedRuleOptions(
                  values.relatedRuleCodes,
                  values.ruleCode
                )}
                placeholder={
                  relatedRuleCodeOptions.length > 0 ? "Select" : "No world rules yet."
                }
                disabled={relatedRuleCodeOptions.length === 0}
              />
              {values.relatedRuleCodes.length > 0 ? (
                <div className="pill-list">
                  {values.relatedRuleCodes.map((ruleCode) => (
                    <button
                      type="button"
                      className="pill"
                      key={ruleCode}
                      onClick={() =>
                        setField(
                          "relatedRuleCodes",
                          removeSelection(values.relatedRuleCodes, ruleCode)
                        )
                      }
                    >
                      {ruleCode} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection title="Constraints" description="Limits and exceptions.">
            <div className="form-field--wide">
              <TextArea
                label="Constraints"
                value={values.constraints}
                onChange={(value) => setField("constraints", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Exceptions"
                value={values.exceptions}
                onChange={(value) => setField("exceptions", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Validity window.">
            <div className="form-field--wide">
              <Select
                label="Timeline"
                value=""
                onChange={(value) =>
                  setField("timelineIds", addSelection(values.timelineIds, value))
                }
                options={segments
                  .filter((segment) => !values.timelineIds.includes(segment.id))
                  .map((segment) => ({
                    value: segment.id,
                    label: segment.name,
                  }))}
                placeholder={segments.length > 0 ? "Select segment" : "No segments yet."}
                disabled={segments.length === 0}
              />
              {values.timelineIds.length > 0 ? (
                <div className="pill-list">
                  {values.timelineIds.map((timelineId) => (
                    <button
                      type="button"
                      className="pill"
                      key={timelineId}
                      onClick={() =>
                        setField(
                          "timelineIds",
                          removeSelection(values.timelineIds, timelineId)
                        )
                      }
                    >
                      {(timelineNameById[timelineId] ?? timelineId)} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid From"
                type="number"
                value={values.validFrom}
                onChange={(value) => setField("validFrom", value)}
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid To"
                type="number"
                value={values.validTo}
                onChange={(value) => setField("validTo", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Version"
                value={values.version}
                onChange={(value) => setField("version", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the rule.">
            <div className="form-field--wide">
              <TextArea
                label="Notes"
                value={values.notes}
                onChange={(value) => setField("notes", value)}
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Tags"
                values={values.tags}
                onChange={(value) => setField("tags", value)}
              />
            </div>
          </FormSection>

          <div className="card">
            <Button onClick={handleSubmit} variant="primary">
              {t("Create world rule")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
