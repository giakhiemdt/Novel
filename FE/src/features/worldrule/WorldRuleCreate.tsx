import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createWorldRule,
  deleteWorldRule,
  getAllWorldRules,
  updateWorldRule,
} from "./worldrule.api";
import { validateWorldRule } from "./worldrule.schema";
import type { WorldRule, WorldRulePayload, WorldRuleStatus } from "./worldrule.types";
import { WorldRuleList } from "./WorldRuleList";

const initialState = {
  title: "",
  category: "",
  description: "",
  scope: "",
  constraints: "",
  exceptions: "",
  status: "draft" as WorldRuleStatus,
  version: "",
  validFrom: "",
  validTo: "",
  notes: "",
  tags: [] as string[],
};

type WorldRuleFormState = typeof initialState;

const STATUS_OPTIONS: WorldRuleStatus[] = ["draft", "active", "deprecated"];

export const WorldRuleCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<WorldRuleFormState>(initialState);
  const [items, setItems] = useState<WorldRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WorldRule | null>(null);
  const [editValues, setEditValues] = useState<WorldRuleFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await getAllWorldRules();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllWorldRules]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useProjectChange(() => {
    void loadItems();
  });

  const mapWorldRuleToForm = (item: WorldRule): WorldRuleFormState => ({
    title: item.title ?? "",
    category: item.category ?? "",
    description: item.description ?? "",
    scope: item.scope ?? "",
    constraints: item.constraints ?? "",
    exceptions: item.exceptions ?? "",
    status: item.status ?? "draft",
    version: item.version ?? "",
    validFrom: item.validFrom !== undefined ? String(item.validFrom) : "",
    validTo: item.validTo !== undefined ? String(item.validTo) : "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (state: WorldRuleFormState): WorldRulePayload => ({
    title: state.title,
    category: state.category || undefined,
    description: state.description || undefined,
    scope: state.scope || undefined,
    constraints: state.constraints || undefined,
    exceptions: state.exceptions || undefined,
    status: state.status || undefined,
    version: state.version || undefined,
    validFrom: state.validFrom === "" ? undefined : Number(state.validFrom),
    validTo: state.validTo === "" ? undefined : Number(state.validTo),
    notes: state.notes || undefined,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateWorldRule(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createWorldRule(payload);
      notify(t("World rule created successfully."), "success");
      reset();
      setShowForm(false);
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: WorldRule) => {
    setEditItem(item);
    setEditValues(mapWorldRuleToForm(item));
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
    const payload = buildPayload(editValues);
    const validation = validateWorldRule(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateWorldRule(editItem.id, payload);
      notify(t("World rule updated successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: WorldRule) => {
    const confirmed = window.confirm(
      t("Delete this world rule? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteWorldRule(item.id);
      notify(t("World rule deleted."), "success");
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
            <h3 className="section-title">{t("World rule nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new world rule")}
          </Button>
        </div>
        <WorldRuleList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit world rule")}</h3>
                <p className="header__subtitle">{editItem.title}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="World Rule" description="Core rule definition.">
            <div className="form-field--wide">
              <TextInput
                label="Title"
                value={editValues.title}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, title: value })
                }
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={editValues.status}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, status: value as WorldRuleStatus })
                }
                options={STATUS_OPTIONS.map((value) => ({ label: t(value), value }))}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Category"
                value={editValues.category}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, category: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Scope"
                value={editValues.scope}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, scope: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Constraints" description="Limits and exceptions.">
            <div className="form-field--wide">
              <TextArea
                label="Constraints"
                value={editValues.constraints}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, constraints: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Exceptions"
                value={editValues.exceptions}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, exceptions: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Validity window.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid From"
                type="number"
                value={editValues.validFrom}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, validFrom: value })
                }
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid To"
                type="number"
                value={editValues.validTo}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, validTo: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Version"
                value={editValues.version}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, version: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the rule.">
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
          <FormSection title="World Rule" description="Core rule definition.">
            <div className="form-field--wide">
              <TextInput
                label="Title"
                value={values.title}
                onChange={(value) => setField("title", value)}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Status"
                value={values.status}
                onChange={(value) => setField("status", value as WorldRuleStatus)}
                options={STATUS_OPTIONS.map((value) => ({ label: t(value), value }))}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Category"
                value={values.category}
                onChange={(value) => setField("category", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Scope"
                value={values.scope}
                onChange={(value) => setField("scope", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Constraints" description="Limits and exceptions.">
            <div className="form-field--wide">
              <TextArea
                label="Constraints"
                value={values.constraints}
                onChange={(value) => setField("constraints", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Exceptions"
                value={values.exceptions}
                onChange={(value) => setField("exceptions", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Validity window.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid From"
                type="number"
                value={values.validFrom}
                onChange={(value) => setField("validFrom", value)}
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Valid To"
                type="number"
                value={values.validTo}
                onChange={(value) => setField("validTo", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Version"
                value={values.version}
                onChange={(value) => setField("version", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the rule.">
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
              {t("Create world rule")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
