import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { createLocation, getAllLocations } from "./location.api";
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
  const [selected, setSelected] = useState<Location | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (selectId?: string) => {
    setLoading(true);
    setListError(null);
    try {
      const data = await getAllLocations();
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
  }, [getAllLocations]);

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
      setStatus("Location created successfully.");
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
          {showForm ? "Close form" : "Create new location"}
        </Button>
        <Button onClick={() => loadItems()} variant="ghost" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh list"}
        </Button>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 className="section-title">Location nodes</h3>
          <p className="header__subtitle">Click a row to inspect details.</p>
          {listError && <ErrorMessage message={listError} />}
          {!listError && (
            <LocationList
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
              <dt>Category</dt>
              <dd>{selected.category ?? "-"}</dd>
              <dt>Habitable</dt>
              <dd>{selected.isHabitable ? "Yes" : "No"}</dd>
              <dt>Secret</dt>
              <dd>{selected.isSecret ? "Yes" : "No"}</dd>
              <dt>Terrain</dt>
              <dd>{selected.terrain ?? "-"}</dd>
              <dt>Climate</dt>
              <dd>{selected.climate ?? "-"}</dd>
              <dt>Tags</dt>
              <dd>{renderPills(selected.tags)}</dd>
            </dl>
          ) : (
            <p className="header__subtitle">Select a location to see details.</p>
          )}
        </div>
      </div>

      {showForm && (
        <>
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
        </>
      )}
    </div>
  );
};
