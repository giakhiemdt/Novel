import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getEnergyTypes } from "../energy-type/energy-type.api";
import type { EnergyType } from "../energy-type/energy-type.types";
import {
  createEnergyTier,
  deleteEnergyTier,
  getEnergyTiers,
  linkEnergyTier,
  unlinkEnergyTier,
  updateEnergyTier,
} from "./energy-tier.api";
import type { EnergyTier, EnergyTierPayload } from "./energy-tier.types";

const initialState = {
  energyTypeId: "",
  code: "",
  name: "",
  level: "",
  description: "",
  color: "#64748B",
  isActive: true,
  previousTierId: "",
  requiredAmount: "",
  efficiency: "",
  condition: "",
};

type EnergyTierFormState = typeof initialState;

export const EnergyTierCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [items, setItems] = useState<EnergyTier[]>([]);
  const [energyTypes, setEnergyTypes] = useState<EnergyType[]>([]);
  const [form, setForm] = useState<EnergyTierFormState>(initialState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showList, setShowList] = useState(false);

  const loadEnergyTypes = useCallback(async () => {
    try {
      const data = await getEnergyTypes(false);
      setEnergyTypes(data ?? []);
      setForm((prev) => {
        if (prev.energyTypeId || (data ?? []).length === 0) {
          return prev;
        }
        return { ...prev, energyTypeId: data[0].id };
      });
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  const loadItems = useCallback(async () => {
    try {
      const data = await getEnergyTiers(false);
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    void loadEnergyTypes();
  }, [loadEnergyTypes]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, showList]);

  useProjectChange(() => {
    void loadEnergyTypes();
    if (showList) {
      void loadItems();
    }
  });

  const mapToForm = (item: EnergyTier): EnergyTierFormState => ({
    energyTypeId: item.energyTypeId,
    code: item.code,
    name: item.name,
    level:
      item.level === undefined || item.level === null
        ? ""
        : String(item.level),
    description: item.description ?? "",
    color: item.color ?? "#64748B",
    isActive: item.isActive ?? true,
    previousTierId: "",
    requiredAmount: "",
    efficiency: "",
    condition: "",
  });

  const buildPayload = (state: EnergyTierFormState): EnergyTierPayload => ({
    energyTypeId: state.energyTypeId,
    code: state.code.trim().toLowerCase(),
    name: state.name.trim(),
    level: state.level.trim() === "" ? undefined : Number(state.level),
    description: state.description.trim() || undefined,
    color: state.color.trim() || undefined,
    isActive: state.isActive,
  });

  const validatePayload = (payload: EnergyTierPayload): boolean => {
    if (!payload.energyTypeId || !payload.code || !payload.name) {
      notify(t("Missing required fields: energyTypeId, code, name"), "error");
      return false;
    }
    if (payload.level !== undefined && !Number.isFinite(payload.level)) {
      notify(t("Level must be a number"), "error");
      return false;
    }
    return true;
  };

  const tierOptions = useMemo(
    () =>
      items
        .filter((item) => item.id !== editingId)
        .map((item) => ({
          value: item.id,
          label: `${item.name} (${item.code})`,
        })),
    [items, editingId]
  );

  const energyTypeOptions = useMemo(
    () =>
      energyTypes.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })),
    [energyTypes]
  );

  const handleSubmit = async () => {
    const payload = buildPayload(form);
    if (!validatePayload(payload)) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = editingId
        ? await updateEnergyTier(editingId, payload)
        : await createEnergyTier(payload);

      if (form.previousTierId) {
        await linkEnergyTier({
          previousId: form.previousTierId,
          currentId: saved.id,
          requiredAmount:
            form.requiredAmount.trim() === ""
              ? undefined
              : Number(form.requiredAmount),
          efficiency:
            form.efficiency.trim() === "" ? undefined : Number(form.efficiency),
          condition: form.condition.trim() || undefined,
        });
      }

      notify(
        editingId ? t("Energy tier updated.") : t("Energy tier created."),
        "success"
      );
      setForm((prev) => ({
        ...initialState,
        energyTypeId: prev.energyTypeId,
      }));
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

  const handleEdit = (item: EnergyTier) => {
    setEditingId(item.id);
    setForm(mapToForm(item));
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...initialState,
      energyTypeId: prev.energyTypeId,
    }));
  };

  const handleDelete = async (item: EnergyTier) => {
    try {
      await deleteEnergyTier(item.id);
      notify(t("Energy tier deleted."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleUnlink = async (item: EnergyTier) => {
    if (!form.previousTierId || !editingId || editingId !== item.id) {
      notify(t("Choose previous tier before unlink."), "error");
      return;
    }
    try {
      await unlinkEnergyTier({ previousId: form.previousTierId, currentId: item.id });
      notify(t("Energy tier link removed."), "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Energy tier definitions")}</h3>
            <p className="header__subtitle">
              {t("Manage tiered levels for each energy type.")}
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
            <p className="header__subtitle">{t("No energy tiers yet.")}</p>
          ) : (
            <table className="table table--clean">
              <thead>
                <tr>
                  <th>{t("Code")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Energy Type")}</th>
                  <th>{t("Level")}</th>
                  <th>{t("Active")}</th>
                  <th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.energyTypeName ?? item.energyTypeId}</td>
                    <td>{item.level ?? "-"}</td>
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
                        onClick={() => handleUnlink(item)}
                      >
                        {t("Unlink")}
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
        title={editingId ? "Edit energy tier" : "Create energy tier"}
        description="Define progression levels inside an energy type."
      >
        <div className="form-field--wide">
          <Select
            label="Energy Type"
            value={form.energyTypeId}
            onChange={(value) => setForm((prev) => ({ ...prev, energyTypeId: value }))}
            options={energyTypeOptions}
            required
          />
        </div>
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
        <div className="form-field--narrow">
          <TextInput
            label="Level"
            type="number"
            value={form.level}
            onChange={(value) => setForm((prev) => ({ ...prev, level: value }))}
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

        <div className="form-field--wide">
          <Select
            label="Previous tier"
            value={form.previousTierId}
            onChange={(value) => setForm((prev) => ({ ...prev, previousTierId: value }))}
            options={[
              { value: "", label: t("None") },
              ...tierOptions,
            ]}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Required amount"
            type="number"
            value={form.requiredAmount}
            onChange={(value) => setForm((prev) => ({ ...prev, requiredAmount: value }))}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Efficiency"
            type="number"
            value={form.efficiency}
            onChange={(value) => setForm((prev) => ({ ...prev, efficiency: value }))}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Condition"
            value={form.condition}
            onChange={(value) => setForm((prev) => ({ ...prev, condition: value }))}
          />
        </div>
      </FormSection>

      <div className="card">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving
            ? t("Saving...")
            : editingId
              ? t("Save tier")
              : t("Create tier")}
        </Button>
      </div>
    </div>
  );
};
