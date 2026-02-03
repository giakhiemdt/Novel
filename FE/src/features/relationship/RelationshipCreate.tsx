import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
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
import { RelationshipList } from "./RelationshipList";
import { validateRelation } from "./relationship.schema";
import type {
  CharacterRelation,
  CharacterRelationPayload,
  CharacterRelationType,
} from "./relationship.types";

const initialState = {
  fromId: "",
  toId: "",
  type: "" as CharacterRelationType | "",
  startYear: "",
  endYear: "",
  note: "",
};

type RelationFormState = typeof initialState;

const TYPE_OPTIONS: CharacterRelationType[] = [
  "family",
  "ally",
  "enemy",
  "romance",
  "mentor",
  "rival",
  "other",
];

export const RelationshipCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<RelationFormState>(initialState);
  const [items, setItems] = useState<CharacterRelation[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CharacterRelation | null>(null);
  const [editValues, setEditValues] = useState<RelationFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { notify } = useToast();

  const charactersById = useMemo(
    () =>
      characters.reduce<Record<string, string>>((acc, character) => {
        acc[character.id] = character.name;
        return acc;
      }, {}),
    [characters]
  );

  const loadItems = useCallback(async () => {
    try {
      const data = await getRelations();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getRelations]);

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setCharacters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllCharacters]);

  useEffect(() => {
    void loadItems();
    void loadCharacters();
  }, [loadItems, loadCharacters]);

  useProjectChange(() => {
    void loadItems();
    void loadCharacters();
  });

  const mapRelationToForm = (item: CharacterRelation): RelationFormState => ({
    fromId: item.fromId ?? "",
    toId: item.toId ?? "",
    type: item.type ?? "",
    startYear: item.startYear !== undefined ? String(item.startYear) : "",
    endYear: item.endYear !== undefined ? String(item.endYear) : "",
    note: item.note ?? "",
  });

  const buildPayload = (state: RelationFormState): CharacterRelationPayload => ({
    fromId: state.fromId,
    toId: state.toId,
    type: state.type as CharacterRelationType,
    startYear: state.startYear === "" ? undefined : Number(state.startYear),
    endYear: state.endYear === "" ? undefined : Number(state.endYear),
    note: state.note || undefined,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
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
      await loadItems();
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
    const payload = buildPayload(editValues);
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
      await loadItems();
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
      if (editItem &&
        editItem.fromId === item.fromId &&
        editItem.toId === item.toId &&
        editItem.type === item.type) {
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
            <h3 className="section-title">{t("Relationship nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new relationship")}
          </Button>
        </div>
        <RelationshipList
          items={items}
          charactersById={charactersById}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
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
                    prev ? { ...prev, type: value as CharacterRelationType } : prev
                  )
                }
                options={TYPE_OPTIONS.map((value) => ({
                  label: t(value),
                  value,
                }))}
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
                onChange={(value) =>
                  setField("type", value as CharacterRelationType)
                }
                options={TYPE_OPTIONS.map((value) => ({
                  label: t(value),
                  value,
                }))}
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
    </div>
  );
};
