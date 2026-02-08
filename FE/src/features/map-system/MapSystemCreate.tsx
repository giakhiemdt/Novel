import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createMapSystem,
  deleteMapSystem,
  getMapSystemsPage,
  updateMapSystem,
} from "./map-system.api";
import { MapSeedPreview } from "./MapSeedPreview";
import { MapSystemList } from "./MapSystemList";
import { validateMapSystem } from "./map-system.schema";
import type { MapSystem, MapSystemPayload } from "./map-system.types";

const initialState = {
  name: "",
  code: "",
  description: "",
  scope: "world",
  seed: "",
  width: "2048",
  height: "1024",
  seaLevel: "0.56",
  climatePreset: "temperate",
  notes: "",
  tags: [] as string[],
};

type MapSystemFormState = typeof initialState;

const toNumber = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const mapToForm = (item: MapSystem): MapSystemFormState => ({
  name: item.name ?? "",
  code: item.code ?? "",
  description: item.description ?? "",
  scope: item.scope ?? "world",
  seed: item.seed ?? "",
  width:
    item.width === undefined || item.width === null ? "2048" : String(item.width),
  height:
    item.height === undefined || item.height === null ? "1024" : String(item.height),
  seaLevel:
    item.seaLevel === undefined || item.seaLevel === null
      ? "0.56"
      : String(item.seaLevel),
  climatePreset: item.climatePreset ?? "temperate",
  notes: item.notes ?? "",
  tags: item.tags ?? [],
});

const buildPayload = (state: MapSystemFormState): MapSystemPayload => {
  const width = toNumber(state.width);
  const height = toNumber(state.height);
  const seaLevel = toNumber(state.seaLevel);

  const config = JSON.stringify({
    generator: "seed-layered-v2",
    seed: state.seed || undefined,
    width,
    height,
    seaLevel,
    climatePreset: state.climatePreset || undefined,
  });

  return {
    name: state.name,
    code: state.code || undefined,
    description: state.description || undefined,
    scope: state.scope || undefined,
    seed: state.seed || undefined,
    width,
    height,
    seaLevel,
    climatePreset: state.climatePreset || undefined,
    config,
    notes: state.notes || undefined,
    tags: state.tags,
  };
};

export const MapSystemCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<MapSystemFormState>(initialState);
  const [items, setItems] = useState<MapSystem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MapSystem | null>(null);
  const [editValues, setEditValues] = useState<MapSystemFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    code: "",
    scope: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const scopeOptions = useMemo(
    () => [
      { value: "world", label: t("World") },
      { value: "region", label: t("Region") },
      { value: "local", label: t("Local") },
    ],
    [t]
  );

  const climateOptions = useMemo(
    () => [
      { value: "temperate", label: t("Temperate") },
      { value: "arid", label: t("Arid") },
      { value: "cold", label: t("Cold") },
    ],
    [t]
  );

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getMapSystemsPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = response?.data ?? [];
      const total =
        typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage =
        total !== undefined
          ? offset + Math.min(data.length, pageSize) < total
          : data.length > pageSize;
      const trimmed = nextPage ? data.slice(0, pageSize) : data;
      setTotalCount(total);
      if (trimmed.length === 0 && page > 1) {
        setHasNext(false);
        setItems([]);
        setPage((prev) => Math.max(1, prev - 1));
        return;
      }
      setItems(trimmed);
      setHasNext(nextPage);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [page, pageSize, filters, notify]);

  useEffect(() => {
    void loadItems();
  }, [loadItems, refreshKey]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
  });

  const handleFilterChange = (
    key: "q" | "name" | "code" | "scope",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", code: "", scope: "" });
  };

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateMapSystem(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createMapSystem(payload);
      notify(t("Map system created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: MapSystem) => {
    setEditItem(item);
    setEditValues(mapToForm(item));
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
    const validation = validateMapSystem(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateMapSystem(editItem.id, payload);
      notify(t("Map system updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: MapSystem) => {
    const confirmed = window.confirm(
      t("Delete this map system? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteMapSystem(item.id);
      notify(t("Map system deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Map system nodes")}</h3>
            <p className="header__subtitle">{t("Click a row to inspect details.")}</p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new map system")}
          </Button>
        </div>

        <FilterPanel>
          <TextInput
            label="Search"
            value={filters.q}
            onChange={(value) => handleFilterChange("q", value)}
            placeholder="Search..."
          />
          <TextInput
            label="Name"
            value={filters.name}
            onChange={(value) => handleFilterChange("name", value)}
          />
          <TextInput
            label="Code"
            value={filters.code}
            onChange={(value) => handleFilterChange("code", value)}
          />
          <Select
            label="Scope"
            value={filters.scope}
            onChange={(value) => handleFilterChange("scope", value)}
            options={scopeOptions}
            placeholder="All"
          />
          <div className="form-field filter-actions">
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        </FilterPanel>

        {showForm && (
          <div className="card card--subtle">
            <FormSection
              title={t("Create new map system")}
              description={t("Core identity, generator seed, and environment profile.")}
            >
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
              <TextInput
                label="Code"
                value={values.code}
                onChange={(value) => setField("code", value)}
              />
              <Select
                label="Scope"
                value={values.scope}
                onChange={(value) => setField("scope", value)}
                options={scopeOptions}
              />
              <TextInput
                label="Seed"
                value={values.seed}
                onChange={(value) => setField("seed", value)}
                placeholder="world-seed-001"
              />
              <TextInput
                label="Width"
                value={values.width}
                onChange={(value) => setField("width", value)}
                placeholder="2048"
              />
              <TextInput
                label="Height"
                value={values.height}
                onChange={(value) => setField("height", value)}
                placeholder="1024"
              />
              <TextInput
                label="Sea Level"
                value={values.seaLevel}
                onChange={(value) => setField("seaLevel", value)}
                placeholder="0.56"
              />
              <Select
                label="Climate preset"
                value={values.climatePreset}
                onChange={(value) => setField("climatePreset", value)}
                options={climateOptions}
              />
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
              <TextArea
                label="Notes"
                value={values.notes}
                onChange={(value) => setField("notes", value)}
              />
              <MultiSelect
                label="Tags"
                values={values.tags}
                onChange={(next) => setField("tags", next)}
                placeholder="legendary, old-world..."
              />
            </FormSection>
            <MapSeedPreview
              title={t("Map preview")}
              seed={values.seed}
              width={toNumber(values.width) ?? 2048}
              height={toNumber(values.height) ?? 1024}
              seaLevel={toNumber(values.seaLevel) ?? 0.56}
              climatePreset={values.climatePreset}
            />
            <div className="form-actions">
              <Button onClick={handleSubmit}>{t("Create map system")}</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  setShowForm(false);
                }}
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        )}

        {editItem && editValues && (
          <div className="card card--subtle">
            <FormSection
              title={t("Map system details")}
              description={t("Edit map identity and generator parameters.")}
            >
              <TextInput
                label="Name"
                value={editValues.name}
                onChange={(value) => setEditValues((prev) => prev && { ...prev, name: value })}
                required
              />
              <TextInput
                label="Code"
                value={editValues.code}
                onChange={(value) => setEditValues((prev) => prev && { ...prev, code: value })}
              />
              <Select
                label="Scope"
                value={editValues.scope}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, scope: value })
                }
                options={scopeOptions}
              />
              <TextInput
                label="Seed"
                value={editValues.seed}
                onChange={(value) => setEditValues((prev) => prev && { ...prev, seed: value })}
              />
              <TextInput
                label="Width"
                value={editValues.width}
                onChange={(value) => setEditValues((prev) => prev && { ...prev, width: value })}
              />
              <TextInput
                label="Height"
                value={editValues.height}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, height: value })
                }
              />
              <TextInput
                label="Sea Level"
                value={editValues.seaLevel}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, seaLevel: value })
                }
              />
              <Select
                label="Climate preset"
                value={editValues.climatePreset}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, climatePreset: value })
                }
                options={climateOptions}
              />
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
              />
              <TextArea
                label="Notes"
                value={editValues.notes}
                onChange={(value) => setEditValues((prev) => prev && { ...prev, notes: value })}
              />
              <MultiSelect
                label="Tags"
                values={editValues.tags}
                onChange={(next) => setEditValues((prev) => prev && { ...prev, tags: next })}
                placeholder="legendary, old-world..."
              />
            </FormSection>
            <MapSeedPreview
              title={t("Map preview")}
              seed={editValues.seed}
              width={toNumber(editValues.width) ?? 2048}
              height={toNumber(editValues.height) ?? 1024}
              seaLevel={toNumber(editValues.seaLevel) ?? 0.56}
              climatePreset={editValues.climatePreset}
            />
            <div className="form-actions">
              <Button onClick={handleEditSave} disabled={isSavingEdit}>
                {isSavingEdit ? t("Saving...") : t("Save")}
              </Button>
              <Button type="button" variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        )}

        <MapSystemList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
        {(items.length > 0 || page > 1 || hasNext) && (
          <Pagination
            page={page}
            pageSize={pageSize}
            itemCount={items.length}
            hasNext={hasNext}
            totalCount={totalCount}
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
};
