import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import {
  createTimeline,
  getAllTimelines,
  linkTimeline,
  relinkTimeline,
  unlinkTimeline,
} from "./timeline.api";
import { TimelineList } from "./TimelineList";
import { validateTimeline, validateTimelineLink } from "./timeline.schema";
import type { Timeline, TimelineLinkPayload, TimelinePayload } from "./timeline.types";

const initialState = {
  name: "",
  code: "",
  startYear: "",
  endYear: "",
  isOngoing: false,
  summary: "",
  description: "",
  characteristics: [] as string[],
  dominantForces: [] as string[],
  technologyLevel: "",
  powerEnvironment: "",
  worldState: "",
  majorChanges: [] as string[],
  notes: "",
  tags: [] as string[],
  previousId: "",
  nextId: "",
};

type TimelineFormState = typeof initialState;

const initialLinkState = {
  currentId: "",
  previousId: "",
  nextId: "",
};

type LinkFormState = typeof initialLinkState;

export const TimelineCreate = () => {
  const { values, setField, reset } = useForm<TimelineFormState>(initialState);
  const [items, setItems] = useState<Timeline[]>([]);
  const [selected, setSelected] = useState<Timeline | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkValues, setLinkValues] = useState<LinkFormState>(initialLinkState);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const loadItems = useCallback(async (selectId?: string) => {
    setLoading(true);
    setListError(null);
    try {
      const data = await getAllTimelines();
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
  }, [getAllTimelines]);

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

  const buildPayload = (): TimelinePayload => ({
    name: values.name,
    code: values.code || undefined,
    startYear: values.startYear === "" ? Number.NaN : Number(values.startYear),
    endYear: values.endYear === "" ? Number.NaN : Number(values.endYear),
    isOngoing: values.isOngoing,
    summary: values.summary || undefined,
    description: values.description || undefined,
    characteristics: values.characteristics,
    dominantForces: values.dominantForces,
    technologyLevel: values.technologyLevel || undefined,
    powerEnvironment: values.powerEnvironment || undefined,
    worldState: values.worldState || undefined,
    majorChanges: values.majorChanges,
    notes: values.notes || undefined,
    tags: values.tags,
    previousId: values.previousId || undefined,
    nextId: values.nextId || undefined,
  });

  const handleSubmit = async () => {
    setStatus(null);
    setError(null);
    const payload = buildPayload();
    const validation = validateTimeline(payload);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    try {
      const created = await createTimeline(payload);
      setStatus("Timeline created successfully.");
      reset();
      setShowForm(false);
      await loadItems(created.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLinkAction = async (
    action: (payload: TimelineLinkPayload) => Promise<{ message: string }>,
    label: string,
  ) => {
    setLinkMessage(null);
    setLinkError(null);
    const payload: TimelineLinkPayload = {
      currentId: linkValues.currentId,
      previousId: linkValues.previousId || undefined,
      nextId: linkValues.nextId || undefined,
    };
    const validation = validateTimelineLink(payload);
    if (!validation.valid) {
      setLinkError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    try {
      const response = await action(payload);
      setLinkMessage(`${label}: ${response.message}`);
    } catch (err) {
      setLinkError((err as Error).message);
    }
  };

  return (
    <div>
      <div className="page-toolbar">
        <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
          {showForm ? "Close form" : "Create new timeline"}
        </Button>
        <Button onClick={() => loadItems()} variant="ghost" disabled={loading}>
          {loading ? "Refreshing..." : "Refresh list"}
        </Button>
      </div>

      <div className="content-grid">
        <div className="card">
          <h3 className="section-title">Timeline nodes</h3>
          <p className="header__subtitle">Click a row to inspect details.</p>
          {listError && <ErrorMessage message={listError} />}
          {!listError && (
            <TimelineList
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
              <dt>Start</dt>
              <dd>{selected.startYear ?? "-"}</dd>
              <dt>End</dt>
              <dd>{selected.endYear ?? "-"}</dd>
              <dt>Ongoing</dt>
              <dd>{selected.isOngoing ? "Yes" : "No"}</dd>
              <dt>Summary</dt>
              <dd>{selected.summary ?? "-"}</dd>
              <dt>Tags</dt>
              <dd>{renderPills(selected.tags)}</dd>
            </dl>
          ) : (
            <p className="header__subtitle">Select a timeline to see details.</p>
          )}
        </div>
      </div>

      {showForm && (
        <>
      <FormSection title="Timeline Setup" description="Define the era and its scope.">
        <TextInput
          label="Name"
          value={values.name}
          onChange={(value) => setField("name", value)}
          required
        />
        <TextInput label="Code" value={values.code} onChange={(value) => setField("code", value)} />
        <TextInput
          label="Start Year"
          type="number"
          value={values.startYear}
          onChange={(value) => setField("startYear", value)}
          required
        />
        <TextInput
          label="End Year"
          type="number"
          value={values.endYear}
          onChange={(value) => setField("endYear", value)}
          required
        />
        <label className="form-field">
          <span>Ongoing era</span>
          <input
            type="checkbox"
            checked={values.isOngoing}
            onChange={(event) => setField("isOngoing", event.target.checked)}
          />
        </label>
        <TextInput
          label="Technology Level"
          value={values.technologyLevel}
          onChange={(value) => setField("technologyLevel", value)}
        />
        <TextInput
          label="Power Environment"
          value={values.powerEnvironment}
          onChange={(value) => setField("powerEnvironment", value)}
        />
        <TextInput
          label="World State"
          value={values.worldState}
          onChange={(value) => setField("worldState", value)}
        />
        <MultiSelect
          label="Characteristics"
          values={values.characteristics}
          onChange={(value) => setField("characteristics", value)}
        />
        <MultiSelect
          label="Dominant Forces"
          values={values.dominantForces}
          onChange={(value) => setField("dominantForces", value)}
        />
        <MultiSelect
          label="Major Changes"
          values={values.majorChanges}
          onChange={(value) => setField("majorChanges", value)}
        />
      </FormSection>

      <FormSection title="Narrative" description="Short summary and detailed description.">
        <TextArea
          label="Summary"
          value={values.summary}
          onChange={(value) => setField("summary", value)}
        />
        <TextArea
          label="Description"
          value={values.description}
          onChange={(value) => setField("description", value)}
        />
        <TextArea label="Notes" value={values.notes} onChange={(value) => setField("notes", value)} />
        <MultiSelect label="Tags" values={values.tags} onChange={(value) => setField("tags", value)} />
      </FormSection>

      <FormSection title="Linking" description="Attach previous or next timelines when creating.">
        <TextInput
          label="Previous Timeline ID"
          value={values.previousId}
          onChange={(value) => setField("previousId", value)}
        />
        <TextInput
          label="Next Timeline ID"
          value={values.nextId}
          onChange={(value) => setField("nextId", value)}
        />
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} variant="primary">
          Create timeline
        </Button>
        {status && <p className="notice">{status}</p>}
        {error && <ErrorMessage message={error} />}
      </div>
        </>
      )}

      <FormSection
        title="Link / Unlink / Relink"
        description="Update relationships between existing timelines."
      >
        <TextInput
          label="Current Timeline ID"
          value={linkValues.currentId}
          onChange={(value) => setLinkValues((prev) => ({ ...prev, currentId: value }))}
          required
        />
        <TextInput
          label="Previous Timeline ID"
          value={linkValues.previousId}
          onChange={(value) => setLinkValues((prev) => ({ ...prev, previousId: value }))}
        />
        <TextInput
          label="Next Timeline ID"
          value={linkValues.nextId}
          onChange={(value) => setLinkValues((prev) => ({ ...prev, nextId: value }))}
        />
      </FormSection>

      <div className="card" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <Button
          variant="ghost"
          onClick={() => handleLinkAction(linkTimeline, "Linked")}
        >
          Link timeline
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleLinkAction(unlinkTimeline, "Unlinked")}
        >
          Unlink timeline
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleLinkAction(relinkTimeline, "Relinked")}
        >
          Relink timeline
        </Button>
        {linkMessage && <p className="notice">{linkMessage}</p>}
        {linkError && <ErrorMessage message={linkError} />}
      </div>

    </div>
  );
};
