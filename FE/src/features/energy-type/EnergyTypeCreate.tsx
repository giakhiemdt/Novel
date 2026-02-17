import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import boardIcon from "../../assets/icons/board.svg";
import {
  createEnergyType,
  deleteEnergyConversion,
  deleteEnergyType,
  getEnergyConversions,
  getEnergyTypes,
  updateEnergyType,
  upsertEnergyConversion,
} from "./energy-type.api";
import { EnergyConversionBoard } from "./EnergyConversionBoard";
import { EnergyTypeLevelBoard } from "./EnergyTypeLevelBoard";
import type {
  EnergyConversion,
  EnergyConversionPayload,
  EnergyType,
  EnergyTypePayload,
  EnergyTypeTrait,
} from "./energy-type.types";

type TraitFormState = {
  name: string;
  description: string;
};

const createEmptyTrait = (): TraitFormState => ({
  name: "",
  description: "",
});

const initialTypeState = {
  code: "",
  name: "",
  levelCount: "1",
  traits: [createEmptyTrait()] as TraitFormState[],
  description: "",
  color: "#4B5563",
  isActive: true,
};

const initialConversionState = {
  fromId: "",
  toId: "",
  ratio: "",
  condition: "",
  color: "#5FAAB8",
  isActive: true,
};

type TypeFormState = typeof initialTypeState;
type ConversionFormState = typeof initialConversionState;
const CONVERSION_LAYOUT_STORAGE_KEY = "novel.energy-conversion-layout.v1";

const normalizeTraits = (value: unknown): EnergyTypeTrait[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const next: EnergyTypeTrait[] = [];
  value.forEach((item) => {
    if (typeof item === "string") {
      const name = item.trim();
      if (name) {
        next.push({ name });
      }
      return;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }
    const raw = item as Record<string, unknown>;
    if (typeof raw.name !== "string") {
      return;
    }
    const name = raw.name.trim();
    if (!name) {
      return;
    }
    const description =
      typeof raw.description === "string" && raw.description.trim().length > 0
        ? raw.description.trim()
        : undefined;
    next.push({
      name,
      ...(description !== undefined ? { description } : {}),
    });
  });
  return next;
};

const toTraitFormState = (traits: EnergyTypeTrait[] | undefined): TraitFormState[] => {
  const normalized = normalizeTraits(traits).map((trait) => ({
    name: trait.name,
    description: trait.description ?? "",
  }));
  return normalized.length > 0 ? normalized : [createEmptyTrait()];
};

export const EnergyTypeCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [items, setItems] = useState<EnergyType[]>([]);
  const [conversions, setConversions] = useState<EnergyConversion[]>([]);
  const [form, setForm] = useState<TypeFormState>(initialTypeState);
  const [conversionForm, setConversionForm] =
    useState<ConversionFormState>(initialConversionState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConversion, setIsSavingConversion] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showConversionBoard, setShowConversionBoard] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedConversion, setSelectedConversion] = useState<{
    fromId: string;
    toId: string;
  } | null>(null);
  const [linkDraftFromId, setLinkDraftFromId] = useState<string | null>(null);
  const [conversionBoardPositions, setConversionBoardPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    code: "",
    isActive: "",
  });

  const loadItems = useCallback(async () => {
    try {
      const data = await getEnergyTypes(false);
      const next = (data ?? []).map((item) => ({
        ...item,
        traits: normalizeTraits(item.traits),
      }));
      setItems(next);
      setConversionForm((prev) => {
        const fallbackFrom = prev.fromId || (next.length > 0 ? next[0].id : "");
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
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(CONVERSION_LAYOUT_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return;
      }
      setConversionBoardPositions(parsed);
    } catch {
      setConversionBoardPositions({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      CONVERSION_LAYOUT_STORAGE_KEY,
      JSON.stringify(conversionBoardPositions)
    );
  }, [conversionBoardPositions]);

  useEffect(() => {
    if (showList || showBoard || showConversionBoard) {
      void loadItems();
    }
    if (showList || showConversionBoard) {
      void loadConversions();
    }
  }, [loadConversions, loadItems, showBoard, showConversionBoard, showList]);

  useProjectChange(() => {
    if (showList || showBoard || showConversionBoard) {
      void loadItems();
    }
    if (showList || showConversionBoard) {
      void loadConversions();
    }
  });

  const mapToForm = (item: EnergyType): TypeFormState => ({
    code: item.code,
    name: item.name,
    levelCount:
      typeof item.levelCount === "number" && Number.isFinite(item.levelCount)
        ? String(Math.max(1, Math.floor(item.levelCount)))
        : "1",
    traits: toTraitFormState(item.traits),
    description: item.description ?? "",
    color: item.color ?? "#4B5563",
    isActive: item.isActive,
  });

  const buildPayload = (state: TypeFormState): EnergyTypePayload => {
    const parsedLevelCount = Number(state.levelCount);
    const levelCount =
      Number.isFinite(parsedLevelCount) && parsedLevelCount >= 1
        ? Math.floor(parsedLevelCount)
        : 1;
    const traits = state.traits
      .map((trait) => ({
        name: trait.name.trim(),
        description: trait.description.trim(),
      }))
      .filter((trait) => trait.name.length > 0)
      .map((trait) => ({
        name: trait.name,
        ...(trait.description.length > 0 ? { description: trait.description } : {}),
      }));
    return {
      code: state.code.trim().toLowerCase(),
      name: state.name.trim(),
      levelCount,
      traits: traits.length > 0 ? traits : undefined,
      description: state.description.trim() || undefined,
      color: state.color.trim() || undefined,
      isActive: state.isActive,
    };
  };

  const buildConversionPayload = (
    state: ConversionFormState
  ): EnergyConversionPayload => ({
    fromId: state.fromId,
    toId: state.toId,
    ratio: state.ratio.trim() === "" ? undefined : Number(state.ratio),
    condition: state.condition.trim() || undefined,
    color: state.color.trim() || undefined,
    isActive: state.isActive,
  });

  const validatePayload = (payload: EnergyTypePayload): boolean => {
    if (!payload.code || !payload.name) {
      notify(t("Missing required fields: code, name"), "error");
      return false;
    }
    if (
      payload.levelCount === undefined ||
      !Number.isInteger(payload.levelCount) ||
      payload.levelCount < 1
    ) {
      notify(t("Level count must be an integer >= 1."), "error");
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
    return true;
  };

  const handleTraitFieldChange = (
    index: number,
    key: keyof TraitFormState,
    value: string
  ) => {
    setForm((prev) => {
      const nextTraits = prev.traits.map((trait, traitIndex) =>
        traitIndex === index ? { ...trait, [key]: value } : trait
      );
      return { ...prev, traits: nextTraits };
    });
  };

  const handleAddTrait = () => {
    setForm((prev) => ({
      ...prev,
      traits: [...prev.traits, createEmptyTrait()],
    }));
  };

  const handleRemoveTrait = (index: number) => {
    setForm((prev) => {
      if (prev.traits.length <= 1) {
        return prev;
      }
      const nextTraits = prev.traits.filter((_, traitIndex) => traitIndex !== index);
      return {
        ...prev,
        traits: nextTraits.length > 0 ? nextTraits : [createEmptyTrait()],
      };
    });
  };

  const mapConversionToForm = (item: EnergyConversion): ConversionFormState => ({
    fromId: item.fromId,
    toId: item.toId,
    ratio:
      item.ratio === undefined || item.ratio === null ? "" : String(item.ratio),
    condition: item.condition ?? "",
    color: item.color ?? "#5FAAB8",
    isActive: item.isActive ?? true,
  });

  const typeOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const name = filters.name.trim().toLowerCase();
    const code = filters.code.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const traitText = normalizeTraits(item.traits)
          .map((trait) => `${trait.name} ${trait.description ?? ""}`)
          .join(" ");
        const text = `${item.name ?? ""} ${item.code ?? ""} ${item.description ?? ""} ${traitText}`.toLowerCase();
        if (!text.includes(q)) {
          return false;
        }
      }
      if (name && !(item.name ?? "").toLowerCase().includes(name)) {
        return false;
      }
      if (code && !(item.code ?? "").toLowerCase().includes(code)) {
        return false;
      }
      if (filters.isActive === "true" && !item.isActive) {
        return false;
      }
      if (filters.isActive === "false" && item.isActive) {
        return false;
      }
      return true;
    });
  }, [filters.code, filters.isActive, filters.name, filters.q, items]);

  const findConversion = useCallback(
    (fromId: string, toId: string) =>
      conversions.find((item) => item.fromId === fromId && item.toId === toId),
    [conversions]
  );

  useEffect(() => {
    if (!selectedConversion) {
      return;
    }
    if (!findConversion(selectedConversion.fromId, selectedConversion.toId)) {
      setSelectedConversion(null);
    }
  }, [findConversion, selectedConversion]);

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
      if (showList || showBoard) {
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
      setSelectedConversion({ fromId: payload.fromId, toId: payload.toId });
      setLinkDraftFromId(null);
      setConversionForm((prev) => ({
        ...initialConversionState,
        fromId: prev.fromId,
        toId: prev.toId,
        color: prev.color,
      }));
      if (showList || showConversionBoard) {
        await loadConversions();
      }
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingConversion(false);
    }
  };

  const handleNodeClick = async (nodeId: string) => {
    if (!linkDraftFromId) {
      setLinkDraftFromId(nodeId);
      setSelectedConversion(null);
      setConversionForm((prev) => ({ ...prev, fromId: nodeId }));
      return;
    }

    if (linkDraftFromId === nodeId) {
      setLinkDraftFromId(null);
      return;
    }

    const existing = findConversion(linkDraftFromId, nodeId);
    if (existing) {
      setSelectedConversion({ fromId: existing.fromId, toId: existing.toId });
      setConversionForm(mapConversionToForm(existing));
      setLinkDraftFromId(null);
      return;
    }

    const payload: EnergyConversionPayload = {
      fromId: linkDraftFromId,
      toId: nodeId,
      color: conversionForm.color.trim() || undefined,
      isActive: true,
    };
    if (!validateConversionPayload(payload)) {
      return;
    }

    setIsSavingConversion(true);
    try {
      await upsertEnergyConversion(payload);
      notify(t("Energy conversion saved."), "success");
      await loadConversions();
      setSelectedConversion({ fromId: payload.fromId, toId: payload.toId });
      setConversionForm((prev) => ({
        ...prev,
        fromId: payload.fromId,
        toId: payload.toId,
        color: prev.color,
        isActive: true,
      }));
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingConversion(false);
      setLinkDraftFromId(null);
    }
  };

  const handleSelectConversion = (fromId: string, toId: string) => {
    const target = findConversion(fromId, toId);
    if (!target) {
      return;
    }
    setSelectedConversion({ fromId, toId });
    setLinkDraftFromId(null);
    setConversionForm(mapConversionToForm(target));
  };

  const handleClearConversionSelection = () => {
    setSelectedConversion(null);
    setLinkDraftFromId(null);
  };

  const handleEdit = (item: EnergyType) => {
    setEditingId(item.id);
    setForm(mapToForm(item));
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(initialTypeState);
    setShowForm(false);
  };

  const handleToggleActive = async (item: EnergyType) => {
    try {
      await updateEnergyType(item.id, {
        code: item.code,
        name: item.name,
        levelCount: item.levelCount,
        traits: item.traits,
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
    const confirmed = window.confirm(
      t("Delete this energy type? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
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
    const confirmed = window.confirm(
      t("Delete this energy conversion? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteEnergyConversion(item.fromId, item.toId);
      notify(t("Energy conversion deleted."), "success");
      if (
        selectedConversion?.fromId === item.fromId &&
        selectedConversion?.toId === item.toId
      ) {
        setSelectedConversion(null);
      }
      await loadConversions();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleDeleteConversionFromForm = async () => {
    const fromId = conversionForm.fromId;
    const toId = conversionForm.toId;
    if (!fromId || !toId) {
      notify(t("Missing required fields: fromId, toId"), "error");
      return;
    }
    const target = findConversion(fromId, toId);
    if (!target) {
      notify(t("No conversion rules yet."), "error");
      return;
    }
    await handleDeleteConversion(target);
  };

  return (
    <div>
      <CrudPageShell
        title="Energy type definitions"
        subtitle="Manage available energy types used by rank systems."
        showForm={showForm}
        createLabel="Create new energy type"
        onToggleForm={() => {
          if (showForm) {
            handleCancel();
            return;
          }
          setShowForm(true);
        }}
        isEditing={Boolean(editingId)}
        onCancelEdit={handleCancel}
        controls={
          <>
            <FilterPanel>
              <TextInput
                label="Search"
                value={filters.q}
                onChange={(value) => setFilters((prev) => ({ ...prev, q: value }))}
                placeholder="Search..."
              />
              <TextInput
                label="Name"
                value={filters.name}
                onChange={(value) => setFilters((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                label="Code"
                value={filters.code}
                onChange={(value) => setFilters((prev) => ({ ...prev, code: value }))}
              />
              <Select
                label="Active"
                value={filters.isActive}
                onChange={(value) => setFilters((prev) => ({ ...prev, isActive: value }))}
                options={[
                  { value: "true", label: t("Yes") },
                  { value: "false", label: t("No") },
                ]}
                placeholder={t("All")}
              />
              <div className="form-field filter-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setFilters({ q: "", name: "", code: "", isActive: "" })
                  }
                >
                  {t("Clear filters")}
                </Button>
              </div>
            </FilterPanel>
            <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
            {showList ? (
              filteredItems.length === 0 ? (
                <p className="header__subtitle">{t("No energy types yet.")}</p>
              ) : (
                <table className="table table--clean">
                  <thead>
                    <tr>
                      <th>{t("Code")}</th>
                      <th>{t("Name")}</th>
                      <th>{t("Levels")}</th>
                      <th>{t("Traits")}</th>
                      <th>{t("Active")}</th>
                      <th>{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.code}</td>
                        <td>{item.name}</td>
                        <td>{item.levelCount ?? "-"}</td>
                        <td>
                          {item.traits && item.traits.length > 0 ? (
                            <div className="pill-list">
                              {item.traits.map((trait) => (
                                <span
                                  className="pill"
                                  key={`${item.id}-${trait.name}-${trait.description ?? ""}`}
                                >
                                  {trait.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
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
              )
            ) : null}
            <div className="filter-block">
              <button
                type="button"
                className="filter-toggle"
                onClick={() => setShowBoard((prev) => !prev)}
                aria-expanded={showBoard}
              >
                <img src={boardIcon} alt={t("Board")} className="filter-toggle__icon" />
                <span className="filter-toggle__label">
                  {showBoard ? t("Hide level board") : t("Show level board")}
                </span>
              </button>
              {showBoard && (
                <div className="energy-type-inline-board">
                  <h3 className="section-title">{t("Energy level board")}</h3>
                  <p className="header__subtitle">
                    {t("Matrix overview of level and ratio per energy type.")}
                  </p>
                  <EnergyTypeLevelBoard items={items} />
                </div>
              )}
            </div>
            <div className="filter-block">
              <button
                type="button"
                className="filter-toggle"
                onClick={() => setShowConversionBoard((prev) => !prev)}
                aria-expanded={showConversionBoard}
              >
                <img src={boardIcon} alt={t("Board")} className="filter-toggle__icon" />
                <span className="filter-toggle__label">
                  {showConversionBoard
                    ? t("Hide conversion board")
                    : t("Show conversion board")}
                </span>
              </button>
              {showConversionBoard && (
                <div className="energy-type-inline-board">
                  <h3 className="section-title">{t("Energy conversion board")}</h3>
                  <p className="header__subtitle">
                    {linkDraftFromId
                      ? t("Source selected. Click another node to create conversion.")
                      : t("Drag nodes to arrange. Click one node then another to connect.")}
                  </p>
                  <EnergyConversionBoard
                    items={items}
                    conversions={conversions}
                    positions={conversionBoardPositions}
                    selectedLink={selectedConversion}
                    linkDraftFromId={linkDraftFromId}
                    onPositionsChange={setConversionBoardPositions}
                    onNodeClick={(id) => {
                      void handleNodeClick(id);
                    }}
                    onEdgeClick={handleSelectConversion}
                    onClearSelection={handleClearConversionSelection}
                  />
                </div>
              )}
            </div>
          </>
        }
      />

      {showForm && (
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
        <div className="form-field--narrow">
          <TextInput
            label="Level count"
            type="number"
            value={form.levelCount}
            onChange={(value) => setForm((prev) => ({ ...prev, levelCount: value }))}
            required
          />
        </div>
        <div className="form-field--wide">
          <label>{t("Traits")}</label>
          <div className="trait-editor">
            {form.traits.map((trait, index) => (
              <div className="trait-editor__row" key={`trait-row-${index}`}>
                <input
                  className="input trait-editor__name"
                  placeholder={t("Trait name")}
                  value={trait.name}
                  onChange={(event) =>
                    handleTraitFieldChange(index, "name", event.target.value)
                  }
                />
                <input
                  className="input trait-editor__description"
                  placeholder={t("Trait description")}
                  value={trait.description}
                  onChange={(event) =>
                    handleTraitFieldChange(index, "description", event.target.value)
                  }
                />
                {form.traits.length > 1 ? (
                  <button
                    type="button"
                    className="table__action table__action--danger trait-editor__remove"
                    onClick={() => handleRemoveTrait(index)}
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
                onClick={handleAddTrait}
              >
                + {t("Add trait")}
              </button>
            </div>
          </div>
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
      )}

      {showForm && (
      <div className="card">
        <Button onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? t("Saving...") : editingId ? t("Save type") : t("Create type")}
        </Button>
      </div>
      )}

      {showConversionBoard && (
        <>
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
              <TextInput
                label="Color"
                type="color"
                value={conversionForm.color}
                onChange={(value) =>
                  setConversionForm((prev) => ({ ...prev, color: value }))
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
            <div className="table__actions">
              <button
                type="button"
                className="table__action table__action--danger"
                onClick={() => {
                  void handleDeleteConversionFromForm();
                }}
                disabled={
                  isSavingConversion ||
                  !conversionForm.fromId ||
                  !conversionForm.toId ||
                  !findConversion(conversionForm.fromId, conversionForm.toId)
                }
              >
                {t("Delete link")}
              </button>
              <Button onClick={handleSubmitConversion} disabled={isSavingConversion}>
                {isSavingConversion ? t("Saving...") : t("Save conversion")}
              </Button>
            </div>
          </div>
        </>
      )}

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
                    <td>{item.condition ?? "-"}</td>
                    <td>{item.isActive ? t("Yes") : t("No")}</td>
                    <td className="table__actions">
                      <button
                        type="button"
                        className="table__action table__action--ghost"
                        onClick={() => {
                          setSelectedConversion({
                            fromId: item.fromId,
                            toId: item.toId,
                          });
                          setLinkDraftFromId(null);
                          setConversionForm(mapConversionToForm(item));
                        }}
                      >
                        {t("Edit")}
                      </button>
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
