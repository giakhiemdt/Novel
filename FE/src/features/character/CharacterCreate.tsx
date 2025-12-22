import { useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { createCharacter } from "./character.api";
import { CharacterList } from "./CharacterList";
import { validateCharacter } from "./character.schema";
import type { Character, CharacterPayload } from "./character.types";

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
  const { values, setField, reset } = useForm<CharacterFormState>(initialState);
  const [items, setItems] = useState<Character[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setStatus(null);
    setError(null);
    const payload = buildPayload();
    const validation = validateCharacter(payload);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    try {
      const created = await createCharacter(payload);
      setItems((prev) => [created, ...prev]);
      setStatus("Character created successfully.");
      reset();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <FormSection
        title="Core Identity"
        description="Base profile for the character node."
      >
        <TextInput
          label="Name"
          value={values.name}
          onChange={(value) => setField("name", value)}
          required
        />
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
        <TextInput
          label="Age"
          type="number"
          value={values.age}
          onChange={(value) => setField("age", value)}
          required
        />
        <Select
          label="Race"
          value={values.race}
          onChange={(value) => setField("race", value)}
          options={[
            { value: "human", label: "Human" },
            { value: "elf", label: "Elf" },
            { value: "demon", label: "Demon" },
          ]}
          required
        />
        <Select
          label="Level"
          value={values.level}
          onChange={(value) => setField("level", value)}
          options={["T1", "T2", "T3", "T4", "T5", "T6", "T7"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Select
          label="Status"
          value={values.status}
          onChange={(value) => setField("status", value)}
          options={[
            { value: "Alive", label: "Alive" },
            { value: "Dead", label: "Dead" },
          ]}
        />
        <TextInput
          label="Appearance"
          value={values.appearance}
          onChange={(value) => setField("appearance", value)}
        />
        <TextInput
          label="Height"
          type="number"
          value={values.height}
          onChange={(value) => setField("height", value)}
        />
        <label className="form-field">
          <span>Main character</span>
          <input
            type="checkbox"
            checked={values.isMainCharacter}
            onChange={(event) => setField("isMainCharacter", event.target.checked)}
          />
        </label>
        <MultiSelect
          label="Alias"
          values={values.alias}
          onChange={(value) => setField("alias", value)}
        />
        <MultiSelect
          label="Soul Art"
          values={values.soulArt}
          onChange={(value) => setField("soulArt", value)}
        />
      </FormSection>

      <FormSection title="Traits" description="Personality and inner layers.">
        <MultiSelect
          label="Distinctive Traits"
          values={values.distinctiveTraits}
          onChange={(value) => setField("distinctiveTraits", value)}
        />
        <MultiSelect
          label="Personality Traits"
          values={values.personalityTraits}
          onChange={(value) => setField("personalityTraits", value)}
        />
        <MultiSelect label="Beliefs" values={values.beliefs} onChange={(value) => setField("beliefs", value)} />
        <MultiSelect label="Fears" values={values.fears} onChange={(value) => setField("fears", value)} />
        <MultiSelect label="Desires" values={values.desires} onChange={(value) => setField("desires", value)} />
        <MultiSelect
          label="Weaknesses"
          values={values.weaknesses}
          onChange={(value) => setField("weaknesses", value)}
        />
        <MultiSelect label="Trauma" values={values.trauma} onChange={(value) => setField("trauma", value)} />
        <TextInput label="Secret" value={values.secret} onChange={(value) => setField("secret", value)} />
      </FormSection>

      <FormSection title="Origin Story" description="Narrative background and origins.">
        <TextInput label="Origin" value={values.origin} onChange={(value) => setField("origin", value)} />
        <TextArea
          label="Background"
          value={values.background}
          onChange={(value) => setField("background", value)}
        />
      </FormSection>

      <FormSection title="Current State" description="Present status in the story world.">
        <TextInput
          label="Current Location"
          value={values.currentLocation}
          onChange={(value) => setField("currentLocation", value)}
        />
        <TextInput
          label="Current Goal"
          value={values.currentGoal}
          onChange={(value) => setField("currentGoal", value)}
        />
        <TextInput
          label="Current Affiliation"
          value={values.currentAffiliation}
          onChange={(value) => setField("currentAffiliation", value)}
        />
        <TextInput
          label="Power State"
          value={values.powerState}
          onChange={(value) => setField("powerState", value)}
        />
      </FormSection>

      <FormSection title="Notes & Tags" description="Extra context and indexing.">
        <TextArea label="Notes" value={values.notes} onChange={(value) => setField("notes", value)} />
        <MultiSelect label="Tags" values={values.tags} onChange={(value) => setField("tags", value)} />
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} variant="primary">
          Create character
        </Button>
        {status && <p className="notice">{status}</p>}
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="card">
        <h3 className="section-title">Recently created</h3>
        <CharacterList items={items} />
      </div>
    </div>
  );
};
