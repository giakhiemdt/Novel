import { useEffect, useState } from "react";
import { Button } from "../components/common/Button";
import { useToast } from "../components/common/Toast";
import { FormSection } from "../components/form/FormSection";
import { MultiSelect } from "../components/form/MultiSelect";
import { TextArea } from "../components/form/TextArea";
import { TextInput } from "../components/form/TextInput";
import { useForm } from "../hooks/useForm";
import { useProjectChange } from "../hooks/useProjectChange";
import { useI18n } from "../i18n/I18nProvider";
import { validateRequired } from "../utils/validation";
import {
  createOverview,
  getOverview,
  updateOverview,
} from "../features/overview/overview.api";
import type { OverviewNode, OverviewPayload } from "../features/overview/overview.types";

export const Dashboard = () => {
  const { t } = useI18n();
  const { notify } = useToast();
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

  const loadOverview = async () => {
    setLoading(true);
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
      notify((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useProjectChange(() => {
    void loadOverview();
  });

  const buildPayload = (): OverviewPayload => ({
    title: values.title,
    subtitle: values.subtitle || undefined,
    genre: values.genre,
    shortSummary: values.shortSummary || undefined,
    worldOverview: values.worldOverview || undefined,
    technologyEra: values.technologyEra || undefined,
  });

  const handleSave = async () => {
    const payload = buildPayload();
    const validation = validateRequired(payload, ["title"]);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      const saved = overview
        ? await updateOverview(payload)
        : await createOverview(payload);
      setOverview(saved);
      notify(
        overview ? t("Overview updated.") : t("Overview created."),
        "success"
      );
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overview-page">
      <div className="overview-layout">
        <section className="card overview-card">
          <div className="overview-header">
            <div>
              <h3 className="section-title">{t("Core details")}</h3>
              <p className="header__subtitle">
                {t("This content fills the overview page.")}
              </p>
            </div>
            <div className="overview-actions">
              {!overview && (
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? t("Creating...") : t("Create overview")}
                </Button>
              )}
              {overview && (
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? t("Saving...") : t("Update overview")}
                </Button>
              )}
            </div>
          </div>

          <div className="overview-grid">
            <div className="overview-field overview-field--title">
              <TextInput
                label="Title"
                value={values.title}
                onChange={(value) => setField("title", value)}
                required
              />
            </div>
            <div className="overview-field overview-field--subtitle">
              <TextInput
                label="Subtitle"
                value={values.subtitle}
                onChange={(value) => setField("subtitle", value)}
              />
            </div>
            <div className="overview-row">
              <div className="overview-field">
                <TextInput
                  label="Technology Era"
                  value={values.technologyEra}
                  onChange={(value) => setField("technologyEra", value)}
                />
              </div>
              <div className="overview-field">
                <MultiSelect
                  label="Genre"
                  values={values.genre}
                  onChange={(value) => setField("genre", value)}
                  showAddButton={false}
                />
              </div>
            </div>
            <div className="overview-field overview-field--summary">
              <TextArea
                label="Short Summary"
                value={values.shortSummary}
                onChange={(value) => setField("shortSummary", value)}
                placeholder="Quick summary for readers"
              />
            </div>
            <div className="overview-field overview-field--world">
              <TextArea
                label="World Overview"
                value={values.worldOverview}
                onChange={(value) => setField("worldOverview", value)}
                placeholder="Broader context and setting details"
              />
            </div>
          </div>
        </section>

        <aside className="overview-side" />
      </div>
    </div>
  );
};
