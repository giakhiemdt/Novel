import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
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
  getAllCharacters,
  updateCharacter,
} from "./character.api";
import { getAllRaces } from "../race/race.api";
import { CharacterList } from "./CharacterList";
import { validateCharacter } from "./character.schema";
import type { Character, CharacterPayload } from "./character.types";
import type { Race } from "../race/race.types";

const initialState = {
  name: "",
  alias: [] as string[],
  soulArt: [] as string[],
  level: "",
  status: "",
  isMainCharacter: false,
  gender: "",
  age: "",
  race: "",
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
};

type CharacterFormState = typeof initialState;

export const CharacterCreate = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { values, setField, reset } = useForm<CharacterFormState>(initialState);
  const [items, setItems] = useState<Character[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Character | null>(null);
  const [editValues, setEditValues] = useState<CharacterFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllCharacters]);

  const loadRaces = useCallback(async () => {
    try {
      const data = await getAllRaces();
      setRaces(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRaces]);

  useEffect(() => {
    void loadItems();
    void loadRaces();
  }, [loadItems, loadRaces]);

  useProjectChange(() => {
    void loadItems();
    void loadRaces();
  });

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

  const mapCharacterToForm = (item: Character): CharacterFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    soulArt: item.soulArt ?? [],
    level: item.level ?? "",
    status: item.status ?? "",
    isMainCharacter: item.isMainCharacter ?? false,
    gender: item.gender ?? "",
    age: item.age !== undefined ? String(item.age) : "",
    race: item.race ?? "",
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
  });

  const buildPayload = (): CharacterPayload => ({
    name: values.name,
    alias: values.alias,
    soulArt: values.soulArt,
    level: values.level as CharacterPayload["level"],
    status: values.status as CharacterPayload["status"],
    isMainCharacter: values.isMainCharacter,
    gender: values.gender as CharacterPayload["gender"],
    age: values.age === "" ? Number.NaN : Number(values.age),
    race: values.race as CharacterPayload["race"],
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
      await loadItems();
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
        soulArt: editValues.soulArt,
        level: editValues.level || undefined,
        status: editValues.status || undefined,
        isMainCharacter: editValues.isMainCharacter,
        gender: editValues.gender as Character["gender"],
        age: editValues.age === "" ? Number.NaN : Number(editValues.age),
        race: editValues.race as Character["race"],
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
      });
      notify(t("Character updated successfully."), "success");
      await loadItems();
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
            <h3 className="section-title">{t("Character nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new character")}
          </Button>
        </div>
        <CharacterList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
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
                required
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
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Level"
                value={editValues.level}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, level: value })
                }
                options={["T1", "T2", "T3", "T4", "T5", "T6", "T7"].map(
                  (value) => ({ value, label: value })
                )}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={editValues.status}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, status: value })
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
            <div className="form-field--wide">
              <MultiSelect
                label="Soul Art"
                values={editValues.soulArt}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, soulArt: value })
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
            required
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
            required
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Level"
            value={values.level}
            onChange={(value) => setField("level", value)}
            options={["T1", "T2", "T3", "T4", "T5", "T6", "T7"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </div>
        <div className="form-field--narrow">
          <Select
            label="Status"
            value={values.status}
            onChange={(value) => setField("status", value)}
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
        <div className="form-field--wide">
          <MultiSelect
            label="Soul Art"
            values={values.soulArt}
            onChange={(value) => setField("soulArt", value)}
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
