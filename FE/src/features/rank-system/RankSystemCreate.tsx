import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
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
  createRankSystem,
  deleteRankSystem,
  getAllRankSystems,
  getRankSystemsPage,
  updateRankSystem,
} from "./rank-system.api";
import { getRanksPage } from "../rank/rank.api";
import type { Rank } from "../rank/rank.types";
import { RankSystemLandscapeBoard } from "./RankSystemLandscapeBoard";
import { RankSystemList } from "./RankSystemList";
import { validateRankSystem } from "./rank-system.schema";
import type { RankSystem, RankSystemPayload } from "./rank-system.types";
import boardIcon from "../../assets/icons/board.svg";
import { getEnergyTypes } from "../energy-type/energy-type.api";
import type { EnergyType } from "../energy-type/energy-type.types";

const initialState = {
  name: "",
  code: "",
  description: "",
  domain: "",
  energyTypeId: "",
  priority: "",
  isPrimary: false,
  tags: [] as string[],
};

type RankSystemFormState = typeof initialState;
const CUSTOM_CODE_VALUE = "__custom__";

export const RankSystemCreate = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { values, setField, reset } = useForm<RankSystemFormState>(initialState);
  const [items, setItems] = useState<RankSystem[]>([]);
  const [allRankSystems, setAllRankSystems] = useState<RankSystem[]>([]);
  const [allRanks, setAllRanks] = useState<Rank[]>([]);
  const [energyTypes, setEnergyTypes] = useState<EnergyType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RankSystem | null>(null);
  const [editValues, setEditValues] = useState<RankSystemFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    domain: "",
    energyTypeId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getRankSystemsPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = response?.data ?? [];
      const total = typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage =
        total !== undefined
          ? offset + Math.min(data.length, pageSize) < total
          : data.length > pageSize;
      const trimmed = nextPage ? data.slice(0, pageSize) : data;
      setTotalCount(total);
      if (trimmed.length === 0 && page > 1) {
        setHasNext(false);
        setItems([]);
        setPage((prev) => Math.max(1, prev - 1));
        return;
      }
      setItems(trimmed);
      setHasNext(nextPage);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [page, pageSize, filters, notify, getRankSystemsPage]);

  const loadAllRankSystems = useCallback(async () => {
    try {
      const data = await getAllRankSystems();
      setAllRankSystems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRankSystems, notify]);

  const loadAllRanks = useCallback(async () => {
    try {
      const limit = 200;
      let offset = 0;
      const collected: Rank[] = [];

      while (true) {
        const response = await getRanksPage({ limit, offset });
        const pageData = response?.data ?? [];
        collected.push(...pageData);
        const total =
          typeof response?.meta?.total === "number" ? response.meta.total : undefined;
        if (pageData.length < limit) {
          break;
        }
        if (total !== undefined && collected.length >= total) {
          break;
        }
        offset += limit;
      }

      setAllRanks(collected);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getRanksPage, notify]);

  const loadEnergyTypeItems = useCallback(async () => {
    try {
      const data = await getEnergyTypes(false);
      setEnergyTypes(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    if (!showLandscape) {
      return;
    }
    void loadAllRankSystems();
  }, [loadAllRankSystems, refreshKey, showLandscape]);

  useEffect(() => {
    if (!showLandscape) {
      return;
    }
    void loadAllRanks();
  }, [loadAllRanks, refreshKey, showLandscape]);

  useEffect(() => {
    void loadEnergyTypeItems();
  }, [loadEnergyTypeItems, refreshKey]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
  });

  const existingCodes = useMemo(
    () =>
      Array.from(
        new Set(
          allRankSystems
            .map((item) => item.code?.trim() ?? "")
            .filter((code) => code.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allRankSystems]
  );

  const existingCodeSet = useMemo(() => new Set(existingCodes), [existingCodes]);

  const codeOptions = useMemo(
    () => [
      ...existingCodes.map((code) => ({ value: code, label: code })),
      { value: CUSTOM_CODE_VALUE, label: t("Custom code") },
    ],
    [existingCodes, t]
  );

  const energyTypeOptions = useMemo(
    () => [
      ...energyTypes.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.code})`,
      })),
      { value: "__create__", label: t("Create energy type") },
    ],
    [energyTypes, t]
  );

  const handleFilterChange = (
    key: "q" | "name" | "domain" | "energyTypeId",
    value: string
  ) => {
    if (key === "energyTypeId" && value === "__create__") {
      navigate("/energy-types");
      return;
    }
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", domain: "", energyTypeId: "" });
  };

  const mapRankSystemToForm = (item: RankSystem): RankSystemFormState => ({
    name: item.name ?? "",
    code: item.code ?? "",
    description: item.description ?? "",
    domain: item.domain ?? "",
    energyTypeId: item.energyTypeId ?? "",
    priority: item.priority === undefined || item.priority === null ? "" : String(item.priority),
    isPrimary: Boolean(item.isPrimary),
    tags: item.tags ?? [],
  });

  const buildPayload = (state: RankSystemFormState): RankSystemPayload => ({
    name: state.name,
    code: state.code || undefined,
    description: state.description || undefined,
    domain: state.domain || undefined,
    energyTypeId: state.energyTypeId || undefined,
    priority: state.priority === "" ? undefined : Number(state.priority),
    isPrimary: state.isPrimary,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateRankSystem(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createRankSystem(payload);
      notify(t("Rank system created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: RankSystem) => {
    setEditItem(item);
    setEditValues(mapRankSystemToForm(item));
    setShowForm(false);
  };

  const handleEditCancel = () => {
    setEditItem(null);
    setEditValues(null);
  };

  const createCodeSelection = values.code
    ? existingCodeSet.has(values.code)
      ? values.code
      : CUSTOM_CODE_VALUE
    : "";

  const editCodeSelection =
    editValues && editValues.code
      ? existingCodeSet.has(editValues.code)
        ? editValues.code
        : CUSTOM_CODE_VALUE
      : "";

  const handleEditSave = async () => {
    if (!editItem || !editValues) {
      return;
    }
    const payload = buildPayload(editValues);
    const validation = validateRankSystem(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateRankSystem(editItem.id, payload);
      notify(t("Rank system updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: RankSystem) => {
    const confirmed = window.confirm(
      t("Delete this rank system? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteRankSystem(item.id);
      notify(t("Rank system deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Rank system nodes")}</h3>
            <p className="header__subtitle">{t("Click a row to inspect details.")}</p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new rank system")}
          </Button>
        </div>
        <FilterPanel>
          <TextInput
            label="Search"
            value={filters.q}
            onChange={(value) => handleFilterChange("q", value)}
            placeholder="Search..."
          />
          <TextInput
            label="Name"
            value={filters.name}
            onChange={(value) => handleFilterChange("name", value)}
          />
          <TextInput
            label="Domain"
            value={filters.domain}
            onChange={(value) => handleFilterChange("domain", value)}
          />
          <Select
            label="Energy Type"
            value={filters.energyTypeId}
            onChange={(value) => handleFilterChange("energyTypeId", value)}
            options={energyTypeOptions}
            placeholder={energyTypes.length > 0 ? "All" : "No energy types yet."}
          />
          <div className="form-field filter-actions">
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        </FilterPanel>
        <div className="filter-block">
          <button
            type="button"
            className="filter-toggle"
            onClick={() => setShowLandscape((prev) => !prev)}
            aria-expanded={showLandscape}
          >
            <img className="filter-toggle__icon" src={boardIcon} alt={t("Board")} />
            <span className="filter-toggle__label">
              {showLandscape ? t("Hide board") : t("Show board")}
            </span>
          </button>
        </div>
        {showLandscape && (
          <div className="card rank-system-landscape-card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Rank system landscape")}</h3>
                <p className="header__subtitle">
                  {t("Compare systems side by side, grouped by tier.")}
                </p>
              </div>
            </div>
            <RankSystemLandscapeBoard rankSystems={allRankSystems} ranks={allRanks} />
          </div>
        )}
        <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
        {showList && (
          <>
            <RankSystemList
              items={items}
              onEdit={handleEditOpen}
              onDelete={handleDelete}
            />
            {(items.length > 0 || page > 1 || hasNext) && (
              <Pagination
                page={page}
                pageSize={pageSize}
                itemCount={items.length}
                hasNext={hasNext}
                totalCount={totalCount}
                onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit rank system")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Rank System Identity"
            description="Core identity, domain, energy, and priority."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={editValues.name}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, name: value })
                }
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Code"
                value={editCodeSelection}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? {
                          ...prev,
                          code: value === CUSTOM_CODE_VALUE ? "" : value,
                        }
                      : prev
                  )
                }
                options={codeOptions}
                placeholder={existingCodes.length > 0 ? "Select" : "No code yet."}
              />
            </div>
            {editCodeSelection === CUSTOM_CODE_VALUE && (
              <div className="form-field--narrow">
                <TextInput
                  label="Custom code"
                  value={editValues.code}
                  onChange={(value) =>
                    setEditValues((prev) => prev && { ...prev, code: value })
                  }
                  placeholder="Enter new code"
                />
              </div>
            )}
            <div className="form-field--narrow">
              <TextInput
                label="Domain"
                value={editValues.domain}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, domain: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Energy Type"
                value={editValues.energyTypeId}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/energy-types");
                    return;
                  }
                  setEditValues((prev) =>
                    prev ? { ...prev, energyTypeId: value } : prev
                  );
                }}
                options={energyTypeOptions}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Priority"
                type="number"
                value={editValues.priority}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, priority: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Primary")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isPrimary}
                  onChange={(event) =>
                    setEditValues(
                      (prev) => prev && { ...prev, isPrimary: event.target.checked }
                    )
                  }
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
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

          <FormSection title="Notes & Tags" description="Extra indexing tags.">
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
          <FormSection
            title="Rank System Identity"
            description="Core identity, domain, energy, and priority."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Code"
                value={createCodeSelection}
                onChange={(value) =>
                  setField("code", value === CUSTOM_CODE_VALUE ? "" : value)
                }
                options={codeOptions}
                placeholder={existingCodes.length > 0 ? "Select" : "No code yet."}
              />
            </div>
            {createCodeSelection === CUSTOM_CODE_VALUE && (
              <div className="form-field--narrow">
                <TextInput
                  label="Custom code"
                  value={values.code}
                  onChange={(value) => setField("code", value)}
                  placeholder="Enter new code"
                />
              </div>
            )}
            <div className="form-field--narrow">
              <TextInput
                label="Domain"
                value={values.domain}
                onChange={(value) => setField("domain", value)}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Energy Type"
                value={values.energyTypeId}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/energy-types");
                    return;
                  }
                  setField("energyTypeId", value);
                }}
                options={energyTypeOptions}
                placeholder={t("Select")}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Priority"
                type="number"
                value={values.priority}
                onChange={(value) => setField("priority", value)}
              />
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Primary")}</span>
                <input
                  type="checkbox"
                  checked={values.isPrimary}
                  onChange={(event) => setField("isPrimary", event.target.checked)}
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra indexing tags.">
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
              {t("Create rank system")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
