import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getAllCharacters } from "../character/character.api";
import type { Character } from "../character/character.types";
import { getAllChapters } from "../chapter/chapter.api";
import type { Chapter } from "../chapter/chapter.types";
import { getAllEvents } from "../event/event.api";
import type { Event } from "../event/event.types";
import { getAllLocations } from "../location/location.api";
import type { Location } from "../location/location.types";
import { SceneList } from "./SceneList";
import { createScene, deleteScene, getScenesPage, updateScene } from "./scene.api";
import { validateScene } from "./scene.schema";
import type { Scene, ScenePayload } from "./scene.types";

const initialState = {
  name: "",
  order: "",
  summary: "",
  content: "",
  notes: "",
  tags: [] as string[],
  chapterId: "",
  eventId: "",
  locationId: "",
  characterIds: [] as string[],
};

type SceneFormState = typeof initialState;

export const SceneCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<SceneFormState>(initialState);
  const [items, setItems] = useState<Scene[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Scene | null>(null);
  const [editValues, setEditValues] = useState<SceneFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [characterId, setCharacterId] = useState("");
  const [editCharacterId, setEditCharacterId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    chapterId: "",
    eventId: "",
    locationId: "",
    characterId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const chaptersById = useMemo(
    () =>
      chapters.reduce<Record<string, string>>((acc, chapter) => {
        acc[chapter.id] = chapter.name;
        return acc;
      }, {}),
    [chapters]
  );

  const eventsById = useMemo(
    () =>
      events.reduce<Record<string, string>>((acc, event) => {
        acc[event.id] = event.name;
        return acc;
      }, {}),
    [events]
  );

  const locationsById = useMemo(
    () =>
      locations.reduce<Record<string, string>>((acc, location) => {
        acc[location.id] = location.name;
        return acc;
      }, {}),
    [locations]
  );

  const charactersById = useMemo(
    () =>
      characters.reduce<Record<string, string>>((acc, character) => {
        acc[character.id] = character.name;
        return acc;
      }, {}),
    [characters]
  );

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getScenesPage({
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
  }, [page, pageSize, filters, notify, getScenesPage]);

  const loadChapters = useCallback(async () => {
    try {
      const data = await getAllChapters();
      setChapters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllChapters]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await getAllEvents();
      setEvents(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllEvents]);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getAllLocations();
      setLocations(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllLocations]);

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setCharacters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllCharacters]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    void loadChapters();
    void loadEvents();
    void loadLocations();
    void loadCharacters();
  }, [loadChapters, loadEvents, loadLocations, loadCharacters]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadChapters();
    void loadEvents();
    void loadLocations();
    void loadCharacters();
  });

  const handleFilterChange = (
    key:
      | "q"
      | "name"
      | "tag"
      | "chapterId"
      | "eventId"
      | "locationId"
      | "characterId",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      name: "",
      tag: "",
      chapterId: "",
      eventId: "",
      locationId: "",
      characterId: "",
    });
  };

  const mapSceneToForm = (item: Scene): SceneFormState => ({
    name: item.name ?? "",
    order: item.order !== undefined ? String(item.order) : "",
    summary: item.summary ?? "",
    content: item.content ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
    chapterId: item.chapterId ?? "",
    eventId: item.eventId ?? "",
    locationId: item.locationId ?? "",
    characterIds: item.characterIds ?? [],
  });

  const buildPayload = (): ScenePayload => ({
    name: values.name,
    order: values.order === "" ? undefined : Number(values.order),
    summary: values.summary || undefined,
    content: values.content || undefined,
    notes: values.notes || undefined,
    tags: values.tags,
    chapterId: values.chapterId || undefined,
    eventId: values.eventId || undefined,
    locationId: values.locationId || undefined,
    characterIds: values.characterIds,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateScene(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createScene(payload);
      notify(t("Scene created successfully."), "success");
      reset();
      setShowForm(false);
      setCharacterId("");
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Scene) => {
    setEditItem(item);
    setEditValues(mapSceneToForm(item));
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
      await updateScene(editItem.id, {
        name: editValues.name,
        order: editValues.order === "" ? undefined : Number(editValues.order),
        summary: editValues.summary || undefined,
        content: editValues.content || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
        chapterId: editValues.chapterId || undefined,
        eventId: editValues.eventId || undefined,
        locationId: editValues.locationId || undefined,
        characterIds: editValues.characterIds,
      });
      notify(t("Scene updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Scene) => {
    const confirmed = window.confirm(
      t("Delete this scene? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteScene(item.id);
      notify(t("Scene deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleAddCharacter = () => {
    if (!characterId) {
      return;
    }
    if (values.characterIds.includes(characterId)) {
      return;
    }
    setField("characterIds", [...values.characterIds, characterId]);
    setCharacterId("");
  };

  const handleAddEditCharacter = () => {
    if (!editValues || !editCharacterId) {
      return;
    }
    if (editValues.characterIds.includes(editCharacterId)) {
      return;
    }
    setEditValues((prev) =>
      prev
        ? { ...prev, characterIds: [...prev.characterIds, editCharacterId] }
        : prev
    );
    setEditCharacterId("");
  };

  return (
    <div>
      <CrudPageShell
        title="Scene nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new scene"
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
                label="Chapter"
                value={filters.chapterId}
                onChange={(value) => handleFilterChange("chapterId", value)}
                options={chapters.map((chapter) => ({
                  value: chapter.id,
                  label: chapter.name,
                }))}
                placeholder="All"
              />
              <Select
                label="Event"
                value={filters.eventId}
                onChange={(value) => handleFilterChange("eventId", value)}
                options={events.map((event) => ({
                  value: event.id,
                  label: event.name,
                }))}
                placeholder="All"
              />
              <Select
                label="Location"
                value={filters.locationId}
                onChange={(value) => handleFilterChange("locationId", value)}
                options={locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
                placeholder="All"
              />
              <Select
                label="Character"
                value={filters.characterId}
                onChange={(value) => handleFilterChange("characterId", value)}
                options={characters.map((character) => ({
                  value: character.id,
                  label: character.name,
                }))}
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
              <SceneList
                items={items}
                chaptersById={chaptersById}
                eventsById={eventsById}
                locationsById={locationsById}
                charactersById={charactersById}
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
                <h3 className="section-title">{t("Edit scene")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Scene Identity" description="Core scene details.">
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
                label="Chapter"
                value={editValues.chapterId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, chapterId: value })
                }
                options={chapters.map((chapter) => ({
                  label: chapter.name,
                  value: chapter.id,
                }))}
                placeholder={chapters.length ? t("Select") : t("No chapters yet.")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Event"
                value={editValues.eventId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, eventId: value })
                }
                options={events.map((event) => ({
                  label: event.name,
                  value: event.id,
                }))}
                placeholder={events.length ? t("Select") : t("No events yet.")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Location"
                value={editValues.locationId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, locationId: value })
                }
                options={locations.map((location) => ({
                  label: location.name,
                  value: location.id,
                }))}
                placeholder={locations.length ? t("Select") : t("No locations yet.")}
              />
            </div>
            <div className="form-field--wide">
              <label>{t("Characters")}</label>
              <div className="participant-picker">
                <select
                  className="select"
                  value={editCharacterId}
                  onChange={(event) => setEditCharacterId(event.target.value)}
                >
                  <option value="">{t("Select character")}</option>
                  {characters
                    .filter(
                      (character) =>
                        !editValues.characterIds.includes(character.id)
                    )
                    .map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddEditCharacter}
                  disabled={!editCharacterId}
                >
                  {t("Add")}
                </Button>
              </div>
              {editValues.characterIds.length === 0 ? (
                <span className="header__subtitle">
                  {t("No characters yet.")}
                </span>
              ) : (
                <div className="participant-list">
                  {editValues.characterIds.map((id) => (
                    <div key={id} className="participant-card">
                      <div className="participant-card__header">
                        <strong>{charactersById[id] ?? id}</strong>
                        <button
                          type="button"
                          className="table__action table__action--ghost"
                          onClick={() =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    characterIds: prev.characterIds.filter(
                                      (item) => item !== id
                                    ),
                                  }
                                : prev
                            )
                          }
                        >
                          {t("Remove")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            <div className="form-field--wide">
              <TextArea
                label="Content"
                value={editValues.content}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, content: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the scene.">
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
          <FormSection title="Scene Identity" description="Core scene details.">
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
                label="Chapter"
                value={values.chapterId}
                onChange={(value) => setField("chapterId", value)}
                options={chapters.map((chapter) => ({
                  label: chapter.name,
                  value: chapter.id,
                }))}
                placeholder={chapters.length ? t("Select") : t("No chapters yet.")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Event"
                value={values.eventId}
                onChange={(value) => setField("eventId", value)}
                options={events.map((event) => ({
                  label: event.name,
                  value: event.id,
                }))}
                placeholder={events.length ? t("Select") : t("No events yet.")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Location"
                value={values.locationId}
                onChange={(value) => setField("locationId", value)}
                options={locations.map((location) => ({
                  label: location.name,
                  value: location.id,
                }))}
                placeholder={locations.length ? t("Select") : t("No locations yet.")}
              />
            </div>
            <div className="form-field--wide">
              <label>{t("Characters")}</label>
              <div className="participant-picker">
                <select
                  className="select"
                  value={characterId}
                  onChange={(event) => setCharacterId(event.target.value)}
                >
                  <option value="">{t("Select character")}</option>
                  {characters
                    .filter(
                      (character) => !values.characterIds.includes(character.id)
                    )
                    .map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddCharacter}
                  disabled={!characterId}
                >
                  {t("Add")}
                </Button>
              </div>
              {values.characterIds.length === 0 ? (
                <span className="header__subtitle">
                  {t("No characters yet.")}
                </span>
              ) : (
                <div className="participant-list">
                  {values.characterIds.map((id) => (
                    <div key={id} className="participant-card">
                      <div className="participant-card__header">
                        <strong>{charactersById[id] ?? id}</strong>
                        <button
                          type="button"
                          className="table__action table__action--ghost"
                          onClick={() =>
                            setField(
                              "characterIds",
                              values.characterIds.filter((item) => item !== id)
                            )
                          }
                        >
                          {t("Remove")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Summary"
                value={values.summary}
                onChange={(value) => setField("summary", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Content"
                value={values.content}
                onChange={(value) => setField("content", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the scene.">
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
              {t("Create scene")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
