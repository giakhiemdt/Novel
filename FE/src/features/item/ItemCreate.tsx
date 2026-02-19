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
import { TraitEditor } from "../../components/form/TraitEditor";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getAllCharacters } from "../character/character.api";
import type { Character } from "../character/character.types";
import { getAllEvents } from "../event/event.api";
import type { Event } from "../event/event.types";
import { getAllFactions } from "../faction/faction.api";
import type { Faction } from "../faction/faction.types";
import { ItemList } from "./ItemList";
import {
  createItem,
  deleteItem,
  getItemsPage,
  getEventsByItem,
  linkItemEvent,
  unlinkItemEvent,
  updateItem,
} from "./item.api";
import { validateItem } from "./item.schema";
import {
  ITEM_OWNER_TYPES,
  ITEM_STATUSES,
  ITEM_TYPES,
} from "./item.types";
import type {
  Item,
  ItemOwnerType,
  ItemPayload,
  ItemStatus,
  ItemType,
} from "./item.types";
import {
  createEmptyTraitDraft,
  normalizeTraitArray,
  toTraitDrafts,
  toTraitPayload,
} from "../../utils/trait";

const initialState = {
  name: "",
  origin: "",
  ownerType: "" as ItemOwnerType | "",
  ownerId: "",
  type: "" as ItemType | "",
  status: "owned" as ItemStatus,
  powerLevel: "",
  powerDescription: "",
  abilities: [createEmptyTraitDraft()],
  notes: "",
  tags: [] as string[],
};

type ItemFormState = typeof initialState;
type ItemFilterState = {
  q: string;
  name: string;
  tag: string;
  type: ItemType | "";
  status: ItemStatus | "";
  ownerType: ItemOwnerType | "";
  ownerId: string;
};

export const ItemCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<ItemFormState>(initialState);
  const [items, setItems] = useState<Item[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [editValues, setEditValues] = useState<ItemFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editEvents, setEditEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState<ItemFilterState>({
    q: "",
    name: "",
    tag: "",
    type: "",
    status: "",
    ownerType: "",
    ownerId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const charactersById = useMemo(
    () =>
      characters.reduce<Record<string, string>>((acc, character) => {
        acc[character.id] = character.name;
        return acc;
      }, {}),
    [characters]
  );

  const factionsById = useMemo(
    () =>
      factions.reduce<Record<string, string>>((acc, faction) => {
        acc[faction.id] = faction.name;
        return acc;
      }, {}),
    [factions]
  );

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getItemsPage({
        ...filters,
        type: filters.type || undefined,
        status: filters.status || undefined,
        ownerType: filters.ownerType || undefined,
        limit: pageSize + 1,
        offset,
      });
      const data = (response?.data ?? []).map((item) => ({
        ...item,
        abilities: normalizeTraitArray(item.abilities),
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
  }, [page, pageSize, filters, notify, getItemsPage]);

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setCharacters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllCharacters]);

  const loadFactions = useCallback(async () => {
    try {
      const data = await getAllFactions();
      setFactions(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllFactions]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await getAllEvents();
      setEvents(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllEvents]);

  const loadItemEvents = useCallback(
    async (itemId: string) => {
      try {
        const data = await getEventsByItem(itemId);
        setEditEvents(data ?? []);
      } catch (err) {
        notify((err as Error).message, "error");
      }
    },
    [getEventsByItem]
  );

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    void loadCharacters();
    void loadFactions();
    void loadEvents();
  }, [loadCharacters, loadFactions, loadEvents]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadCharacters();
    void loadFactions();
    void loadEvents();
  });

  const handleFilterChange = <K extends keyof ItemFilterState>(
    key: K,
    value: ItemFilterState[K]
  ) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "ownerType" ? { ownerId: "" } : {}),
    }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      name: "",
      tag: "",
      type: "",
      status: "",
      ownerType: "",
      ownerId: "",
    });
  };

  const filterOwnerOptions = useMemo(() => {
    if (filters.ownerType === "character") {
      return characters.map((character) => ({
        value: character.id,
        label: character.name,
      }));
    }
    if (filters.ownerType === "faction") {
      return factions.map((faction) => ({
        value: faction.id,
        label: faction.name,
      }));
    }
    return [
      ...characters.map((character) => ({
        value: character.id,
        label: `${t("Character")}: ${character.name}`,
      })),
      ...factions.map((faction) => ({
        value: faction.id,
        label: `${t("Faction")}: ${faction.name}`,
      })),
    ];
  }, [filters.ownerType, characters, factions, t]);

  const mapItemToForm = (item: Item): ItemFormState => ({
    name: item.name ?? "",
    origin: item.origin ?? "",
    ownerType: item.ownerType ?? "",
    ownerId: item.ownerId ?? "",
    type: item.type ?? "",
    status: item.status ?? "owned",
    powerLevel: item.powerLevel !== undefined ? String(item.powerLevel) : "",
    powerDescription: item.powerDescription ?? "",
    abilities: toTraitDrafts(item.abilities),
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): ItemPayload => ({
    name: values.name,
    origin: values.origin || undefined,
    ownerType: values.ownerType || undefined,
    ownerId: values.ownerId || undefined,
    type: values.type || undefined,
    status: values.status || undefined,
    powerLevel: values.powerLevel === "" ? undefined : Number(values.powerLevel),
    powerDescription: values.powerDescription || undefined,
    abilities: toTraitPayload(values.abilities),
    notes: values.notes || undefined,
    tags: values.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateItem(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createItem(payload);
      notify(t("Item created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = async (item: Item) => {
    setEditItem(item);
    setEditValues(mapItemToForm(item));
    setShowForm(false);
    setEventId("");
    await loadItemEvents(item.id);
  };

  const handleEditCancel = () => {
    setEditItem(null);
    setEditValues(null);
    setEditEvents([]);
  };

  const handleEditSave = async () => {
    if (!editItem || !editValues) {
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateItem(editItem.id, {
        name: editValues.name,
        origin: editValues.origin || undefined,
        ownerType: editValues.ownerType || undefined,
        ownerId: editValues.ownerId || undefined,
        type: editValues.type || undefined,
        status: editValues.status || undefined,
        powerLevel:
          editValues.powerLevel === "" ? undefined : Number(editValues.powerLevel),
        powerDescription: editValues.powerDescription || undefined,
        abilities: toTraitPayload(editValues.abilities),
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Item updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Item) => {
    const confirmed = window.confirm(
      t("Delete this item? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteItem(item.id);
      notify(t("Item deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleLinkEvent = async () => {
    if (!editItem || !eventId) {
      return;
    }
    try {
      await linkItemEvent(editItem.id, eventId);
      notify(t("Item linked successfully."), "success");
      await loadItemEvents(editItem.id);
      setEventId("");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleUnlinkEvents = async () => {
    if (!editItem) {
      return;
    }
    try {
      await unlinkItemEvent(editItem.id);
      notify(t("Item unlinked successfully."), "success");
      await loadItemEvents(editItem.id);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const ownerOptions = useMemo(() => {
    if (values.ownerType === "character") {
      return characters.map((character) => ({
        label: character.name,
        value: character.id,
      }));
    }
    if (values.ownerType === "faction") {
      return factions.map((faction) => ({
        label: faction.name,
        value: faction.id,
      }));
    }
    return [];
  }, [values.ownerType, characters, factions]);

  const editOwnerOptions = useMemo(() => {
    if (editValues?.ownerType === "character") {
      return characters.map((character) => ({
        label: character.name,
        value: character.id,
      }));
    }
    if (editValues?.ownerType === "faction") {
      return factions.map((faction) => ({
        label: faction.name,
        value: faction.id,
      }));
    }
    return [];
  }, [editValues?.ownerType, characters, factions]);

  return (
    <div>
      <CrudPageShell
        title="Item nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new item"
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
                onChange={(value) => handleFilterChange("type", value as ItemType | "")}
                options={ITEM_TYPES.map((value) => ({
                  value,
                  label: t(value),
                }))}
                placeholder="All"
              />
              <Select
                label="Status"
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value as ItemStatus | "")}
                options={ITEM_STATUSES.map((value) => ({
                  value,
                  label: t(value),
                }))}
                placeholder="All"
              />
              <Select
                label="Owner Type"
                value={filters.ownerType}
                onChange={(value) =>
                  handleFilterChange("ownerType", value as ItemOwnerType | "")
                }
                options={ITEM_OWNER_TYPES.map((value) => ({
                  value,
                  label: t(value === "character" ? "Character" : "Faction"),
                }))}
                placeholder="All"
              />
              <Select
                label="Owner"
                value={filters.ownerId}
                onChange={(value) => handleFilterChange("ownerId", value)}
                options={filterOwnerOptions}
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
              <ItemList
                items={items}
                charactersById={charactersById}
                factionsById={factionsById}
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
                <h3 className="section-title">{t("Edit item")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Item Identity" description="Core item details.">
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
              <TextInput
                label="Origin"
                value={editValues.origin}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, origin: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, type: value as ItemType | "" })
                }
                options={ITEM_TYPES.map((value) => ({
                  label: t(value),
                  value,
                }))}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Owner Type"
                value={editValues.ownerType}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? { ...prev, ownerType: value as ItemOwnerType, ownerId: "" }
                      : prev
                  )
                }
                options={[
                  { label: t("Character"), value: "character" },
                  { label: t("Faction"), value: "faction" },
                ]}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Owner"
                value={editValues.ownerId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, ownerId: value })
                }
                options={editOwnerOptions}
                placeholder={editOwnerOptions.length ? t("Select") : t("No characters yet.")}
                disabled={!editValues.ownerType}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={editValues.status}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, status: value as ItemStatus })
                }
                options={ITEM_STATUSES.map((value) => ({
                  label: t(value),
                  value,
                }))}
              />
            </div>
          </FormSection>

          <FormSection title="Power" description="Power and rarity details.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Power Level"
                type="number"
                value={editValues.powerLevel}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, powerLevel: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Power Description"
                value={editValues.powerDescription}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, powerDescription: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TraitEditor
                label="Abilities"
                values={editValues.abilities}
                onChange={(abilities) =>
                  setEditValues((prev) => prev && { ...prev, abilities })
                }
                namePlaceholder="Ability name"
                descriptionPlaceholder="Ability content"
              />
            </div>
          </FormSection>

          <FormSection title="Events" description="Link this item to events.">
            <div className="form-field--wide">
              <div className="participant-picker">
                <select
                  className="select"
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                >
                  <option value="">{t("Select event")}</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLinkEvent}
                  disabled={!eventId}
                >
                  {t("Add")}
                </Button>
              </div>
              {editEvents.length === 0 ? (
                <span className="header__subtitle">{t("No events yet.")}</span>
              ) : (
                <div className="participant-list" style={{ marginTop: "12px" }}>
                  {editEvents.map((event) => (
                    <div key={event.id} className="participant-card">
                      <div className="participant-card__header">
                        <strong>{event.name}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {editEvents.length > 0 && (
              <div className="form-field--wide">
                <Button variant="ghost" onClick={handleUnlinkEvents}>
                  {t("Unlink all events")}
                </Button>
              </div>
            )}
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the item.">
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
          <FormSection title="Item Identity" description="Core item details.">
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Origin"
                value={values.origin}
                onChange={(value) => setField("origin", value)}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={values.type}
                onChange={(value) => setField("type", value as ItemType | "")}
                options={ITEM_TYPES.map((value) => ({
                  label: t(value),
                  value,
                }))}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Owner Type"
                value={values.ownerType}
                onChange={(value) => {
                  setField("ownerType", value as ItemOwnerType);
                  setField("ownerId", "");
                }}
                options={[
                  { label: t("Character"), value: "character" },
                  { label: t("Faction"), value: "faction" },
                ]}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Owner"
                value={values.ownerId}
                onChange={(value) => setField("ownerId", value)}
                options={ownerOptions}
                placeholder={ownerOptions.length ? t("Select") : t("No characters yet.")}
                disabled={!values.ownerType}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={values.status}
                onChange={(value) => setField("status", value as ItemStatus)}
                options={ITEM_STATUSES.map((value) => ({
                  label: t(value),
                  value,
                }))}
              />
            </div>
          </FormSection>

          <FormSection title="Power" description="Power and rarity details.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Power Level"
                type="number"
                value={values.powerLevel}
                onChange={(value) => setField("powerLevel", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Power Description"
                value={values.powerDescription}
                onChange={(value) => setField("powerDescription", value)}
              />
            </div>
            <div className="form-field--wide">
              <TraitEditor
                label="Abilities"
                values={values.abilities}
                onChange={(abilities) => setField("abilities", abilities)}
                namePlaceholder="Ability name"
                descriptionPlaceholder="Ability content"
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the item.">
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
              {t("Create item")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
