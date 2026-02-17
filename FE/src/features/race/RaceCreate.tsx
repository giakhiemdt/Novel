import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TraitEditor } from "../../components/form/TraitEditor";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { createRace, deleteRace, getRacesPage, updateRace } from "./race.api";
import { RaceList } from "./RaceList";
import { validateRace } from "./race.schema";
import type { Race, RacePayload } from "./race.types";
import { createEmptyTraitDraft, normalizeTraitArray, toTraitDrafts, toTraitPayload } from "../../utils/trait";

const initialState = {
  name: "",
  alias: [] as string[],
  description: "",
  origin: "",
  traits: [createEmptyTraitDraft()],
  culture: "",
  lifespan: "",
  notes: "",
  tags: [] as string[],
};

type RaceFormState = typeof initialState;

export const RaceCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<RaceFormState>(initialState);
  const [items, setItems] = useState<Race[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Race | null>(null);
  const [editValues, setEditValues] = useState<RaceFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    origin: "",
    culture: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getRacesPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = (response?.data ?? []).map((item) => ({
        ...item,
        traits: normalizeTraitArray(item.traits),
      }));
      const total = typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage = total !== undefined ? offset + Math.min(data.length, pageSize) < total : data.length > pageSize;
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
  }, [page, pageSize, filters, notify, getRacesPage]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
  });

  const handleFilterChange = (
    key: "q" | "name" | "tag" | "origin" | "culture",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", tag: "", origin: "", culture: "" });
  };

  const mapRaceToForm = (item: Race): RaceFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    description: item.description ?? "",
    origin: item.origin ?? "",
    traits: toTraitDrafts(item.traits),
    culture: item.culture ?? "",
    lifespan: item.lifespan ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (state: RaceFormState): RacePayload => ({
    name: state.name,
    alias: state.alias,
    description: state.description || undefined,
    origin: state.origin || undefined,
    traits: toTraitPayload(state.traits),
    culture: state.culture || undefined,
    lifespan: state.lifespan || undefined,
    notes: state.notes || undefined,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateRace(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createRace(payload);
      notify(t("Race created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Race) => {
    setEditItem(item);
    setEditValues(mapRaceToForm(item));
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
    const validation = validateRace(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateRace(editItem.id, payload);
      notify(t("Race updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Race) => {
    const confirmed = window.confirm(
      t("Delete this race? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteRace(item.id);
      notify(t("Race deleted."), "success");
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
      <CrudPageShell
        title="Race nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new race"
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
                label="Name"
                value={filters.name}
                onChange={(value) => handleFilterChange("name", value)}
              />
              <TextInput
                label="Tag"
                value={filters.tag}
                onChange={(value) => handleFilterChange("tag", value)}
              />
              <TextInput
                label="Origin"
                value={filters.origin}
                onChange={(value) => handleFilterChange("origin", value)}
              />
              <TextInput
                label="Culture"
                value={filters.culture}
                onChange={(value) => handleFilterChange("culture", value)}
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
              <RaceList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
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
                <h3 className="section-title">{t("Edit race")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Race Identity"
            description="Core identity, origin, and lifespan."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={editValues.name}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, name: value })
                }
                required
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Alias"
                values={editValues.alias}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, alias: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Origin"
                value={editValues.origin}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, origin: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Culture"
                value={editValues.culture}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, culture: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Lifespan"
                value={editValues.lifespan}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, lifespan: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
                placeholder="Short summary or defining traits"
              />
            </div>
            <div className="form-field--wide">
              <TraitEditor
                label="Traits"
                values={editValues.traits}
                onChange={(traits) =>
                  setEditValues((prev) => prev && { ...prev, traits })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra details and tags.">
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

          <div className="action-row">
            <Button variant="ghost" onClick={handleEditCancel}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={isSavingEdit}>
              {isSavingEdit ? t("Saving...") : t("Save changes")}
            </Button>
          </div>
        </>
      )}

      {showForm && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Create race")}</h3>
                <p className="header__subtitle">
                  {t("Add a new race entry for characters.")}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Race Identity"
            description="Core identity, origin, and lifespan."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Alias"
                values={values.alias}
                onChange={(value) => setField("alias", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Origin"
                value={values.origin}
                onChange={(value) => setField("origin", value)}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Culture"
                value={values.culture}
                onChange={(value) => setField("culture", value)}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Lifespan"
                value={values.lifespan}
                onChange={(value) => setField("lifespan", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
                placeholder="Short summary or defining traits"
              />
            </div>
            <div className="form-field--wide">
              <TraitEditor
                label="Traits"
                values={values.traits}
                onChange={(traits) => setField("traits", traits)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra details and tags.">
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

          <div className="action-row">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("Create race")}</Button>
          </div>
        </>
      )}
    </div>
  );
};
