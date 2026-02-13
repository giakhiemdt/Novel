import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { getAllCharacters } from "../character/character.api";
import type { Character } from "../character/character.types";
import {
  createRelation,
  deleteRelation,
  getRelations,
  updateRelation,
} from "./relationship.api";
import {
  createRelationshipType,
  deleteRelationshipType,
  getRelationshipTypes,
  updateRelationshipType,
} from "./relationship-type.api";
import type {
  RelationshipType,
  RelationshipTypePayload,
} from "./relationship-type.types";
import { RelationshipGraph } from "./RelationshipGraph";
import { RelationshipList } from "./RelationshipList";
import { validateRelation } from "./relationship.schema";
import type {
  CharacterRelation,
  CharacterRelationPayload,
} from "./relationship.types";

const initialState = {
  fromId: "",
  toId: "",
  type: "",
  startYear: "",
  endYear: "",
  note: "",
};

type RelationFormState = typeof initialState;

const initialTypeState = {
  code: "",
  name: "",
  description: "",
  color: "#6B7280",
  isDirectional: false,
  isActive: true,
};

type TypeFormState = typeof initialTypeState;

export const RelationshipCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<RelationFormState>(initialState);
  const [items, setItems] = useState<CharacterRelation[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CharacterRelation | null>(null);
  const [editValues, setEditValues] = useState<RelationFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    characterId: "",
    type: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [typeForm, setTypeForm] = useState<TypeFormState>(initialTypeState);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const { notify } = useToast();

  const charactersById = useMemo(
    () =>
      characters.reduce<Record<string, string>>((acc, character) => {
        acc[character.id] = character.name;
        return acc;
      }, {}),
    [characters]
  );

  const relationshipTypesByCode = useMemo(
    () =>
      relationshipTypes.reduce<Record<string, string>>((acc, item) => {
        acc[item.code] = item.name;
        return acc;
      }, {}),
    [relationshipTypes]
  );

  const relationshipTypeMetaByCode = useMemo(
    () =>
      relationshipTypes.reduce<Record<string, { name: string; color?: string }>>(
        (acc, item) => {
          acc[item.code] = { name: item.name, color: item.color };
          return acc;
        },
        {}
      ),
    [relationshipTypes]
  );

  const activeRelationshipTypes = useMemo(
    () => relationshipTypes.filter((item) => item.isActive),
    [relationshipTypes]
  );

  const typeOptions = useMemo(
    () =>
      activeRelationshipTypes.map((item) => ({
        value: item.code,
        label: `${item.name} (${item.code})`,
      })),
    [activeRelationshipTypes]
  );

  const loadItems = useCallback(async () => {
    try {
      const data = await getRelations({
        characterId: filters.characterId || undefined,
        type: filters.type || undefined,
      });
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [filters, notify]);

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setCharacters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  const loadRelationshipTypeItems = useCallback(async () => {
    try {
      const data = await getRelationshipTypes(false);
      setRelationshipTypes(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    void loadItems();
  }, [loadItems, refreshKey]);

  useEffect(() => {
    void loadCharacters();
    void loadRelationshipTypeItems();
  }, [loadCharacters, loadRelationshipTypeItems]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadCharacters();
    void loadRelationshipTypeItems();
  });

  const handleFilterChange = (key: "characterId" | "type", value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ characterId: "", type: "" });
  };

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const hasNext = page * pageSize < items.length;

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [items.length, pageSize, page]);

  const mapRelationToForm = (item: CharacterRelation): RelationFormState => ({
    fromId: item.fromId ?? "",
    toId: item.toId ?? "",
    type: item.type ?? "",
    startYear: item.startYear !== undefined ? String(item.startYear) : "",
    endYear: item.endYear !== undefined ? String(item.endYear) : "",
    note: item.note ?? "",
  });

  const buildRelationPayload = (
    state: RelationFormState
  ): CharacterRelationPayload => ({
    fromId: state.fromId,
    toId: state.toId,
    type: state.type,
    startYear: state.startYear === "" ? undefined : Number(state.startYear),
    endYear: state.endYear === "" ? undefined : Number(state.endYear),
    note: state.note || undefined,
  });

  const handleSubmit = async () => {
    const payload = buildRelationPayload(values);
    const validation = validateRelation(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createRelation(payload);
      notify(t("Relationship created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: CharacterRelation) => {
    setEditItem(item);
    setEditValues(mapRelationToForm(item));
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
    const payload = buildRelationPayload(editValues);
    const validation = validateRelation(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateRelation(payload);
      notify(t("Relationship updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: CharacterRelation) => {
    const confirmed = window.confirm(
      t("Delete this relationship? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteRelation({
        fromId: item.fromId,
        toId: item.toId,
        type: item.type,
        startYear: item.startYear,
        endYear: item.endYear,
        note: item.note,
      });
      notify(t("Relationship deleted."), "success");
      if (
        editItem &&
        editItem.fromId === item.fromId &&
        editItem.toId === item.toId &&
        editItem.type === item.type
      ) {
        handleEditCancel();
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const mapTypeToForm = (item: RelationshipType): TypeFormState => ({
    code: item.code,
    name: item.name,
    description: item.description ?? "",
    color: item.color ?? "#6B7280",
    isDirectional: item.isDirectional,
    isActive: item.isActive,
  });

  const buildTypePayload = (state: TypeFormState): RelationshipTypePayload => ({
    code: state.code.trim().toLowerCase(),
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    color: state.color.trim() || undefined,
    isDirectional: state.isDirectional,
    isActive: state.isActive,
  });

  const validateTypePayload = (payload: RelationshipTypePayload): boolean => {
    if (!payload.code || !payload.name) {
      notify(t("Missing required fields: code, name"), "error");
      return false;
    }
    return true;
  };

  const handleTypeSubmit = async () => {
    const payload = buildTypePayload(typeForm);
    if (!validateTypePayload(payload)) {
      return;
    }

    setIsSavingType(true);
    try {
      if (editingTypeId) {
        await updateRelationshipType(editingTypeId, payload);
        notify(t("Relationship type updated."), "success");
      } else {
        await createRelationshipType(payload);
        notify(t("Relationship type created."), "success");
      }
      setTypeForm(initialTypeState);
      setEditingTypeId(null);
      await loadRelationshipTypeItems();
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingType(false);
    }
  };

  const handleTypeEdit = (item: RelationshipType) => {
    setEditingTypeId(item.id);
    setTypeForm(mapTypeToForm(item));
  };

  const handleTypeCancel = () => {
    setEditingTypeId(null);
    setTypeForm(initialTypeState);
  };

  const handleTypeToggleActive = async (item: RelationshipType) => {
    try {
      await updateRelationshipType(item.id, {
        code: item.code,
        name: item.name,
        description: item.description,
        color: item.color,
        isDirectional: item.isDirectional,
        isActive: !item.isActive,
      });
      notify(t("Relationship type updated."), "success");
      await loadRelationshipTypeItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleTypeDelete = async (item: RelationshipType) => {
    const confirmed = window.confirm(
      t("Delete this relationship type? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteRelationshipType(item.id);
      notify(t("Relationship type deleted."), "success");
      await loadRelationshipTypeItems();
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
            <h3 className="section-title">{t("Relationship nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new relationship")}
          </Button>
        </div>
        <FilterPanel>
          <Select
            label="Character"
            value={filters.characterId}
            onChange={(value) => handleFilterChange("characterId", value)}
            options={characters.map((character) => ({
              value: character.id,
              label: character.name,
            }))}
            placeholder="All"
          />
          <Select
            label="Type"
            value={filters.type}
            onChange={(value) => handleFilterChange("type", value)}
            options={typeOptions}
            placeholder="All"
          />
          <div className="form-field filter-actions">
            <Button type="button" variant="ghost" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        </FilterPanel>
        <RelationshipList
          items={pagedItems}
          charactersById={charactersById}
          relationshipTypesByCode={relationshipTypesByCode}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
        />
        {(items.length > 0 || page > 1 || hasNext) && (
          <Pagination
            page={page}
            pageSize={pageSize}
            itemCount={pagedItems.length}
            hasNext={hasNext}
            totalCount={items.length}
            onPageChange={(nextPage) => setPage(Math.max(1, nextPage))}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        )}
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Relationship graph")}</h3>
            <p className="header__subtitle">
              {t("Visual map of character-to-character connections.")}
            </p>
          </div>
        </div>
        <RelationshipGraph
          items={items}
          charactersById={charactersById}
          relationshipTypesByCode={relationshipTypeMetaByCode}
        />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit relationship")}</h3>
                <p className="header__subtitle">
                  {charactersById[editItem.fromId] ?? editItem.fromId}
                  {" -> "}
                  {charactersById[editItem.toId] ?? editItem.toId}
                </p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Relationship" description="Define character links.">
            <div className="form-field--wide">
              <Select
                label="From"
                value={editValues.fromId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, fromId: value })
                }
                options={characters.map((character) => ({
                  label: character.name,
                  value: character.id,
                }))}
                placeholder={t("Select character")}
                required
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="To"
                value={editValues.toId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, toId: value })
                }
                options={characters.map((character) => ({
                  label: character.name,
                  value: character.id,
                }))}
                placeholder={t("Select character")}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, type: value } : prev
                  )
                }
                options={typeOptions}
                required
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Optional time range.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Start Year"
                type="number"
                value={editValues.startYear}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, startYear: value })
                }
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="End Year"
                type="number"
                value={editValues.endYear}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, endYear: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes" description="Extra context for this relationship.">
            <div className="form-field--wide">
              <TextArea
                label="Note"
                value={editValues.note}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, note: value })
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
          <FormSection title="Relationship" description="Define character links.">
            <div className="form-field--wide">
              <Select
                label="From"
                value={values.fromId}
                onChange={(value) => setField("fromId", value)}
                options={characters.map((character) => ({
                  label: character.name,
                  value: character.id,
                }))}
                placeholder={t("Select character")}
                required
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="To"
                value={values.toId}
                onChange={(value) => setField("toId", value)}
                options={characters.map((character) => ({
                  label: character.name,
                  value: character.id,
                }))}
                placeholder={t("Select character")}
                required
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type"
                value={values.type}
                onChange={(value) => setField("type", value)}
                options={typeOptions}
                required
              />
            </div>
          </FormSection>

          <FormSection title="Timeline" description="Optional time range.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Start Year"
                type="number"
                value={values.startYear}
                onChange={(value) => setField("startYear", value)}
              />
            </div>
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="End Year"
                type="number"
                value={values.endYear}
                onChange={(value) => setField("endYear", value)}
              />
            </div>
          </FormSection>

          <FormSection title="Notes" description="Extra context for this relationship.">
            <div className="form-field--wide">
              <TextArea
                label="Note"
                value={values.note}
                onChange={(value) => setField("note", value)}
              />
            </div>
          </FormSection>

          <div className="card">
            <Button onClick={handleSubmit} variant="primary">
              {t("Create relationship")}
            </Button>
          </div>
        </>
      )}

      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Relationship type definitions")}</h3>
            <p className="header__subtitle">
              {t("Manage available relationship types used by character relations.")}
            </p>
          </div>
          {editingTypeId && (
            <Button variant="ghost" onClick={handleTypeCancel}>
              {t("Cancel")}
            </Button>
          )}
        </div>

        {relationshipTypes.length === 0 ? (
          <p className="header__subtitle">{t("No relationship types yet.")}</p>
        ) : (
          <table className="table table--clean">
            <thead>
              <tr>
                <th>{t("Code")}</th>
                <th>{t("Name")}</th>
                <th>{t("Directional")}</th>
                <th>{t("Active")}</th>
                <th>{t("System")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {relationshipTypes.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.isDirectional ? t("Yes") : t("No")}</td>
                  <td>{item.isActive ? t("Yes") : t("No")}</td>
                  <td>{item.isSystem ? t("Yes") : t("No")}</td>
                  <td className="table__actions">
                    <button
                      type="button"
                      className="table__action table__action--ghost"
                      onClick={() => handleTypeEdit(item)}
                    >
                      {t("Edit")}
                    </button>
                    <button
                      type="button"
                      className="table__action"
                      onClick={() => handleTypeToggleActive(item)}
                    >
                      {item.isActive ? t("Deactivate") : t("Activate")}
                    </button>
                    {!item.isSystem && (
                      <button
                        type="button"
                        className="table__action table__action--danger"
                        onClick={() => handleTypeDelete(item)}
                      >
                        {t("Delete")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormSection
        title={editingTypeId ? "Edit relationship type" : "Create relationship type"}
        description="Define reusable relationship type metadata."
      >
        <div className="form-field--narrow">
          <TextInput
            label="Code"
            value={typeForm.code}
            onChange={(value) =>
              setTypeForm((prev) => ({ ...prev, code: value.toLowerCase() }))
            }
            required
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Name"
            value={typeForm.name}
            onChange={(value) => setTypeForm((prev) => ({ ...prev, name: value }))}
            required
          />
        </div>
        <div className="form-field--wide">
          <TextArea
            label="Description"
            value={typeForm.description}
            onChange={(value) =>
              setTypeForm((prev) => ({ ...prev, description: value }))
            }
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Color"
            type="color"
            value={typeForm.color}
            onChange={(value) => setTypeForm((prev) => ({ ...prev, color: value }))}
          />
        </div>
        <div className="form-field--narrow">
          <label>
            <input
              type="checkbox"
              checked={typeForm.isDirectional}
              onChange={(event) =>
                setTypeForm((prev) => ({
                  ...prev,
                  isDirectional: event.target.checked,
                }))
              }
            />
            {" "}
            {t("Directional")}
          </label>
        </div>
        <div className="form-field--narrow">
          <label>
            <input
              type="checkbox"
              checked={typeForm.isActive}
              onChange={(event) =>
                setTypeForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            {" "}
            {t("Active")}
          </label>
        </div>
      </FormSection>

      <div className="card">
        <Button onClick={handleTypeSubmit} disabled={isSavingType}>
          {isSavingType
            ? t("Saving...")
            : editingTypeId
              ? t("Save type")
              : t("Create type")}
        </Button>
      </div>
    </div>
  );
};
