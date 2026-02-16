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
  createRelationshipType,
  deleteRelationshipType,
  getRelationshipTypes,
  updateRelationshipType,
} from "../relationship/relationship-type.api";
import type {
  RelationshipType,
  RelationshipTypePayload,
} from "../relationship/relationship-type.types";

const initialTypeState = {
  code: "",
  name: "",
  description: "",
  color: "#6B7280",
  isDirectional: false,
  isActive: true,
};

type TypeFormState = typeof initialTypeState;

export const RelationshipTypeCreate = () => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [typeForm, setTypeForm] = useState<TypeFormState>(initialTypeState);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [isSavingType, setIsSavingType] = useState(false);
  const [pendingForceDeleteId, setPendingForceDeleteId] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadRelationshipTypeItems = useCallback(async () => {
    try {
      const data = await getRelationshipTypes(false);
      setRelationshipTypes(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [notify]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadRelationshipTypeItems();
  }, [loadRelationshipTypeItems, showList]);

  useProjectChange(() => {
    if (!showList) {
      return;
    }
    void loadRelationshipTypeItems();
  });

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
      if (showList) {
        await loadRelationshipTypeItems();
      }
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingType(false);
    }
  };

  const handleTypeEdit = (item: RelationshipType) => {
    setEditingTypeId(item.id);
    setTypeForm(mapTypeToForm(item));
    setShowForm(true);
  };

  const handleTypeCancel = () => {
    setEditingTypeId(null);
    setTypeForm(initialTypeState);
    setShowForm(false);
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
    if (pendingForceDeleteId === item.id) {
      try {
        await deleteRelationshipType(item.id, true);
        notify(t("Relationship type and linked relations deleted."), "success");
        setPendingForceDeleteId(null);
        await loadRelationshipTypeItems();
      } catch (forceErr) {
        notify((forceErr as Error).message, "error");
      }
      return;
    }

    try {
      await deleteRelationshipType(item.id);
      notify(t("Relationship type deleted."), "success");
      setPendingForceDeleteId(null);
      await loadRelationshipTypeItems();
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (message.includes("retry with force=true")) {
        setPendingForceDeleteId(item.id);
        notify(
          t("This type is used by existing relationships. Click delete again to remove linked relations too."),
          "error"
        );
        return;
      }
      setPendingForceDeleteId(null);
      notify(message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Relationship type definitions")}</h3>
            <p className="header__subtitle">
              {t("Manage available relationship types used by character relations.")}
            </p>
          </div>
          <div className="table__actions">
            <Button
              variant="ghost"
              onClick={() => {
                if (showForm) {
                  handleTypeCancel();
                  return;
                }
                setShowForm(true);
              }}
            >
              {showForm ? t("Close form") : t("Create new relationship type")}
            </Button>
            {editingTypeId && (
              <Button variant="ghost" onClick={handleTypeCancel}>
                {t("Cancel")}
              </Button>
            )}
          </div>
        </div>

        <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
        {showList &&
          (relationshipTypes.length === 0 ? (
            <p className="header__subtitle">{t("No relationship types yet.")}</p>
          ) : (
            <table className="table table--clean">
              <thead>
                <tr>
                  <th>{t("Code")}</th>
                  <th>{t("Name")}</th>
                  <th>{t("Directional")}</th>
                  <th>{t("Active")}</th>
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
                      <button
                        type="button"
                        className="table__action table__action--danger"
                        onClick={() => handleTypeDelete(item)}
                      >
                        {pendingForceDeleteId === item.id
                          ? t("Delete (confirm)")
                          : t("Delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      {showForm && (
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
      )}

      {showForm && (
      <div className="card">
        <Button onClick={handleTypeSubmit} disabled={isSavingType}>
          {isSavingType
            ? t("Saving...")
            : editingTypeId
              ? t("Save type")
              : t("Create type")}
        </Button>
      </div>
      )}
    </div>
  );
};
