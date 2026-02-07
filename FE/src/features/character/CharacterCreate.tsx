import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { useToast } from "../../components/common/Toast";
import {
  createCharacter,
  deleteCharacter,
  getCharactersPage,
  updateCharacter,
} from "./character.api";
import { getAllRaces } from "../race/race.api";
import { getAllRanks } from "../rank/rank.api";
import { getAllSpecialAbilities } from "../special-ability/special-ability.api";
import { CharacterList } from "./CharacterList";
import { validateCharacter } from "./character.schema";
import type { Character, CharacterPayload } from "./character.types";
import type { Race } from "../race/race.types";
import type { Rank } from "../rank/rank.types";
import type { SpecialAbility } from "../special-ability/special-ability.types";
import { getSchemaByEntity } from "../schema/schema.api";
import type { EntitySchema, SchemaField } from "../schema/schema.types";

const initialState = {
  name: "",
  alias: [] as string[],
  level: "",
  status: "" as Exclude<Character["status"], undefined> | "",
  isMainCharacter: false,
  gender: "",
  age: "",
  race: "",
  specialAbilities: [] as string[],
  appearance: "",
  height: "",
  distinctiveTraits: [] as string[],
  personalityTraits: [] as string[],
  beliefs: [] as string[],
  fears: [] as string[],
  desires: [] as string[],
  weaknesses: [] as string[],
  origin: "",
  background: "",
  trauma: [] as string[],
  secret: "",
  currentLocation: "",
  currentGoal: "",
  currentAffiliation: "",
  powerState: "",
  notes: "",
  tags: [] as string[],
  extra: {} as Record<string, unknown>,
};

type CharacterFormState = typeof initialState;
const normalizeCharacterStatus = (
  value: string
): Exclude<Character["status"], undefined> | "" =>
  value === "Alive" || value === "Dead" ? value : "";

export const CharacterCreate = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { values, setField, reset } = useForm<CharacterFormState>(initialState);
  const [items, setItems] = useState<Character[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [specialAbilities, setSpecialAbilities] = useState<SpecialAbility[]>([]);
  const [schema, setSchema] = useState<EntitySchema | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Character | null>(null);
  const [editValues, setEditValues] = useState<CharacterFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    race: "",
    specialAbility: "",
    gender: "",
    status: "",
    level: "",
    isMainCharacter: undefined as boolean | undefined,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getCharactersPage({
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
  }, [page, pageSize, filters, notify, getCharactersPage]);

  const loadRaces = useCallback(async () => {
    try {
      const data = await getAllRaces();
      setRaces(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRaces]);

  const loadRanks = useCallback(async () => {
    try {
      const data = await getAllRanks();
      setRanks(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRanks]);

  const loadSpecialAbilities = useCallback(async () => {
    try {
      const data = await getAllSpecialAbilities();
      setSpecialAbilities(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllSpecialAbilities]);

  const loadSchema = useCallback(async () => {
    try {
      const data = await getSchemaByEntity("character");
      setSchema(data ?? null);
    } catch (err) {
      const message = (err as Error).message;
      if (message !== "schema not found") {
        notify(message, "error");
      }
      setSchema(null);
    }
  }, [getSchemaByEntity]);

  useEffect(() => {
    void loadItems();
  }, [loadItems, refreshKey]);

  useEffect(() => {
    void loadRaces();
    void loadRanks();
    void loadSpecialAbilities();
    void loadSchema();
  }, [loadRaces, loadRanks, loadSpecialAbilities, loadSchema]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadRaces();
    void loadRanks();
    void loadSpecialAbilities();
    void loadSchema();
  });

  const handleFilterChange = (
    key:
      | "q"
      | "name"
      | "tag"
      | "race"
      | "specialAbility"
      | "gender"
      | "status"
      | "level",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleMainCharacterFilterChange = (value: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      isMainCharacter: value === "" ? undefined : value === "true",
    }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      name: "",
      tag: "",
      race: "",
      specialAbility: "",
      gender: "",
      status: "",
      level: "",
      isMainCharacter: undefined,
    });
  };

  const raceOptions = useMemo(() => {
    const options =
      races.length > 0
        ? races
            .map((race) => race.name?.trim() ?? "")
            .filter((name) => name.length > 0)
            .map((name) => ({ value: name, label: name }))
        : [];
    return [...options, { value: "__create__", label: t("Create race") }];
  }, [races, t]);

  const rankOptions = useMemo(() => {
    const options =
      ranks.length > 0
        ? ranks
            .map((rank) => rank.name?.trim() ?? "")
            .filter((name) => name.length > 0)
            .map((name) => ({ value: name, label: name }))
        : [];
    return [...options, { value: "__create__", label: t("Create rank") }];
  }, [ranks, t]);

  const abilityOptions = useMemo(() => {
    const options =
      specialAbilities.length > 0
        ? specialAbilities
            .map((ability) => ability.name?.trim() ?? "")
            .filter((name) => name.length > 0)
            .map((name) => ({ value: name, label: name }))
        : [];
    return [...options, { value: "__create__", label: t("Create special ability") }];
  }, [specialAbilities, t]);

  const schemaFields = useMemo<SchemaField[]>(() => {
    if (!schema?.fields?.length) {
      return [];
    }
    return [...schema.fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [schema]);

  const mapCharacterToForm = (item: Character): CharacterFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    level: item.level ?? "",
    status: item.status ?? "",
    isMainCharacter: item.isMainCharacter ?? false,
    gender: item.gender ?? "",
    age: item.age !== undefined ? String(item.age) : "",
    race: item.race ?? "",
    specialAbilities: item.specialAbilities ?? [],
    appearance: item.appearance ?? "",
    height: item.height !== undefined ? String(item.height) : "",
    distinctiveTraits: item.distinctiveTraits ?? [],
    personalityTraits: item.personalityTraits ?? [],
    beliefs: item.beliefs ?? [],
    fears: item.fears ?? [],
    desires: item.desires ?? [],
    weaknesses: item.weaknesses ?? [],
    origin: item.origin ?? "",
    background: item.background ?? "",
    trauma: item.trauma ?? [],
    secret: item.secret ?? "",
    currentLocation: item.currentLocation ?? "",
    currentGoal: item.currentGoal ?? "",
    currentAffiliation: item.currentAffiliation ?? "",
    powerState: item.powerState ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
    extra: item.extra ?? {},
  });

  const buildPayload = (): CharacterPayload => ({
    name: values.name,
    alias: values.alias,
    level: values.level || undefined,
    status: values.status as CharacterPayload["status"],
    isMainCharacter: values.isMainCharacter,
    gender: values.gender as CharacterPayload["gender"],
    age: values.age === "" ? undefined : Number(values.age),
    race: values.race || undefined,
    specialAbilities: values.specialAbilities,
    appearance: values.appearance || undefined,
    height: values.height === "" ? undefined : Number(values.height),
    distinctiveTraits: values.distinctiveTraits,
    personalityTraits: values.personalityTraits,
    beliefs: values.beliefs,
    fears: values.fears,
    desires: values.desires,
    weaknesses: values.weaknesses,
    origin: values.origin || undefined,
    background: values.background || undefined,
    trauma: values.trauma,
    secret: values.secret || undefined,
    currentLocation: values.currentLocation || undefined,
    currentGoal: values.currentGoal || undefined,
    currentAffiliation: values.currentAffiliation || undefined,
    powerState: values.powerState || undefined,
    notes: values.notes || undefined,
    tags: values.tags,
    extra: values.extra,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateCharacter(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const created = await createCharacter(payload);
      notify(t("Character created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Character) => {
    setEditItem(item);
    setEditValues(mapCharacterToForm(item));
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
      await updateCharacter(editItem.id, {
        name: editValues.name,
        alias: editValues.alias,
        level: editValues.level || undefined,
        status: editValues.status || undefined,
        isMainCharacter: editValues.isMainCharacter,
        gender: editValues.gender as Character["gender"],
        age: editValues.age === "" ? undefined : Number(editValues.age),
        race: editValues.race || undefined,
        specialAbilities: editValues.specialAbilities,
        appearance: editValues.appearance || undefined,
        height: editValues.height === "" ? undefined : Number(editValues.height),
        distinctiveTraits: editValues.distinctiveTraits,
        personalityTraits: editValues.personalityTraits,
        beliefs: editValues.beliefs,
        fears: editValues.fears,
        desires: editValues.desires,
        weaknesses: editValues.weaknesses,
        origin: editValues.origin || undefined,
        background: editValues.background || undefined,
        trauma: editValues.trauma,
        secret: editValues.secret || undefined,
        currentLocation: editValues.currentLocation || undefined,
        currentGoal: editValues.currentGoal || undefined,
        currentAffiliation: editValues.currentAffiliation || undefined,
        powerState: editValues.powerState || undefined,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
        extra: editValues.extra,
      });
      notify(t("Character updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Character) => {
    const confirmed = window.confirm(
      t("Delete this character? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteCharacter(item.id);
      notify(t("Character deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const updateExtraField = (
    state: CharacterFormState,
    key: string,
    value: unknown
  ): CharacterFormState => ({
    ...state,
    extra: {
      ...state.extra,
      [key]: value,
    },
  });

  const renderDynamicField = (
    field: SchemaField,
    value: unknown,
    onChange: (next: unknown) => void
  ) => {
    switch (field.type) {
      case "textarea":
        return (
          <TextArea
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(nextValue) => onChange(nextValue)}
            placeholder={field.placeholder}
          />
        );
      case "number":
        return (
          <TextInput
            label={field.label}
            type="number"
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(nextValue) =>
              onChange(nextValue === "" ? undefined : Number(nextValue))
            }
          />
        );
      case "select":
        return (
          <Select
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(nextValue) => onChange(nextValue)}
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: option,
            }))}
            placeholder={field.placeholder}
          />
        );
      case "multiselect":
        return (
          <MultiSelect
            label={field.label}
            values={Array.isArray(value) ? (value as string[]) : []}
            onChange={(nextValue) => onChange(nextValue)}
          />
        );
      case "boolean":
        return (
          <label className="toggle">
            <span>{field.label}</span>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => onChange(event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
          </label>
        );
      case "date":
        return (
          <TextInput
            label={field.label}
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(nextValue) => onChange(nextValue)}
          />
        );
      case "text":
      default:
        return (
          <TextInput
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(nextValue) => onChange(nextValue)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Character nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new character")}
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
            label="Gender"
            value={filters.gender}
            onChange={(value) => handleFilterChange("gender", value)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
            placeholder="All"
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange("status", value)}
            options={[
              { value: "Alive", label: "Alive" },
              { value: "Dead", label: "Dead" },
            ]}
            placeholder="All"
          />
          <TextInput
            label="Level"
            value={filters.level}
            onChange={(value) => handleFilterChange("level", value)}
          />
          <Select
            label="Race"
            value={filters.race}
            onChange={(value) => handleFilterChange("race", value)}
            options={races.map((race) => ({ value: race.name, label: race.name }))}
            placeholder="All"
          />
          <Select
            label="Special Ability"
            value={filters.specialAbility}
            onChange={(value) => handleFilterChange("specialAbility", value)}
            options={specialAbilities.map((ability) => ({
              value: ability.name,
              label: ability.name,
            }))}
            placeholder="All"
          />
          <Select
            label="Main Character"
            value={
              filters.isMainCharacter === undefined
                ? ""
                : String(filters.isMainCharacter)
            }
            onChange={(value) => handleMainCharacterFilterChange(value)}
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
        <CharacterList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
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
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit character")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Core Identity">
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
                label="Gender"
                value={editValues.gender}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, gender: value })
                }
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                required
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Age"
                type="number"
                value={editValues.age}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, age: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Race"
                value={editValues.race}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/races");
                    return;
                  }
                  setEditValues((prev) => prev && { ...prev, race: value });
                }}
                options={raceOptions}
                placeholder={races.length > 0 ? "Select" : "No races yet."}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Rank"
                value={editValues.level}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/ranks");
                    return;
                  }
                  setEditValues((prev) => prev && { ...prev, level: value });
                }}
                options={rankOptions}
                placeholder={ranks.length > 0 ? "Select" : "No ranks yet."}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={editValues.status}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, status: normalizeCharacterStatus(value) } : prev
                  )
                }
                options={[
                  { value: "Alive", label: "Alive" },
                  { value: "Dead", label: "Dead" },
                ]}
              />
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Main character")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isMainCharacter}
                  onChange={(event) =>
                    setEditValues(
                      (prev) =>
                        prev && {
                          ...prev,
                          isMainCharacter: event.target.checked,
                        }
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
            <div className="form-field--narrow">
              <Select
                label="Special Ability"
                value=""
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/special-abilities");
                    return;
                  }
                  setEditValues((prev) =>
                    prev
                      ? {
                          ...prev,
                          specialAbilities: prev.specialAbilities.includes(value)
                            ? prev.specialAbilities
                            : [...prev.specialAbilities, value],
                        }
                      : prev
                  );
                }}
                options={abilityOptions}
                placeholder={
                  specialAbilities.length > 0 ? "Select" : "No special abilities yet."
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Special Abilities"
                values={editValues.specialAbilities}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, specialAbilities: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Traits">
            <div className="form-field--wide">
              <TextInput
                label="Appearance"
                value={editValues.appearance}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, appearance: value })
                }
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Height"
                type="number"
                value={editValues.height}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, height: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Distinctive Traits"
                values={editValues.distinctiveTraits}
                onChange={(value) =>
                  setEditValues(
                    (prev) => prev && { ...prev, distinctiveTraits: value }
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Personality Traits"
                values={editValues.personalityTraits}
                onChange={(value) =>
                  setEditValues(
                    (prev) => prev && { ...prev, personalityTraits: value }
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Beliefs"
                values={editValues.beliefs}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, beliefs: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Fears"
                values={editValues.fears}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, fears: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Desires"
                values={editValues.desires}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, desires: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Weaknesses"
                values={editValues.weaknesses}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, weaknesses: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Background">
            <div className="form-field--wide">
              <TextInput
                label="Origin"
                value={editValues.origin}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, origin: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Background"
                value={editValues.background}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, background: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Trauma"
                values={editValues.trauma}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, trauma: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Secret"
                value={editValues.secret}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, secret: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Current Location"
                value={editValues.currentLocation}
                onChange={(value) =>
                  setEditValues(
                    (prev) => prev && { ...prev, currentLocation: value }
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Current Goal"
                value={editValues.currentGoal}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, currentGoal: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Current Affiliation"
                value={editValues.currentAffiliation}
                onChange={(value) =>
                  setEditValues(
                    (prev) => prev && { ...prev, currentAffiliation: value }
                  )
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Power State"
                value={editValues.powerState}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, powerState: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags">
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

          {schemaFields.length > 0 && (
            <FormSection title={schema?.title ?? "Additional Fields"}>
              {schemaFields.map((field) => (
                <div key={field.key} className="form-field--wide">
                  {renderDynamicField(
                    field,
                    editValues.extra?.[field.key],
                    (nextValue) =>
                      setEditValues((prev) =>
                        prev ? updateExtraField(prev, field.key, nextValue) : prev
                      )
                  )}
                </div>
              ))}
            </FormSection>
          )}

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
        title="Core Identity"
        description="Base profile for the character node."
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
            label="Gender"
            value={values.gender}
            onChange={(value) => setField("gender", value)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
            required
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Age"
            type="number"
            value={values.age}
            onChange={(value) => setField("age", value)}
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Race"
            value={values.race}
            onChange={(value) => {
              if (value === "__create__") {
                navigate("/races");
                return;
              }
              setField("race", value);
            }}
            options={raceOptions}
            placeholder={races.length > 0 ? "Select" : "No races yet."}
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Rank"
            value={values.level}
            onChange={(value) => {
              if (value === "__create__") {
                navigate("/ranks");
                return;
              }
              setField("level", value);
            }}
            options={rankOptions}
            placeholder={ranks.length > 0 ? "Select" : "No ranks yet."}
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Status"
            value={values.status}
            onChange={(value) => setField("status", normalizeCharacterStatus(value))}
            options={[
              { value: "Alive", label: "Alive" },
              { value: "Dead", label: "Dead" },
            ]}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Appearance"
            value={values.appearance}
            onChange={(value) => setField("appearance", value)}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Height"
            type="number"
            value={values.height}
            onChange={(value) => setField("height", value)}
          />
        </div>
        <div className="form-field--narrow">
          <label className="toggle">
            <span>{t("Main character")}</span>
            <input
              type="checkbox"
              checked={values.isMainCharacter}
              onChange={(event) =>
                setField("isMainCharacter", event.target.checked)
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
            values={values.alias}
            onChange={(value) => setField("alias", value)}
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Special Ability"
            value=""
            onChange={(value) => {
              if (value === "__create__") {
                navigate("/special-abilities");
                return;
              }
              setField(
                "specialAbilities",
                values.specialAbilities.includes(value)
                  ? values.specialAbilities
                  : [...values.specialAbilities, value]
              );
            }}
            options={abilityOptions}
            placeholder={
              specialAbilities.length > 0 ? "Select" : "No special abilities yet."
            }
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Special Abilities"
            values={values.specialAbilities}
            onChange={(value) => setField("specialAbilities", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Traits" description="Personality and inner layers.">
        <div className="form-field--wide">
          <MultiSelect
            label="Distinctive Traits"
            values={values.distinctiveTraits}
            onChange={(value) => setField("distinctiveTraits", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Personality Traits"
            values={values.personalityTraits}
            onChange={(value) => setField("personalityTraits", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Beliefs"
            values={values.beliefs}
            onChange={(value) => setField("beliefs", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Fears"
            values={values.fears}
            onChange={(value) => setField("fears", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Desires"
            values={values.desires}
            onChange={(value) => setField("desires", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Weaknesses"
            values={values.weaknesses}
            onChange={(value) => setField("weaknesses", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Trauma"
            values={values.trauma}
            onChange={(value) => setField("trauma", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Secret"
            value={values.secret}
            onChange={(value) => setField("secret", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Origin Story" description="Narrative background and origins.">
        <div className="form-field--wide">
          <TextInput
            label="Origin"
            value={values.origin}
            onChange={(value) => setField("origin", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextArea
            label="Background"
            value={values.background}
            onChange={(value) => setField("background", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Current State" description="Present status in the story world.">
        <div className="form-field--wide">
          <TextInput
            label="Current Location"
            value={values.currentLocation}
            onChange={(value) => setField("currentLocation", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Current Goal"
            value={values.currentGoal}
            onChange={(value) => setField("currentGoal", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Current Affiliation"
            value={values.currentAffiliation}
            onChange={(value) => setField("currentAffiliation", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Power State"
            value={values.powerState}
            onChange={(value) => setField("powerState", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Notes & Tags" description="Extra context and indexing.">
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

      {schemaFields.length > 0 && (
        <FormSection title={schema?.title ?? "Additional Fields"}>
          {schemaFields.map((field) => (
            <div key={field.key} className="form-field--wide">
              {renderDynamicField(field, values.extra?.[field.key], (nextValue) =>
                setField("extra", { ...values.extra, [field.key]: nextValue })
              )}
            </div>
          ))}
        </FormSection>
      )}

          <div className="card">
            <Button onClick={handleSubmit} variant="primary">
              Create character
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
