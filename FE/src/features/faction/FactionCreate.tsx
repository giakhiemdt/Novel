import { useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { createFaction } from "./faction.api";
import { FactionList } from "./FactionList";
import { validateFaction } from "./faction.schema";
import type { Faction, FactionPayload } from "./faction.types";

const initialState = {
  name: "",
  alias: [] as string[],
  type: "",
  alignment: "",
  isPublic: false,
  isCanon: false,
  ideology: "",
  goal: "",
  doctrine: "",
  taboos: [] as string[],
  powerLevel: "",
  influenceScope: "",
  militaryPower: "",
  specialAssets: [] as string[],
  leadershipType: "",
  leaderTitle: "",
  hierarchyNote: "",
  memberPolicy: "",
  foundingStory: "",
  ageEstimate: "",
  majorConflicts: [] as string[],
  reputation: "",
  currentStatus: "",
  currentStrategy: "",
  knownEnemies: [] as string[],
  knownAllies: [] as string[],
  notes: "",
  tags: [] as string[],
};

type FactionFormState = typeof initialState;

export const FactionCreate = () => {
  const { values, setField, reset } = useForm<FactionFormState>(initialState);
  const [items, setItems] = useState<Faction[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildPayload = (): FactionPayload => ({
    name: values.name,
    alias: values.alias,
    type: values.type || undefined,
    alignment: values.alignment || undefined,
    isPublic: values.isPublic,
    isCanon: values.isCanon,
    ideology: values.ideology || undefined,
    goal: values.goal || undefined,
    doctrine: values.doctrine || undefined,
    taboos: values.taboos,
    powerLevel: values.powerLevel === "" ? undefined : Number(values.powerLevel),
    influenceScope: values.influenceScope || undefined,
    militaryPower: values.militaryPower || undefined,
    specialAssets: values.specialAssets,
    leadershipType: values.leadershipType || undefined,
    leaderTitle: values.leaderTitle || undefined,
    hierarchyNote: values.hierarchyNote || undefined,
    memberPolicy: values.memberPolicy || undefined,
    foundingStory: values.foundingStory || undefined,
    ageEstimate: values.ageEstimate || undefined,
    majorConflicts: values.majorConflicts,
    reputation: values.reputation || undefined,
    currentStatus: values.currentStatus || undefined,
    currentStrategy: values.currentStrategy || undefined,
    knownEnemies: values.knownEnemies,
    knownAllies: values.knownAllies,
    notes: values.notes || undefined,
    tags: values.tags,
  });

  const handleSubmit = async () => {
    setStatus(null);
    setError(null);
    const payload = buildPayload();
    const validation = validateFaction(payload);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    try {
      const created = await createFaction(payload);
      setItems((prev) => [created, ...prev]);
      setStatus("Faction created successfully.");
      reset();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <FormSection title="Faction Identity" description="Core public info and alignment.">
        <TextInput
          label="Name"
          value={values.name}
          onChange={(value) => setField("name", value)}
          required
        />
        <TextInput label="Type" value={values.type} onChange={(value) => setField("type", value)} />
        <TextInput
          label="Alignment"
          value={values.alignment}
          onChange={(value) => setField("alignment", value)}
        />
        <label className="form-field">
          <span>Public</span>
          <input
            type="checkbox"
            checked={values.isPublic}
            onChange={(event) => setField("isPublic", event.target.checked)}
          />
        </label>
        <label className="form-field">
          <span>Canon</span>
          <input
            type="checkbox"
            checked={values.isCanon}
            onChange={(event) => setField("isCanon", event.target.checked)}
          />
        </label>
        <MultiSelect label="Alias" values={values.alias} onChange={(value) => setField("alias", value)} />
      </FormSection>

      <FormSection title="Belief System" description="Doctrine and ideology details.">
        <TextInput label="Ideology" value={values.ideology} onChange={(value) => setField("ideology", value)} />
        <TextInput label="Goal" value={values.goal} onChange={(value) => setField("goal", value)} />
        <TextInput label="Doctrine" value={values.doctrine} onChange={(value) => setField("doctrine", value)} />
        <MultiSelect label="Taboos" values={values.taboos} onChange={(value) => setField("taboos", value)} />
        <TextInput
          label="Founding Story"
          value={values.foundingStory}
          onChange={(value) => setField("foundingStory", value)}
        />
        <TextInput
          label="Age Estimate"
          value={values.ageEstimate}
          onChange={(value) => setField("ageEstimate", value)}
        />
      </FormSection>

      <FormSection title="Power & Influence" description="How the faction shapes the world.">
        <TextInput
          label="Power Level"
          type="number"
          value={values.powerLevel}
          onChange={(value) => setField("powerLevel", value)}
        />
        <TextInput
          label="Influence Scope"
          value={values.influenceScope}
          onChange={(value) => setField("influenceScope", value)}
        />
        <TextInput
          label="Military Power"
          value={values.militaryPower}
          onChange={(value) => setField("militaryPower", value)}
        />
        <MultiSelect
          label="Special Assets"
          values={values.specialAssets}
          onChange={(value) => setField("specialAssets", value)}
        />
        <MultiSelect
          label="Major Conflicts"
          values={values.majorConflicts}
          onChange={(value) => setField("majorConflicts", value)}
        />
        <TextInput
          label="Reputation"
          value={values.reputation}
          onChange={(value) => setField("reputation", value)}
        />
      </FormSection>

      <FormSection title="Leadership" description="Hierarchy and member policies.">
        <TextInput
          label="Leadership Type"
          value={values.leadershipType}
          onChange={(value) => setField("leadershipType", value)}
        />
        <TextInput
          label="Leader Title"
          value={values.leaderTitle}
          onChange={(value) => setField("leaderTitle", value)}
        />
        <TextInput
          label="Hierarchy Note"
          value={values.hierarchyNote}
          onChange={(value) => setField("hierarchyNote", value)}
        />
        <TextInput
          label="Member Policy"
          value={values.memberPolicy}
          onChange={(value) => setField("memberPolicy", value)}
        />
      </FormSection>

      <FormSection title="Current Status" description="Relations and current strategy.">
        <TextInput
          label="Current Status"
          value={values.currentStatus}
          onChange={(value) => setField("currentStatus", value)}
        />
        <TextInput
          label="Current Strategy"
          value={values.currentStrategy}
          onChange={(value) => setField("currentStrategy", value)}
        />
        <MultiSelect
          label="Known Enemies"
          values={values.knownEnemies}
          onChange={(value) => setField("knownEnemies", value)}
        />
        <MultiSelect
          label="Known Allies"
          values={values.knownAllies}
          onChange={(value) => setField("knownAllies", value)}
        />
      </FormSection>

      <FormSection title="Notes & Tags" description="Extra context for the archive.">
        <TextArea label="Notes" value={values.notes} onChange={(value) => setField("notes", value)} />
        <MultiSelect label="Tags" values={values.tags} onChange={(value) => setField("tags", value)} />
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} variant="primary">
          Create faction
        </Button>
        {status && <p className="notice">{status}</p>}
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="card">
        <h3 className="section-title">Recently created</h3>
        <FactionList items={items} />
      </div>
    </div>
  );
};
