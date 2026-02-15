import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createEnergyType,
  deleteEnergyType,
  getEnergyTypes,
  updateEnergyType,
} from "./energy-type.api";
import type { EnergyType, EnergyTypePayload } from "./energy-type.types";

const initialTypeState = {
  code: "",
  name: "",
  description: "",
  color: "#4B5563",
  isActive: true,
};

type TypeFormState = typeof initialTypeState;

export const EnergyTypeCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [items, setItems] = useState<EnergyType[]>([]);
  const [form, setForm] = useState<TypeFormState>(initialTypeState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showList, setShowList] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await getEnergyTypes(false);
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, showList]);

  useProjectChange(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  });

  const mapToForm = (item: EnergyType): TypeFormState => ({
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    color: item.color ?? "#4B5563",
    isActive: item.isActive,
  });

  const buildPayload = (state: TypeFormState): EnergyTypePayload => ({
    code: state.code.trim().toLowerCase(),
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    color: state.color.trim() || undefined,
    isActive: state.isActive,
  });

  const validatePayload = (payload: EnergyTypePayload): boolean => {
    if (!payload.code || !payload.name) {
      notify(t("Missing required fields: code, name"), "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    const payload = buildPayload(form);
    if (!validatePayload(payload)) {
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await updateEnergyType(editingId, payload);
        notify(t("Energy type updated."), "success");
      } else {
        await createEnergyType(payload);
        notify(t("Energy type created."), "success");
      }
      setForm(initialTypeState);
      setEditingId(null);
      if (showList) {
        await loadItems();
      }
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: EnergyType) => {
    setEditingId(item.id);
    setForm(mapToForm(item));
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(initialTypeState);
  };

  const handleToggleActive = async (item: EnergyType) => {
    try {
      await updateEnergyType(item.id, {
        code: item.code,
        name: item.name,
        description: item.description,
        color: item.color,
        isActive: !item.isActive,
      });
      notify(t("Energy type updated."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleDelete = async (item: EnergyType) => {
    try {
      await deleteEnergyType(item.id);
      notify(t("Energy type deleted."), "success");
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
            <h3 className="section-title">{t("Energy type definitions")}</h3>
            <p className="header__subtitle">
              {t("Manage available energy types used by rank systems.")}
            </p>
          </div>
          {editingId && (
            <Button variant="ghost" onClick={handleCancel}>
              {t("Cancel")}
            </Button>
          )}
        </div>

        <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
        {showList &&
          (items.length === 0 ? (
            <p className="header__subtitle">{t("No energy types yet.")}</p>
          ) : (
            <table className="table table--clean">
              <thead>
                <tr>
                  <th>{t("Code")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Active")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.isActive ? t("Yes") : t("No")}</td>
                    <td className="table__actions">
                      <button
                        type="button"
                        className="table__action table__action--ghost"
                        onClick={() => handleEdit(item)}
                      >
                        {t("Edit")}
                      </button>
                      <button
                        type="button"
                        className="table__action"
                        onClick={() => handleToggleActive(item)}
                      >
                        {item.isActive ? t("Deactivate") : t("Activate")}
                      </button>
                      <button
                        type="button"
                        className="table__action table__action--danger"
                        onClick={() => handleDelete(item)}
                      >
                        {t("Delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      <FormSection
        title={editingId ? "Edit energy type" : "Create energy type"}
        description="Define reusable energy metadata."
      >
        <div className="form-field--narrow">
          <TextInput
            label="Code"
            value={form.code}
            onChange={(value) => setForm((prev) => ({ ...prev, code: value.toLowerCase() }))}
            required
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Name"
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            required
          />
        </div>
        <div className="form-field--wide">
          <TextArea
            label="Description"
            value={form.description}
            onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Color"
            type="color"
            value={form.color}
            onChange={(value) => setForm((prev) => ({ ...prev, color: value }))}
          />
        </div>
        <div className="form-field--narrow">
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />{" "}
            {t("Active")}
          </label>
        </div>
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving
            ? t("Saving...")
            : editingId
              ? t("Save type")
              : t("Create type")}
        </Button>
      </div>
    </div>
  );
};

