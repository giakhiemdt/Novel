import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createEnergyType,
  deleteEnergyConversion,
  deleteEnergyType,
  getEnergyConversions,
  getEnergyTypes,
  updateEnergyType,
  upsertEnergyConversion,
} from "./energy-type.api";
import type {
  EnergyConversion,
  EnergyConversionPayload,
  EnergyType,
  EnergyTypePayload,
} from "./energy-type.types";

const initialTypeState = {
  code: "",
  name: "",
  description: "",
  color: "#4B5563",
  isActive: true,
};

const initialConversionState = {
  fromId: "",
  toId: "",
  ratio: "",
  lossRate: "",
  condition: "",
  isActive: true,
};

type TypeFormState = typeof initialTypeState;
type ConversionFormState = typeof initialConversionState;

export const EnergyTypeCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<EnergyType[]>([]);
  const [conversions, setConversions] = useState<EnergyConversion[]>([]);
  const [form, setForm] = useState<TypeFormState>(initialTypeState);
  const [conversionForm, setConversionForm] =
    useState<ConversionFormState>(initialConversionState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConversion, setIsSavingConversion] = useState(false);
  const [showList, setShowList] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const data = await getEnergyTypes(false);
      const next = data ?? [];
      setItems(next);
      setConversionForm((prev) => {
        const fallbackFrom =
          prev.fromId || (next.length > 0 ? next[0].id : "");
        const fallbackTo =
          prev.toId ||
          (next.length > 1 ? next[1].id : next.length > 0 ? next[0].id : "");
        return {
          ...prev,
          fromId: fallbackFrom,
          toId: fallbackTo,
        };
      });
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  const loadConversions = useCallback(async () => {
    try {
      const data = await getEnergyConversions();
      setConversions(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
    void loadConversions();
  }, [loadItems, loadConversions, showList]);

  useProjectChange(() => {
    if (!showList) {
      return;
    }
    void loadItems();
    void loadConversions();
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

  const buildConversionPayload = (
    state: ConversionFormState
  ): EnergyConversionPayload => ({
    fromId: state.fromId,
    toId: state.toId,
    ratio: state.ratio.trim() === "" ? undefined : Number(state.ratio),
    lossRate:
      state.lossRate.trim() === "" ? undefined : Number(state.lossRate),
    condition: state.condition.trim() || undefined,
    isActive: state.isActive,
  });

  const validatePayload = (payload: EnergyTypePayload): boolean => {
    if (!payload.code || !payload.name) {
      notify(t("Missing required fields: code, name"), "error");
      return false;
    }
    return true;
  };

  const validateConversionPayload = (payload: EnergyConversionPayload): boolean => {
    if (!payload.fromId || !payload.toId) {
      notify(t("Missing required fields: fromId, toId"), "error");
      return false;
    }
    if (payload.fromId === payload.toId) {
      notify(t("From and To energy type must be different."), "error");
      return false;
    }
    if (payload.ratio !== undefined && !Number.isFinite(payload.ratio)) {
      notify(t("Ratio must be a number."), "error");
      return false;
    }
    if (payload.lossRate !== undefined && !Number.isFinite(payload.lossRate)) {
      notify(t("Loss rate must be a number."), "error");
      return false;
    }
    return true;
  };

  const typeOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })),
    [items]
  );

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

  const handleSubmitConversion = async () => {
    const payload = buildConversionPayload(conversionForm);
    if (!validateConversionPayload(payload)) {
      return;
    }

    setIsSavingConversion(true);
    try {
      await upsertEnergyConversion(payload);
      notify(t("Energy conversion saved."), "success");
      setConversionForm((prev) => ({
        ...initialConversionState,
        fromId: prev.fromId,
        toId: prev.toId,
      }));
      if (showList) {
        await loadConversions();
      }
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingConversion(false);
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
      await loadConversions();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleDeleteConversion = async (item: EnergyConversion) => {
    try {
      await deleteEnergyConversion(item.fromId, item.toId);
      notify(t("Energy conversion deleted."), "success");
      await loadConversions();
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
          <div className="table__actions">
            <Button variant="ghost" onClick={() => navigate("/energy-tiers")}>
              {t("Open energy tiers")}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={handleCancel}>
                {t("Cancel")}
              </Button>
            )}
          </div>
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

      <FormSection
        title="Energy conversion rules"
        description="Define which energy type can convert into another."
      >
        <div className="form-field--wide">
          <Select
            label="From"
            value={conversionForm.fromId}
            onChange={(value) =>
              setConversionForm((prev) => ({ ...prev, fromId: value }))
            }
            options={typeOptions}
            required
          />
        </div>
        <div className="form-field--wide">
          <Select
            label="To"
            value={conversionForm.toId}
            onChange={(value) =>
              setConversionForm((prev) => ({ ...prev, toId: value }))
            }
            options={typeOptions}
            required
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Ratio"
            type="number"
            value={conversionForm.ratio}
            onChange={(value) =>
              setConversionForm((prev) => ({ ...prev, ratio: value }))
            }
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Loss rate"
            type="number"
            value={conversionForm.lossRate}
            onChange={(value) =>
              setConversionForm((prev) => ({ ...prev, lossRate: value }))
            }
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Condition"
            value={conversionForm.condition}
            onChange={(value) =>
              setConversionForm((prev) => ({ ...prev, condition: value }))
            }
          />
        </div>
        <div className="form-field--narrow">
          <label>
            <input
              type="checkbox"
              checked={conversionForm.isActive}
              onChange={(event) =>
                setConversionForm((prev) => ({
                  ...prev,
                  isActive: event.target.checked,
                }))
              }
            />{" "}
            {t("Active")}
          </label>
        </div>
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmitConversion} disabled={isSavingConversion}>
          {isSavingConversion ? t("Saving...") : t("Save conversion")}
        </Button>
      </div>

      {showList && (
        <div className="card">
          <h3 className="section-title">{t("Energy conversions")}</h3>
          {conversions.length === 0 ? (
            <p className="header__subtitle">{t("No conversion rules yet.")}</p>
          ) : (
            <table className="table table--clean">
              <thead>
                <tr>
                  <th>{t("From")}</th>
                  <th>{t("To")}</th>
                  <th>{t("Ratio")}</th>
                  <th>{t("Loss")}</th>
                  <th>{t("Condition")}</th>
                  <th>{t("Active")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {conversions.map((item) => (
                  <tr key={`${item.fromId}-${item.toId}`}>
                    <td>{item.fromName ?? item.fromCode ?? item.fromId}</td>
                    <td>{item.toName ?? item.toCode ?? item.toId}</td>
                    <td>{item.ratio ?? "-"}</td>
                    <td>{item.lossRate ?? "-"}</td>
                    <td>{item.condition ?? "-"}</td>
                    <td>{item.isActive ? t("Yes") : t("No")}</td>
                    <td className="table__actions">
                      <button
                        type="button"
                        className="table__action table__action--danger"
                        onClick={() => handleDeleteConversion(item)}
                      >
                        {t("Delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};
