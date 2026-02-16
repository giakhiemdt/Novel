import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { validateArc } from "./arc.schema";
import { ArcList } from "./ArcList";
import { ArcStructure } from "./ArcStructure";
import {
  createArc,
  deleteArc,
  getArcsPage,
  getArcStructure,
  updateArc,
} from "./arc.api";
import type { Arc, ArcPayload, ArcStructureArc } from "./arc.types";

const initialState = {
  name: "",
  order: "",
  summary: "",
  notes: "",
  tags: [] as string[],
};

type ArcFormState = typeof initialState;

export const ArcCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<ArcFormState>(initialState);
  const [items, setItems] = useState<Arc[]>([]);
  const [structure, setStructure] = useState<ArcStructureArc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Arc | null>(null);
  const [editValues, setEditValues] = useState<ArcFormState | null>(null);
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
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getArcsPage({
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
  }, [page, pageSize, filters, notify, getArcsPage]);

  const loadStructure = useCallback(async () => {
    try {
      const data = await getArcStructure();
      setStructure(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getArcStructure]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    void loadStructure();
  }, [loadStructure]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadStructure();
  });

  const handleFilterChange = (key: "q" | "name" | "tag", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", tag: "" });
  };

  const mapArcToForm = (item: Arc): ArcFormState => ({
    name: item.name ?? "",
    order: item.order !== undefined ? String(item.order) : "",
    summary: item.summary ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): ArcPayload => ({
    name: values.name,
    order: values.order === "" ? undefined : Number(values.order),
    summary: values.summary || undefined,
    notes: values.notes || undefined,
    tags: values.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateArc(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createArc(payload);
      notify(t("Arc created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
      await loadStructure();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Arc) => {
    setEditItem(item);
    setEditValues(mapArcToForm(item));
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
    setIsSavingEdit(true);
    try {
      await updateArc(editItem.id, {
        name: editValues.name,
        order: editValues.order === "" ? undefined : Number(editValues.order),
        summary: editValues.summary || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Arc updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
      await loadStructure();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Arc) => {
    const confirmed = window.confirm(
      t("Delete this arc? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteArc(item.id);
      notify(t("Arc deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
      await loadStructure();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <CrudPageShell
        title="Arc nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new arc"
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
              <ArcList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
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

      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Arc structure")}</h3>
            <p className="header__subtitle">
              {t("Arc, chapter, and scene hierarchy.")}
            </p>
          </div>
        </div>
        <ArcStructure items={structure} />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit arc")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Arc Identity" description="Core arc details.">
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
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Order"
                type="number"
                value={editValues.order}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, order: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Summary"
                value={editValues.summary}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, summary: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the arc.">
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
          <FormSection title="Arc Identity" description="Core arc details.">
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Order"
                type="number"
                value={values.order}
                onChange={(value) => setField("order", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Summary"
                value={values.summary}
                onChange={(value) => setField("summary", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the arc.">
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
              {t("Create arc")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
