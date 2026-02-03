import { useCallback, useEffect, useState } from "react";
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
import {
  createLocation,
  createLocationContains,
  deleteLocation,
  deleteLocationContains,
  getAllLocations,
  updateLocation,
} from "./location.api";
import { LocationList } from "./LocationList";
import { validateLocation } from "./location.schema";
import type { Location, LocationPayload } from "./location.types";

const initialState = {
  name: "",
  alias: [] as string[],
  type: "",
  typeDetail: "",
  category: "",
  isHabitable: false,
  isSecret: false,
  terrain: "",
  climate: "",
  environment: "",
  naturalResources: [] as string[],
  powerDensity: "",
  dangerLevel: "",
  anomalies: [] as string[],
  restrictions: [] as string[],
  historicalSummary: "",
  legend: "",
  ruinsOrigin: "",
  currentStatus: "",
  controlledBy: "",
  populationNote: "",
  notes: "",
  tags: [] as string[],
};

type LocationFormState = typeof initialState;

const TYPE_OPTIONS = [
  { value: "LEVEL 1 - STRUCTURE", label: "LEVEL 1 - STRUCTURE" },
  { value: "LEVEL 2 - COMPLEX", label: "LEVEL 2 - COMPLEX" },
  { value: "LEVEL 3 - SETTLEMENT", label: "LEVEL 3 - SETTLEMENT" },
  { value: "LEVEL 4 - REGION", label: "LEVEL 4 - REGION" },
  { value: "LEVEL 5 - TERRITORY", label: "LEVEL 5 - TERRITORY" },
  { value: "LEVEL 6 - WORLD SCALE", label: "LEVEL 6 - WORLD SCALE" },
];

const TYPE_DETAIL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  "LEVEL 1 - STRUCTURE": [
    { value: "HOUSE", label: "HOUSE" },
    { value: "BUILDING", label: "BUILDING" },
    { value: "TOWER", label: "TOWER" },
    { value: "TEMPLE", label: "TEMPLE" },
    { value: "SHRINE", label: "SHRINE" },
    { value: "LAB", label: "LAB" },
    { value: "OUTPOST", label: "OUTPOST" },
    { value: "RUINS_SITE", label: "RUINS_SITE" },
    { value: "CAVE", label: "CAVE" },
    { value: "DUNGEON", label: "DUNGEON" },
  ],
  "LEVEL 2 - COMPLEX": [
    { value: "CASTLE", label: "CASTLE" },
    { value: "PALACE", label: "PALACE" },
    { value: "FORT", label: "FORT" },
    { value: "CITADEL", label: "CITADEL" },
    { value: "STRONGHOLD", label: "STRONGHOLD" },
  ],
  "LEVEL 3 - SETTLEMENT": [
    { value: "HAMLET", label: "HAMLET" },
    { value: "VILLAGE", label: "VILLAGE" },
    { value: "TOWN", label: "TOWN" },
    { value: "CITY", label: "CITY" },
    { value: "METROPOLIS", label: "METROPOLIS" },
  ],
  "LEVEL 4 - REGION": [
    { value: "DISTRICT", label: "DISTRICT" },
    { value: "PROVINCE", label: "PROVINCE" },
    { value: "DOMAIN", label: "DOMAIN" },
    { value: "MARCH", label: "MARCH" },
    { value: "FRONTIER", label: "FRONTIER" },
    { value: "WILDLAND", label: "WILDLAND" },
  ],
  "LEVEL 5 - TERRITORY": [{ value: "TERRITORY", label: "TERRITORY" }],
  "LEVEL 6 - WORLD SCALE": [
    { value: "CONTINENT", label: "CONTINENT" },
    { value: "SUBCONTINENT", label: "SUBCONTINENT" },
    { value: "ARCHIPELAGO", label: "ARCHIPELAGO" },
    { value: "OCEAN", label: "OCEAN" },
    { value: "SEA", label: "SEA" },
    { value: "WORLD", label: "WORLD" },
  ],
};

export const LocationCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<LocationFormState>(initialState);
  const [items, setItems] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Location | null>(null);
  const [editValues, setEditValues] = useState<LocationFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await getAllLocations();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllLocations]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useProjectChange(() => {
    void loadItems();
  });

  const mapLocationToForm = (item: Location): LocationFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    type: item.type ?? "",
    typeDetail: item.typeDetail ?? "",
    category: item.category ?? "",
    isHabitable: item.isHabitable ?? false,
    isSecret: item.isSecret ?? false,
    terrain: item.terrain ?? "",
    climate: item.climate ?? "",
    environment: item.environment ?? "",
    naturalResources: item.naturalResources ?? [],
    powerDensity: item.powerDensity ?? "",
    dangerLevel: item.dangerLevel !== undefined ? String(item.dangerLevel) : "",
    anomalies: item.anomalies ?? [],
    restrictions: item.restrictions ?? [],
    historicalSummary: item.historicalSummary ?? "",
    legend: item.legend ?? "",
    ruinsOrigin: item.ruinsOrigin ?? "",
    currentStatus: item.currentStatus ?? "",
    controlledBy: item.controlledBy ?? "",
    populationNote: item.populationNote ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): LocationPayload => ({
    name: values.name,
    alias: values.alias,
    type: values.type || undefined,
    typeDetail: values.typeDetail || undefined,
    category: values.category || undefined,
    isHabitable: values.isHabitable,
    isSecret: values.isSecret,
    terrain: values.terrain || undefined,
    climate: values.climate || undefined,
    environment: values.environment || undefined,
    naturalResources: values.naturalResources,
    powerDensity: values.powerDensity || undefined,
    dangerLevel: values.dangerLevel === "" ? undefined : Number(values.dangerLevel),
    anomalies: values.anomalies,
    restrictions: values.restrictions,
    historicalSummary: values.historicalSummary || undefined,
    legend: values.legend || undefined,
    ruinsOrigin: values.ruinsOrigin || undefined,
    currentStatus: values.currentStatus || undefined,
    controlledBy: values.controlledBy || undefined,
    populationNote: values.populationNote || undefined,
    notes: values.notes || undefined,
    tags: values.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateLocation(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const created = await createLocation(payload);
      notify(t("Location created successfully."), "success");
      reset();
      setShowForm(false);
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Location) => {
    setEditItem(item);
    setEditValues(mapLocationToForm(item));
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
      await updateLocation(editItem.id, {
        name: editValues.name,
        alias: editValues.alias,
        type: editValues.type || undefined,
        typeDetail: editValues.typeDetail || undefined,
        category: editValues.category || undefined,
        isHabitable: editValues.isHabitable,
        isSecret: editValues.isSecret,
        terrain: editValues.terrain || undefined,
        climate: editValues.climate || undefined,
        environment: editValues.environment || undefined,
        naturalResources: editValues.naturalResources,
        powerDensity: editValues.powerDensity || undefined,
        dangerLevel:
          editValues.dangerLevel === "" ? undefined : Number(editValues.dangerLevel),
        anomalies: editValues.anomalies,
        restrictions: editValues.restrictions,
        historicalSummary: editValues.historicalSummary || undefined,
        legend: editValues.legend || undefined,
        ruinsOrigin: editValues.ruinsOrigin || undefined,
        currentStatus: editValues.currentStatus || undefined,
        controlledBy: editValues.controlledBy || undefined,
        populationNote: editValues.populationNote || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Location updated successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Location) => {
    const confirmed = window.confirm(
      t("Delete this location? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteLocation(item.id);
      notify(t("Location deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleLink = async (parentId: string, childId: string) => {
    try {
      await createLocationContains({
        parentId,
        childId,
        sinceYear: null,
        untilYear: null,
        note: null,
      });
      notify(t("Location linked successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleUnlink = async (childId: string) => {
    try {
      await deleteLocationContains({ childId });
      notify(t("Location unlinked successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Location nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new location")}
          </Button>
        </div>
        <LocationList
          items={items}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
          onLink={handleLink}
          onUnlink={handleUnlink}
          onError={(message) => notify(message, "error")}
        />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit location")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Location Identity"
            description="Describe the place and its origin."
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
                    prev && { ...prev, type: value, typeDetail: "" }
                  )
                }
                options={TYPE_OPTIONS}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type Detail"
                value={editValues.typeDetail}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, typeDetail: value })
                }
                options={TYPE_DETAIL_OPTIONS[editValues.type] ?? []}
                placeholder={editValues.type ? undefined : t("Select")}
                disabled={!editValues.type}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Category"
                value={editValues.category}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, category: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Habitable")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isHabitable}
                  onChange={(event) =>
                    setEditValues(
                      (prev) =>
                        prev && { ...prev, isHabitable: event.target.checked }
                    )
                  }
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Secret")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isSecret}
                  onChange={(event) =>
                    setEditValues(
                      (prev) => prev && { ...prev, isSecret: event.target.checked }
                    )
                  }
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
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
          </FormSection>

          <FormSection title="Environment" description="Physical and mystical characteristics.">
            <div className="form-field--narrow">
              <TextInput
                label="Terrain"
                value={editValues.terrain}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, terrain: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Climate"
                value={editValues.climate}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, climate: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Environment"
                value={editValues.environment}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, environment: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Power Density"
                value={editValues.powerDensity}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, powerDensity: value })
                }
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Danger Level"
                type="number"
                value={editValues.dangerLevel}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, dangerLevel: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Natural Resources"
                values={editValues.naturalResources}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, naturalResources: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Anomalies"
                values={editValues.anomalies}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, anomalies: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Restrictions"
                values={editValues.restrictions}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, restrictions: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="History" description="Legends and present state.">
            <div className="form-field--wide">
              <TextArea
                label="Historical Summary"
                value={editValues.historicalSummary}
                onChange={(value) =>
                  setEditValues(
                    (prev) => prev && { ...prev, historicalSummary: value }
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Legend"
                value={editValues.legend}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, legend: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Ruins Origin"
                value={editValues.ruinsOrigin}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, ruinsOrigin: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Current Status"
                value={editValues.currentStatus}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, currentStatus: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Controlled By"
                value={editValues.controlledBy}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, controlledBy: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Population Note"
                value={editValues.populationNote}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, populationNote: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Add extra tracking fields.">
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
      <FormSection title="Location Identity" description="Describe the place and its origin.">
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
            onChange={(value) => {
              setField("type", value);
              setField("typeDetail", "");
            }}
            options={TYPE_OPTIONS}
            required
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Type Detail"
            value={values.typeDetail}
            onChange={(value) => setField("typeDetail", value)}
            options={TYPE_DETAIL_OPTIONS[values.type] ?? []}
            placeholder={values.type ? undefined : t("Select")}
            disabled={!values.type}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Category"
            value={values.category}
            onChange={(value) => setField("category", value)}
          />
        </div>
        <div className="form-field--narrow">
          <label className="toggle">
            <span>{t("Habitable")}</span>
            <input
              type="checkbox"
              checked={values.isHabitable}
              onChange={(event) => setField("isHabitable", event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
          </label>
        </div>
        <div className="form-field--narrow">
          <label className="toggle">
            <span>{t("Secret")}</span>
            <input
              type="checkbox"
              checked={values.isSecret}
              onChange={(event) => setField("isSecret", event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
          </label>
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Alias"
            values={values.alias}
            onChange={(value) => setField("alias", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Environment" description="Physical and mystical characteristics.">
        <div className="form-field--narrow">
          <TextInput
            label="Terrain"
            value={values.terrain}
            onChange={(value) => setField("terrain", value)}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Climate"
            value={values.climate}
            onChange={(value) => setField("climate", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Environment"
            value={values.environment}
            onChange={(value) => setField("environment", value)}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Power Density"
            value={values.powerDensity}
            onChange={(value) => setField("powerDensity", value)}
          />
        </div>
        <div className="form-field--narrow form-field--compact">
          <TextInput
            label="Danger Level"
            type="number"
            value={values.dangerLevel}
            onChange={(value) => setField("dangerLevel", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Natural Resources"
            values={values.naturalResources}
            onChange={(value) => setField("naturalResources", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Anomalies"
            values={values.anomalies}
            onChange={(value) => setField("anomalies", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Restrictions"
            values={values.restrictions}
            onChange={(value) => setField("restrictions", value)}
          />
        </div>
      </FormSection>

      <FormSection title="History" description="Legends and present state.">
        <div className="form-field--wide">
          <TextArea
            label="Historical Summary"
            value={values.historicalSummary}
            onChange={(value) => setField("historicalSummary", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextArea
            label="Legend"
            value={values.legend}
            onChange={(value) => setField("legend", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Ruins Origin"
            value={values.ruinsOrigin}
            onChange={(value) => setField("ruinsOrigin", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Current Status"
            value={values.currentStatus}
            onChange={(value) => setField("currentStatus", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Controlled By"
            value={values.controlledBy}
            onChange={(value) => setField("controlledBy", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Population Note"
            value={values.populationNote}
            onChange={(value) => setField("populationNote", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Notes & Tags" description="Add extra tracking fields.">
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
          {t("Create location")}
        </Button>
      </div>
        </>
      )}
    </div>
  );
};
