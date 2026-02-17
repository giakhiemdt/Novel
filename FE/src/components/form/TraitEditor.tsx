import { useI18n } from "../../i18n/I18nProvider";
import type { TraitDraft } from "../../types/trait";
import { createEmptyTraitDraft } from "../../utils/trait";

type TraitEditorProps = {
  label: string;
  values: TraitDraft[];
  onChange: (values: TraitDraft[]) => void;
  required?: boolean;
  namePlaceholder?: string;
  descriptionPlaceholder?: string;
};

export const TraitEditor = ({
  label,
  values,
  onChange,
  required,
  namePlaceholder = "Trait name",
  descriptionPlaceholder = "Trait description",
}: TraitEditorProps) => {
  const { t } = useI18n();
  const rows = values.length > 0 ? values : [createEmptyTraitDraft()];

  const updateField = (index: number, key: keyof TraitDraft, value: string) => {
    const next = rows.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [key]: value } : item
    );
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, createEmptyTraitDraft()]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      onChange([createEmptyTraitDraft()]);
      return;
    }
    onChange(rows.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="form-field">
      <label>
        {t(label)}
        {required && <span className="required">*</span>}
      </label>
      <div className="trait-editor">
        {rows.map((trait, index) => (
          <div className="trait-editor__row" key={`trait-row-${index}`}>
            <input
              className="input trait-editor__name"
              placeholder={t(namePlaceholder)}
              value={trait.name}
              onChange={(event) => updateField(index, "name", event.target.value)}
            />
            <input
              className="input trait-editor__description"
              placeholder={t(descriptionPlaceholder)}
              value={trait.description}
              onChange={(event) =>
                updateField(index, "description", event.target.value)
              }
            />
            {rows.length > 1 ? (
              <button
                type="button"
                className="table__action table__action--danger trait-editor__remove"
                onClick={() => removeRow(index)}
                aria-label={t("Remove trait")}
              >
                -
              </button>
            ) : null}
          </div>
        ))}
        <div className="trait-editor__actions">
          <button
            type="button"
            className="table__action table__action--ghost"
            onClick={addRow}
          >
            + {t("Add trait")}
          </button>
        </div>
      </div>
    </div>
  );
};

