import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import {
  createTimeline,
  deleteTimeline,
  getTimelinesPage,
  linkTimeline,
  relinkTimeline,
  unlinkTimeline,
} from "./timeline.api";
import { getAllEvents } from "../event/event.api";
import type { Event } from "../event/event.types";
import { TimelineBoard } from "./TimelineBoard";
import { TimelineList } from "./TimelineList";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TraitEditor } from "../../components/form/TraitEditor";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { validateTimeline } from "./timeline.schema";
import type { Timeline, TimelinePayload } from "./timeline.types";
import { useI18n } from "../../i18n/I18nProvider";
import boardIcon from "../../assets/icons/board.svg";
import {
  createEmptyTraitDraft,
  normalizeTraitArray,
  toTraitPayload,
} from "../../utils/trait";

const initialState = {
  name: "",
  code: "",
  durationYears: "",
  isOngoing: false,
  summary: "",
  description: "",
  characteristics: [createEmptyTraitDraft()],
  dominantForces: [] as string[],
  technologyLevel: "",
  powerEnvironment: "",
  worldState: "",
  majorChanges: [] as string[],
  notes: "",
  tags: [] as string[],
  previousId: "",
  nextId: "",
};

type TimelineFormState = typeof initialState;

export const TimelineCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<TimelineFormState>(initialState);
  const [items, setItems] = useState<Timeline[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Timeline | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    code: "",
    isOngoing: undefined as boolean | undefined,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();
  const [links, setLinks] = useState<Record<string, { previousId?: string }>>({});
  const pendingSelectId = useRef<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const eventData = await getAllEvents();
      setEvents(eventData ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify, getAllEvents]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await getTimelinesPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const timelines = (response?.data ?? []).map((item) => ({
        ...item,
        characteristics: normalizeTraitArray(item.characteristics),
      }));
      const total = typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage =
        total !== undefined
          ? offset + Math.min(timelines.length, pageSize) < total
          : timelines.length > pageSize;
      const trimmed = nextPage ? timelines.slice(0, pageSize) : timelines;
      setTotalCount(total);
      if (trimmed.length === 0 && page > 1) {
        setHasNext(false);
        setItems([]);
        setSelected(null);
        setPage((prev) => Math.max(1, prev - 1));
        return;
      }
      setItems(trimmed);
      setHasNext(nextPage);
      if (!trimmed || trimmed.length === 0) {
        setSelected(null);
        return;
      }
      setLinks((prev) => {
        const next: Record<string, { previousId?: string }> = {};
        trimmed.forEach((item) => {
          if (item.previousId) {
            next[item.id] = { previousId: item.previousId };
          } else if (prev[item.id]) {
            next[item.id] = prev[item.id];
          }
        });
        return next;
      });
      const selectId = pendingSelectId.current;
      if (selectId) {
        const match = trimmed.find((item) => item.id === selectId);
        setSelected(match ?? trimmed[0]);
        pendingSelectId.current = null;
        return;
      }
      setSelected((prev) => {
        if (!prev) {
          return trimmed[0];
        }
        return trimmed.find((item) => item.id === prev.id) ?? trimmed[0];
      });
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, notify, getTimelinesPage]);

  useEffect(() => {
    if (!showList && !showBoard) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showBoard, showList]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    pendingSelectId.current = null;
    void loadEvents();
  });

  const handleFilterChange = (
    key: "q" | "name" | "tag" | "code",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleBooleanFilterChange = (value: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      isOngoing: value === "" ? undefined : value === "true",
    }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      name: "",
      tag: "",
      code: "",
      isOngoing: undefined,
    });
  };

  const buildPayload = (): TimelinePayload => ({
    name: values.name,
    code: values.code || undefined,
    durationYears:
      values.durationYears === "" ? Number.NaN : Number(values.durationYears),
    isOngoing: values.isOngoing,
    summary: values.summary || undefined,
    description: values.description || undefined,
    characteristics: toTraitPayload(values.characteristics),
    dominantForces: values.dominantForces,
    technologyLevel: values.technologyLevel || undefined,
    powerEnvironment: values.powerEnvironment || undefined,
    worldState: values.worldState || undefined,
    majorChanges: values.majorChanges,
    notes: values.notes || undefined,
    tags: values.tags,
    previousId: values.previousId || undefined,
    nextId: values.nextId || undefined,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateTimeline(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const created = await createTimeline(payload);
      notify(t("Timeline created successfully."), "success");
      reset();
      setIsFormOpen(false);
      pendingSelectId.current = created.id;
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardLink = async (currentId: string, previousId: string) => {
    try {
      const response = await linkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: { previousId } }));
      notify(`Linked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardUnlink = async (currentId: string, previousId: string) => {
    try {
      const response = await unlinkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: {} }));
      notify(`Unlinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardRelink = async (currentId: string, previousId: string) => {
    try {
      const response = await relinkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: { previousId } }));
      notify(`Relinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleDelete = async (item: Timeline) => {
    const confirmed = window.confirm(
      t("Delete this timeline? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteTimeline(item.id);
      notify(t("Timeline deleted."), "success");
      setSelected(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div className="timeline-page">
      <CrudPageShell
        title="Timeline nodes"
        subtitle="Click a row to inspect details."
        showForm={isFormOpen}
        createLabel="Create new timeline"
        onToggleForm={() => setIsFormOpen((prev) => !prev)}
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
                label="Code"
                value={filters.code}
                onChange={(value) => handleFilterChange("code", value)}
              />
              <Select
                label="Ongoing"
                value={filters.isOngoing === undefined ? "" : String(filters.isOngoing)}
                onChange={(value) => handleBooleanFilterChange(value)}
                options={[
                  { value: "true", label: "Yes" },
                  { value: "false", label: "No" },
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
              <TimelineList
                items={items}
                selectedId={selected?.id}
                onSelect={setSelected}
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
      <div className="filter-block">
        <button
          type="button"
          className="filter-toggle"
          onClick={() => setShowBoard((prev) => !prev)}
          aria-expanded={showBoard}
        >
          <img className="filter-toggle__icon" src={boardIcon} alt={t("Board")} />
          <span className="filter-toggle__label">
            {showBoard ? t("Hide board") : t("Show board")}
          </span>
        </button>
        {showBoard && <p className="header__subtitle">{t("Board")}</p>}
      </div>
      {showBoard && (
        <>
          <TimelineBoard
            items={items}
            events={events}
            selectedId={selected?.id}
            onSelect={setSelected}
            links={links}
            onLink={handleBoardLink}
            onUnlink={handleBoardUnlink}
            onRelink={handleBoardRelink}
            onDelete={handleDelete}
          />
          {items.length === 0 && (
            <p className="timeline-empty">{t("No timelines yet.")}</p>
          )}
        </>
      )}

      {isFormOpen && (
        <div className="timeline-modal__backdrop" onClick={() => setIsFormOpen(false)}>
          <div
            className="timeline-modal timeline-modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="timeline-modal__header">
              <div>
                <h3>{t("Create timeline")}</h3>
                <p className="header__subtitle">
                  {t("Define the era and its scope.")}
                </p>
              </div>
              <button
                className="timeline-modal__close"
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="timeline-modal__body">
              <FormSection title="Timeline Setup">
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
                <TextInput
                  label="Duration (Years)"
                  type="number"
                  value={values.durationYears}
                  onChange={(value) => setField("durationYears", value)}
                  required
                />
                <label className="toggle">
                  <span>{t("Ongoing era")}</span>
                  <input
                    type="checkbox"
                    checked={values.isOngoing}
                    onChange={(event) =>
                      setField("isOngoing", event.target.checked)
                    }
                  />
                  <span className="toggle__track" aria-hidden="true">
                    <span className="toggle__thumb" />
                  </span>
                </label>
                <TextInput
                  label="Technology Level"
                  value={values.technologyLevel}
                  onChange={(value) => setField("technologyLevel", value)}
                />
                <TextInput
                  label="Power Environment"
                  value={values.powerEnvironment}
                  onChange={(value) => setField("powerEnvironment", value)}
                />
                <TextInput
                  label="World State"
                  value={values.worldState}
                  onChange={(value) => setField("worldState", value)}
                />
                <TraitEditor
                  label="Characteristics"
                  values={values.characteristics}
                  onChange={(value) => setField("characteristics", value)}
                />
                <MultiSelect
                  label="Dominant Forces"
                  values={values.dominantForces}
                  onChange={(value) => setField("dominantForces", value)}
                />
                <MultiSelect
                  label="Major Changes"
                  values={values.majorChanges}
                  onChange={(value) => setField("majorChanges", value)}
                />
              </FormSection>

              <FormSection title="Narrative">
                <TextArea
                  label="Summary"
                  value={values.summary}
                  onChange={(value) => setField("summary", value)}
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
                  onChange={(value) => setField("tags", value)}
                />
              </FormSection>

              <FormSection title="Linking">
                <TextInput
                  label="Previous Timeline ID"
                  value={values.previousId}
                  onChange={(value) => setField("previousId", value)}
                />
                <TextInput
                  label="Next Timeline ID"
                  value={values.nextId}
                  onChange={(value) => setField("nextId", value)}
                />
              </FormSection>

            </div>

            <div className="timeline-modal__footer">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? t("Saving...") : t("Create timeline")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
