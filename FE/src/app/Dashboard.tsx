import { useEffect, useState } from "react";
import { Button } from "../components/common/Button";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { FormSection } from "../components/form/FormSection";
import { MultiSelect } from "../components/form/MultiSelect";
import { TextArea } from "../components/form/TextArea";
import { TextInput } from "../components/form/TextInput";
import { useForm } from "../hooks/useForm";
import { validateRequired } from "../utils/validation";
import {
  createOverview,
  getOverview,
  updateOverview,
} from "../features/overview/overview.api";
import type { OverviewNode, OverviewPayload } from "../features/overview/overview.types";

export const Dashboard = () => {
  const { values, setField, setValues } = useForm({
    title: "",
    subtitle: "",
    genre: [] as string[],
    shortSummary: "",
    worldOverview: "",
    technologyEra: "",
  });
  const [overview, setOverview] = useState<OverviewNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverview();
      setOverview(data);
      if (data) {
        setValues({
          title: data.title ?? "",
          subtitle: data.subtitle ?? "",
          genre: data.genre ?? [],
          shortSummary: data.shortSummary ?? "",
          worldOverview: data.worldOverview ?? "",
          technologyEra: data.technologyEra ?? "",
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const buildPayload = (): OverviewPayload => ({
    title: values.title,
    subtitle: values.subtitle || undefined,
    genre: values.genre,
    shortSummary: values.shortSummary || undefined,
    worldOverview: values.worldOverview || undefined,
    technologyEra: values.technologyEra || undefined,
  });

  const handleSave = async () => {
    setStatus(null);
    setError(null);
    const payload = buildPayload();
    const validation = validateRequired(payload, ["title"]);
    if (!validation.valid) {
      setError(`Missing required fields: ${validation.missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const saved = overview
        ? await updateOverview(payload)
        : await createOverview(payload);
      setOverview(saved);
      setStatus(overview ? "Overview updated." : "Overview created.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overview-page">
      {error && <ErrorMessage message={error} />}
      {status && <div className="notice">{status}</div>}

      <FormSection
        title="Core details"
        description="This content fills the overview page."
      >
        <TextInput
          label="Title"
          value={values.title}
          onChange={(value) => setField("title", value)}
          required
        />
        <TextInput
          label="Subtitle"
          value={values.subtitle}
          onChange={(value) => setField("subtitle", value)}
        />
        <TextInput
          label="Technology Era"
          value={values.technologyEra}
          onChange={(value) => setField("technologyEra", value)}
        />
        <MultiSelect
          label="Genre"
          values={values.genre}
          onChange={(value) => setField("genre", value)}
        />
        <TextArea
          label="Short Summary"
          value={values.shortSummary}
          onChange={(value) => setField("shortSummary", value)}
          placeholder="Quick summary for readers"
        />
        <TextArea
          label="World Overview"
          value={values.worldOverview}
          onChange={(value) => setField("worldOverview", value)}
          placeholder="Broader context and setting details"
        />
      </FormSection>

      <div className="overview-actions">
        {!overview && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Creating..." : "Create overview"}
          </Button>
        )}
        {overview && (
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Update overview"}
          </Button>
        )}
      </div>
    </div>
  );
};
