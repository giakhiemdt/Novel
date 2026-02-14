import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getAllArcs } from "../arc/arc.api";
import type { Arc } from "../arc/arc.types";
import { ChapterList } from "./ChapterList";
import {
  createChapter,
  deleteChapter,
  getChaptersPage,
  updateChapter,
} from "./chapter.api";
import { validateChapter } from "./chapter.schema";
import type { Chapter, ChapterPayload } from "./chapter.types";

const initialState = {
  name: "",
  order: "",
  summary: "",
  notes: "",
  tags: [] as string[],
  arcId: "",
};

type ChapterFormState = typeof initialState;

export const ChapterCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<ChapterFormState>(initialState);
  const [items, setItems] = useState<Chapter[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Chapter | null>(null);
  const [editValues, setEditValues] = useState<ChapterFormState | null>(null);
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
    arcId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const arcsById = useMemo(
    () =>
      arcs.reduce<Record<string, string>>((acc, arc) => {
        acc[arc.id] = arc.name;
        return acc;
      }, {}),
    [arcs]
  );

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getChaptersPage({
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
  }, [page, pageSize, filters, notify, getChaptersPage]);

  const loadArcs = useCallback(async () => {
    try {
      const data = await getAllArcs();
      setArcs(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllArcs]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    void loadArcs();
  }, [loadArcs]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadArcs();
  });

  const handleFilterChange = (
    key: "q" | "name" | "tag" | "arcId",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", tag: "", arcId: "" });
  };

  const mapChapterToForm = (item: Chapter): ChapterFormState => ({
    name: item.name ?? "",
    order: item.order !== undefined ? String(item.order) : "",
    summary: item.summary ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
    arcId: item.arcId ?? "",
  });

  const buildPayload = (): ChapterPayload => ({
    name: values.name,
    order: values.order === "" ? undefined : Number(values.order),
    summary: values.summary || undefined,
    notes: values.notes || undefined,
    tags: values.tags,
    arcId: values.arcId || undefined,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateChapter(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createChapter(payload);
      notify(t("Chapter created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Chapter) => {
    setEditItem(item);
    setEditValues(mapChapterToForm(item));
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
      await updateChapter(editItem.id, {
        name: editValues.name,
        order: editValues.order === "" ? undefined : Number(editValues.order),
        summary: editValues.summary || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
        arcId: editValues.arcId || undefined,
      });
      notify(t("Chapter updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Chapter) => {
    const confirmed = window.confirm(
      t("Delete this chapter? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteChapter(item.id);
      notify(t("Chapter deleted."), "success");
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
            <h3 className="section-title">{t("Chapter nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new chapter")}
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
            label="Tag"
            value={filters.tag}
            onChange={(value) => handleFilterChange("tag", value)}
          />
          <Select
            label="Arc"
            value={filters.arcId}
            onChange={(value) => handleFilterChange("arcId", value)}
            options={arcs.map((arc) => ({ value: arc.id, label: arc.name }))}
            placeholder="All"
          />
          <div className="form-field filter-actions">
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        </FilterPanel>
        <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
        {showList && (
          <>
        <ChapterList
          items={items}
          arcsById={arcsById}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
        />
        {(items.length > 0 || page > 1 || hasNext) && (
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
        )}
          </>
        )}
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit chapter")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Chapter Identity" description="Core chapter details.">
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
              <Select
                label="Arc"
                value={editValues.arcId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, arcId: value })
                }
                options={arcs.map((arc) => ({ label: arc.name, value: arc.id }))}
                placeholder={arcs.length ? t("Select") : t("No arcs yet.")}
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

          <FormSection title="Notes & Tags" description="Extra context for the chapter.">
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
          <FormSection title="Chapter Identity" description="Core chapter details.">
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
              <Select
                label="Arc"
                value={values.arcId}
                onChange={(value) => setField("arcId", value)}
                options={arcs.map((arc) => ({ label: arc.name, value: arc.id }))}
                placeholder={arcs.length ? t("Select") : t("No arcs yet.")}
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

          <FormSection title="Notes & Tags" description="Extra context for the chapter.">
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
              {t("Create chapter")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
