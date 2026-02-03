import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import {
  createTimeline,
  deleteTimeline,
  getAllTimelines,
  linkTimeline,
  relinkTimeline,
  unlinkTimeline,
} from "./timeline.api";
import { TimelineBoard } from "./TimelineBoard";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { validateTimeline } from "./timeline.schema";
import type { Timeline, TimelinePayload } from "./timeline.types";
import { useI18n } from "../../i18n/I18nProvider";

const initialState = {
  name: "",
  code: "",
  durationYears: "",
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

export const TimelineCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<TimelineFormState>(initialState);
  const [items, setItems] = useState<Timeline[]>([]);
  const [selected, setSelected] = useState<Timeline | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const [links, setLinks] = useState<Record<string, { previousId?: string }>>({});

  const loadItems = useCallback(async (selectId?: string) => {
    setLoading(true);
    try {
      const data = await getAllTimelines();
      setItems(data ?? []);
      if (!data || data.length === 0) {
        setSelected(null);
        return;
      }
      setLinks((prev) => {
        const next: Record<string, { previousId?: string }> = {};
        data.forEach((item) => {
          if (item.previousId) {
            next[item.id] = { previousId: item.previousId };
          } else if (prev[item.id]) {
            next[item.id] = prev[item.id];
          }
        });
        return next;
      });
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
      notify((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useProjectChange(() => {
    void loadItems();
  });

  const buildPayload = (): TimelinePayload => ({
    name: values.name,
    code: values.code || undefined,
    durationYears:
      values.durationYears === "" ? Number.NaN : Number(values.durationYears),
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
    const payload = buildPayload();
    const validation = validateTimeline(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const created = await createTimeline(payload);
      notify(t("Timeline created successfully."), "success");
      reset();
      setIsFormOpen(false);
      await loadItems(created.id);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardLink = async (currentId: string, previousId: string) => {
    try {
      const response = await linkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: { previousId } }));
      notify(`Linked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardUnlink = async (currentId: string, previousId: string) => {
    try {
      const response = await unlinkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: {} }));
      notify(`Unlinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardRelink = async (currentId: string, previousId: string) => {
    try {
      const response = await relinkTimeline({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: { previousId } }));
      notify(`Relinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleDelete = async (item: Timeline) => {
    const confirmed = window.confirm(
      t("Delete this timeline? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteTimeline(item.id);
      notify(t("Timeline deleted."), "success");
      setSelected(null);
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div className="timeline-page">
      <>
        <TimelineBoard
          items={items}
          selectedId={selected?.id}
          onSelect={setSelected}
          links={links}
          onLink={handleBoardLink}
          onUnlink={handleBoardUnlink}
          onRelink={handleBoardRelink}
          onDelete={handleDelete}
        />
        {items.length === 0 && (
          <p className="timeline-empty">{t("No timelines yet.")}</p>
        )}
      </>

      <button
        type="button"
        className="timeline-fab"
        onClick={() => setIsFormOpen(true)}
      >
        +
      </button>

      {isFormOpen && (
        <div className="timeline-modal__backdrop" onClick={() => setIsFormOpen(false)}>
          <div
            className="timeline-modal timeline-modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="timeline-modal__header">
              <div>
                <h3>{t("Create timeline")}</h3>
                <p className="header__subtitle">
                  {t("Define the era and its scope.")}
                </p>
              </div>
              <button
                className="timeline-modal__close"
                type="button"
                onClick={() => setIsFormOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="timeline-modal__body">
              <FormSection title="Timeline Setup">
                <TextInput
                  label="Name"
                  value={values.name}
                  onChange={(value) => setField("name", value)}
                  required
                />
                <TextInput
                  label="Code"
                  value={values.code}
                  onChange={(value) => setField("code", value)}
                />
                <TextInput
                  label="Duration (Years)"
                  type="number"
                  value={values.durationYears}
                  onChange={(value) => setField("durationYears", value)}
                  required
                />
                <label className="toggle">
                  <span>{t("Ongoing era")}</span>
                  <input
                    type="checkbox"
                    checked={values.isOngoing}
                    onChange={(event) =>
                      setField("isOngoing", event.target.checked)
                    }
                  />
                  <span className="toggle__track" aria-hidden="true">
                    <span className="toggle__thumb" />
                  </span>
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

              <FormSection title="Narrative">
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
                <TextArea
                  label="Notes"
                  value={values.notes}
                  onChange={(value) => setField("notes", value)}
                />
                <MultiSelect
                  label="Tags"
                  values={values.tags}
                  onChange={(value) => setField("tags", value)}
                />
              </FormSection>

              <FormSection title="Linking">
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

            </div>

            <div className="timeline-modal__footer">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? t("Saving...") : t("Create timeline")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
