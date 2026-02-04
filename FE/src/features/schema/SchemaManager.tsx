import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useToast } from "../../components/common/Toast";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getSchemaByEntity, upsertSchema } from "./schema.api";
import type { EntitySchema, SchemaField, SchemaFieldType } from "./schema.types";

const FIELD_TYPES: SchemaFieldType[] = [
  "text",
  "number",
  "textarea",
  "select",
  "multiselect",
  "boolean",
  "date",
];

const emptyField = (): SchemaField => ({
  key: "",
  label: "",
  type: "text",
  required: false,
  options: [],
});

export const SchemaManager = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const [entity, setEntity] = useState("character");
  const [title, setTitle] = useState("Additional Fields");
  const [fields, setFields] = useState<SchemaField[]>([emptyField()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadSchema = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSchemaByEntity(entity);
      if (data) {
        setTitle(data.title ?? "Additional Fields");
        setFields(data.fields?.length ? data.fields : [emptyField()]);
      } else {
        setFields([emptyField()]);
      }
    } catch (err) {
      const message = (err as Error).message;
      if (message !== "schema not found") {
        notify(message, "error");
      }
      setFields([emptyField()]);
    } finally {
      setIsLoading(false);
    }
  }, [entity, notify]);

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  useProjectChange(() => {
    void loadSchema();
  });

  const entityOptions = useMemo(
    () => [
      { value: "character", label: "Character" },
      { value: "race", label: "Race" },
      { value: "rank", label: "Rank" },
    ],
    []
  );

  const updateField = (index: number, patch: Partial<SchemaField>) => {
    setFields((prev) =>
      prev.map((field, idx) => (idx === index ? { ...field, ...patch } : field))
    );
  };

  const addField = () => {
    setFields((prev) => [...prev, emptyField()]);
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    const cleanedFields = fields
      .map((field) => ({
        ...field,
        key: field.key.trim(),
        label: field.label.trim(),
        options:
          field.options && field.options.length
            ? field.options.map((opt) => opt.trim()).filter(Boolean)
            : undefined,
      }))
      .filter((field) => field.key && field.label);

    if (!cleanedFields.length) {
      notify(t("Please add at least one field."), "error");
      return;
    }

    const payload: EntitySchema = {
      entity,
      title: title.trim() || undefined,
      fields: cleanedFields,
    };

    setIsSaving(true);
    try {
      await upsertSchema(payload);
      notify(t("Schema saved."), "success");
      await loadSchema();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Schema Manager")}</h3>
            <p className="header__subtitle">
              {t("Configure dynamic fields for each entity.")}
            </p>
          </div>
        </div>
      </div>

      <FormSection title="Entity">
        <div className="form-field--narrow">
          <Select
            label="Entity"
            value={entity}
            onChange={(value) => setEntity(value)}
            options={entityOptions}
            disabled={isLoading}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Title"
            value={title}
            onChange={(value) => setTitle(value)}
          />
        </div>
      </FormSection>

      <FormSection title="Fields">
        {fields.map((field, index) => (
          <div key={`${field.key}-${index}`} className="card card--flat">
            <div className="card__header">
              <div>
                <h4 className="section-title">{t("Field")}</h4>
                <p className="header__subtitle">{t("Configure a field.")}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => removeField(index)}
                disabled={fields.length === 1}
              >
                {t("Remove")}
              </Button>
            </div>
            <div className="grid grid--2">
              <TextInput
                label="Key"
                value={field.key}
                onChange={(value) => updateField(index, { key: value })}
                required
              />
              <TextInput
                label="Label"
                value={field.label}
                onChange={(value) => updateField(index, { label: value })}
                required
              />
            </div>
            <div className="grid grid--3">
              <Select
                label="Type"
                value={field.type}
                onChange={(value) => updateField(index, { type: value as SchemaFieldType })}
                options={FIELD_TYPES.map((type) => ({ value: type, label: type }))}
              />
              <TextInput
                label="Group"
                value={field.group ?? ""}
                onChange={(value) => updateField(index, { group: value })}
              />
              <TextInput
                label="Order"
                type="number"
                value={field.order === undefined ? "" : String(field.order)}
                onChange={(value) =>
                  updateField(index, { order: value === "" ? undefined : Number(value) })
                }
              />
            </div>
            <div className="grid grid--2">
              <TextInput
                label="Placeholder"
                value={field.placeholder ?? ""}
                onChange={(value) => updateField(index, { placeholder: value })}
              />
              <TextInput
                label="Help"
                value={field.help ?? ""}
                onChange={(value) => updateField(index, { help: value })}
              />
            </div>
            {(field.type === "select" || field.type === "multiselect") && (
              <TextArea
                label="Options"
                value={(field.options ?? []).join(", ")}
                onChange={(value) =>
                  updateField(index, {
                    options: value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={t("Comma separated options")}
              />
            )}
            <label className="toggle">
              <span>{t("Required")}</span>
              <input
                type="checkbox"
                checked={Boolean(field.required)}
                onChange={(event) =>
                  updateField(index, { required: event.target.checked })
                }
              />
              <span className="toggle__track" aria-hidden="true">
                <span className="toggle__thumb" />
              </span>
            </label>
          </div>
        ))}
      </FormSection>

      <div className="card">
        <Button onClick={addField} variant="ghost">
          {t("Add field")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("Saving...") : t("Save schema")}
        </Button>
      </div>
    </div>
  );
};
