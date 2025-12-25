import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { createFaction, getAllFactions } from "./faction.api";
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
  const [selected, setSelected] = useState<Faction | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (selectId?: string) => {
    setLoading(true);
    setListError(null);
    try {
      const data = await getAllFactions();
      setItems(data ?? []);
      if (!data || data.length === 0) {
        setSelected(null);
        return;
      }
      if (selectId) {
        const match = data.find((item) => item.id === selectId);
        setSelected(match ?? data[0]);
        return;
      }
      setSelected((prev) => {
        if (!prev) {
          return data[0];
        }
        return data.find((item) => item.id === prev.id) ?? data[0];
      });
    } catch (err) {
      setListError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getAllFactions]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const renderPills = (values?: string[]) => {
    if (!values || values.length === 0) {
      return <span className="header__subtitle">-</span>;
    }
    return (
      <div className="pill-list">
        {values.map((value) => (
          <span className="pill" key={value}>
            {value}
          </span>
        ))}
      </div>
    );
  };

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
      setStatus("Faction created successfully.");
      reset();
      setShowForm(false);
      await loadItems(created.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-toolbar">
        <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
          {showForm ? "Close form" : "Create new faction"}
        </Button>
        <Button onClick={() => loadItems()} variant="ghost" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh list"}
        </Button>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 className="section-title">Faction nodes</h3>
          <p className="header__subtitle">Click a row to inspect details.</p>
          {listError && <ErrorMessage message={listError} />}
          {!listError && (
            <FactionList
              items={items}
              selectedId={selected?.id}
              onSelect={setSelected}
            />
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Details</h3>
          {selected ? (
            <dl className="detail-list">
              <dt>Name</dt>
              <dd>{selected.name}</dd>
              <dt>ID</dt>
              <dd>{selected.id ?? "-"}</dd>
              <dt>Type</dt>
              <dd>{selected.type ?? "-"}</dd>
              <dt>Alignment</dt>
              <dd>{selected.alignment ?? "-"}</dd>
              <dt>Power Level</dt>
              <dd>{selected.powerLevel ?? "-"}</dd>
              <dt>Public</dt>
              <dd>{selected.isPublic ? "Yes" : "No"}</dd>
              <dt>Canon</dt>
              <dd>{selected.isCanon ? "Yes" : "No"}</dd>
              <dt>Tags</dt>
              <dd>{renderPills(selected.tags)}</dd>
            </dl>
          ) : (
            <p className="header__subtitle">Select a faction to see details.</p>
          )}
        </div>
      </div>

      {showForm && (
        <>
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
        </>
      )}
    </div>
  );
};
