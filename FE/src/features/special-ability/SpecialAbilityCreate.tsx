import { useCallback, useEffect, useState } from "react";
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
import {
  createSpecialAbility,
  deleteSpecialAbility,
  getSpecialAbilitiesPage,
  updateSpecialAbility,
} from "./special-ability.api";
import { SpecialAbilityList } from "./SpecialAbilityList";
import { validateSpecialAbility } from "./special-ability.schema";
import type {
  SpecialAbility,
  SpecialAbilityPayload,
  SpecialAbilityType,
} from "./special-ability.types";

const initialState = {
  name: "",
  type: "" as SpecialAbilityType | "",
  description: "",
  notes: "",
  tags: [] as string[],
};

type SpecialAbilityFormState = typeof initialState;
const normalizeAbilityType = (value: string): SpecialAbilityType | "" =>
  value === "innate" || value === "acquired" ? value : "";

export const SpecialAbilityCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<SpecialAbilityFormState>(initialState);
  const [items, setItems] = useState<SpecialAbility[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SpecialAbility | null>(null);
  const [editValues, setEditValues] = useState<SpecialAbilityFormState | null>(null);
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
    type: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getSpecialAbilitiesPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = response?.data ?? [];
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
  }, [page, pageSize, filters, notify, getSpecialAbilitiesPage]);

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
    key: "q" | "name" | "tag" | "type",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", tag: "", type: "" });
  };

  const mapAbilityToForm = (item: SpecialAbility): SpecialAbilityFormState => ({
    name: item.name ?? "",
    type: item.type ?? "",
    description: item.description ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (state: SpecialAbilityFormState): SpecialAbilityPayload => ({
    name: state.name,
    type: state.type || undefined,
    description: state.description || undefined,
    notes: state.notes || undefined,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateSpecialAbility(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createSpecialAbility(payload);
      notify(t("Special ability created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: SpecialAbility) => {
    setEditItem(item);
    setEditValues(mapAbilityToForm(item));
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
    const validation = validateSpecialAbility(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateSpecialAbility(editItem.id, payload);
      notify(t("Special ability updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: SpecialAbility) => {
    const confirmed = window.confirm(
      t("Delete this special ability? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteSpecialAbility(item.id);
      notify(t("Special ability deleted."), "success");
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
        title="Special ability nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new special ability"
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
              <Select
                label="Type"
                value={filters.type}
                onChange={(value) => handleFilterChange("type", value)}
                options={[
                  { value: "innate", label: "innate" },
                  { value: "acquired", label: "acquired" },
                ]}
                placeholder="All"
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
              <SpecialAbilityList
                items={items}
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
                <h3 className="section-title">{t("Edit special ability")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Special Ability Profile"
            description="Innate or acquired special traits."
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
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, type: normalizeAbilityType(value) } : prev
                  )
                }
                options={[
                  { value: "innate", label: t("Innate") },
                  { value: "acquired", label: t("Acquired") },
                ]}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
                placeholder={t("Short description")}
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

          <div className="card">
            <Button onClick={handleEditSave} disabled={isSavingEdit}>
              {isSavingEdit ? t("Saving...") : t("Save changes")}
            </Button>
          </div>
        </>
      )}

      {showForm && (
        <>
          <FormSection
            title="Special Ability Profile"
            description="Innate or acquired special traits."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={values.type}
                onChange={(value) => setField("type", normalizeAbilityType(value))}
                options={[
                  { value: "innate", label: t("Innate") },
                  { value: "acquired", label: t("Acquired") },
                ]}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
                placeholder={t("Short description")}
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

          <div className="card">
            <Button onClick={handleSubmit} variant="primary">
              {t("Create special ability")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
