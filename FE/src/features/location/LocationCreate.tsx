import { useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { createLocation } from "./location.api";
import { LocationList } from "./LocationList";
import { validateLocation } from "./location.schema";
import type { Location, LocationPayload } from "./location.types";

const initialState = {
  name: "",
  alias: [] as string[],
  type: "",
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

export const LocationCreate = () => {
  const { values, setField, reset } = useForm<LocationFormState>(initialState);
  const [items, setItems] = useState<Location[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildPayload = (): LocationPayload => ({
    name: values.name,
    alias: values.alias,
    type: values.type || undefined,
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
    setStatus(null);
    setError(null);
    const payload = buildPayload();
    const validation = validateLocation(payload);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    try {
      const created = await createLocation(payload);
      setItems((prev) => [created, ...prev]);
      setStatus("Location created successfully.");
      reset();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <FormSection title="Location Identity" description="Describe the place and its origin.">
        <TextInput
          label="Name"
          value={values.name}
          onChange={(value) => setField("name", value)}
          required
        />
        <TextInput label="Type" value={values.type} onChange={(value) => setField("type", value)} />
        <TextInput
          label="Category"
          value={values.category}
          onChange={(value) => setField("category", value)}
        />
        <label className="form-field">
          <span>Habitable</span>
          <input
            type="checkbox"
            checked={values.isHabitable}
            onChange={(event) => setField("isHabitable", event.target.checked)}
          />
        </label>
        <label className="form-field">
          <span>Secret</span>
          <input
            type="checkbox"
            checked={values.isSecret}
            onChange={(event) => setField("isSecret", event.target.checked)}
          />
        </label>
        <MultiSelect label="Alias" values={values.alias} onChange={(value) => setField("alias", value)} />
      </FormSection>

      <FormSection title="Environment" description="Physical and mystical characteristics.">
        <TextInput label="Terrain" value={values.terrain} onChange={(value) => setField("terrain", value)} />
        <TextInput label="Climate" value={values.climate} onChange={(value) => setField("climate", value)} />
        <TextInput
          label="Environment"
          value={values.environment}
          onChange={(value) => setField("environment", value)}
        />
        <TextInput
          label="Power Density"
          value={values.powerDensity}
          onChange={(value) => setField("powerDensity", value)}
        />
        <TextInput
          label="Danger Level"
          type="number"
          value={values.dangerLevel}
          onChange={(value) => setField("dangerLevel", value)}
        />
        <MultiSelect
          label="Natural Resources"
          values={values.naturalResources}
          onChange={(value) => setField("naturalResources", value)}
        />
        <MultiSelect
          label="Anomalies"
          values={values.anomalies}
          onChange={(value) => setField("anomalies", value)}
        />
        <MultiSelect
          label="Restrictions"
          values={values.restrictions}
          onChange={(value) => setField("restrictions", value)}
        />
      </FormSection>

      <FormSection title="History" description="Legends and present state.">
        <TextArea
          label="Historical Summary"
          value={values.historicalSummary}
          onChange={(value) => setField("historicalSummary", value)}
        />
        <TextArea label="Legend" value={values.legend} onChange={(value) => setField("legend", value)} />
        <TextInput
          label="Ruins Origin"
          value={values.ruinsOrigin}
          onChange={(value) => setField("ruinsOrigin", value)}
        />
        <TextInput
          label="Current Status"
          value={values.currentStatus}
          onChange={(value) => setField("currentStatus", value)}
        />
        <TextInput
          label="Controlled By"
          value={values.controlledBy}
          onChange={(value) => setField("controlledBy", value)}
        />
        <TextInput
          label="Population Note"
          value={values.populationNote}
          onChange={(value) => setField("populationNote", value)}
        />
      </FormSection>

      <FormSection title="Notes & Tags" description="Add extra tracking fields.">
        <TextArea label="Notes" value={values.notes} onChange={(value) => setField("notes", value)} />
        <MultiSelect label="Tags" values={values.tags} onChange={(value) => setField("tags", value)} />
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} variant="primary">
          Create location
        </Button>
        {status && <p className="notice">{status}</p>}
        {error && <ErrorMessage message={error} />}
      </div>

      <div className="card">
        <h3 className="section-title">Recently created</h3>
        <LocationList items={items} />
      </div>
    </div>
  );
};
