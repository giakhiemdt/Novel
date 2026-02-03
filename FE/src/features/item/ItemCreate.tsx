import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
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
import { getAllEvents } from "../event/event.api";
import type { Event } from "../event/event.types";
import { getAllFactions } from "../faction/faction.api";
import type { Faction } from "../faction/faction.types";
import { ItemList } from "./ItemList";
import {
  createItem,
  deleteItem,
  getAllItems,
  getEventsByItem,
  linkItemEvent,
  unlinkItemEvent,
  updateItem,
} from "./item.api";
import { validateItem } from "./item.schema";
import type { Item, ItemOwnerType, ItemPayload, ItemStatus } from "./item.types";

const initialState = {
  name: "",
  origin: "",
  ownerType: "" as ItemOwnerType | "",
  ownerId: "",
  status: "owned" as ItemStatus,
  powerLevel: "",
  powerDescription: "",
  notes: "",
  tags: [] as string[],
};

type ItemFormState = typeof initialState;

const STATUS_OPTIONS: ItemStatus[] = ["owned", "lost", "destroyed"];

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
      const data = await getAllItems();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllItems]);

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
    void loadItems();
    void loadCharacters();
    void loadFactions();
    void loadEvents();
  }, [loadItems, loadCharacters, loadFactions, loadEvents]);

  useProjectChange(() => {
    void loadItems();
    void loadCharacters();
    void loadFactions();
    void loadEvents();
  });

  const mapItemToForm = (item: Item): ItemFormState => ({
    name: item.name ?? "",
    origin: item.origin ?? "",
    ownerType: item.ownerType ?? "",
    ownerId: item.ownerId ?? "",
    status: item.status ?? "owned",
    powerLevel: item.powerLevel !== undefined ? String(item.powerLevel) : "",
    powerDescription: item.powerDescription ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): ItemPayload => ({
    name: values.name,
    origin: values.origin || undefined,
    ownerType: values.ownerType || undefined,
    ownerId: values.ownerId || undefined,
    status: values.status || undefined,
    powerLevel: values.powerLevel === "" ? undefined : Number(values.powerLevel),
    powerDescription: values.powerDescription || undefined,
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
      await loadItems();
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
        status: editValues.status || undefined,
        powerLevel:
          editValues.powerLevel === "" ? undefined : Number(editValues.powerLevel),
        powerDescription: editValues.powerDescription || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Item updated successfully."), "success");
      await loadItems();
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
      await loadItems();
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
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Item nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new item")}
          </Button>
        </div>
        <ItemList
          items={items}
          charactersById={charactersById}
          factionsById={factionsById}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
        />
      </div>

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
                options={STATUS_OPTIONS.map((value) => ({
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
                options={STATUS_OPTIONS.map((value) => ({
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
