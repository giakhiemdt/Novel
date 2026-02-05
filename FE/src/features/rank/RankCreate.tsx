import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createRank,
  deleteRank,
  getAllRanks,
  linkRank,
  unlinkRank,
  updateRank,
} from "./rank.api";
import { RankBoard } from "./RankBoard";
import { RankList } from "./RankList";
import { validateRank } from "./rank.schema";
import type { Rank, RankPayload } from "./rank.types";

const initialState = {
  name: "",
  alias: [] as string[],
  tier: "",
  system: "",
  description: "",
  notes: "",
  tags: [] as string[],
};

type RankFormState = typeof initialState;

export const RankCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<RankFormState>(initialState);
  const [items, setItems] = useState<Rank[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Rank | null>(null);
  const [editValues, setEditValues] = useState<RankFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [links, setLinks] = useState<Record<string, { previousId?: string; conditions?: string[] }>>({});
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await getAllRanks();
      setItems(data ?? []);
      setLinks((prev) => {
        const next: Record<string, { previousId?: string; conditions?: string[] }> = {};
        (data ?? []).forEach((item) => {
          if (item.previousId) {
            next[item.id] = { previousId: item.previousId, conditions: item.conditions ?? [] };
          } else if (prev[item.id]) {
            next[item.id] = prev[item.id];
          }
        });
        return next;
      });
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRanks]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useProjectChange(() => {
    void loadItems();
  });

  const mapRankToForm = (item: Rank): RankFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    tier: item.tier ?? "",
    system: item.system ?? "",
    description: item.description ?? "",
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (state: RankFormState): RankPayload => ({
    name: state.name,
    alias: state.alias,
    tier: state.tier || undefined,
    system: state.system || undefined,
    description: state.description || undefined,
    notes: state.notes || undefined,
    tags: state.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload(values);
    const validation = validateRank(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      await createRank(payload);
      notify(t("Rank created successfully."), "success");
      reset();
      setShowForm(false);
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Rank) => {
    setEditItem(item);
    setEditValues(mapRankToForm(item));
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
    const validation = validateRank(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateRank(editItem.id, payload);
      notify(t("Rank updated successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Rank) => {
    const confirmed = window.confirm(
      t("Delete this rank? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteRank(item.id);
      notify(t("Rank deleted."), "success");
      if (editItem?.id === item.id) {
        handleEditCancel();
      }
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const promptConditions = () => {
    const input = window.prompt(
      t("Conditions to rank up (comma separated)")
    );
    if (!input) {
      return [];
    }
    return input
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  };

  const handleBoardLink = async (currentId: string, previousId: string) => {
    try {
      const conditions = promptConditions();
      const response = await linkRank({ currentId, previousId, conditions });
      setLinks((prev) => ({
        ...prev,
        [currentId]: { previousId, conditions },
      }));
      notify(`Linked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardRelink = async (currentId: string, previousId: string) => {
    try {
      const existingPrev = links[currentId]?.previousId;
      if (existingPrev) {
        await unlinkRank({ currentId, previousId: existingPrev });
      }
      const conditions = promptConditions();
      const response = await linkRank({ currentId, previousId, conditions });
      setLinks((prev) => ({
        ...prev,
        [currentId]: { previousId, conditions },
      }));
      notify(`Relinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardUnlink = async (currentId: string, previousId: string) => {
    try {
      const response = await unlinkRank({ currentId, previousId });
      setLinks((prev) => ({ ...prev, [currentId]: {} }));
      notify(`Unlinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Rank nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new rank")}
          </Button>
        </div>
        <RankBoard
          items={items}
          links={links}
          selectedId={editItem?.id}
          onSelect={(item) => item && handleEditOpen(item)}
          onLink={handleBoardLink}
          onRelink={handleBoardRelink}
          onUnlink={handleBoardUnlink}
        />
        <RankList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit rank")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection
            title="Rank Identity"
            description="Core tiering, system, and aliases."
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
            <div className="form-field--wide">
              <MultiSelect
                label="Alias"
                values={editValues.alias}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, alias: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Tier"
                value={editValues.tier}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, tier: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="System"
                value={editValues.system}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, system: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={editValues.description}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, description: value })
                }
                placeholder="Short summary or hierarchy description"
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra details and tags.">
            <div className="form-field--wide">
              <TextArea
                label="Notes"
                value={editValues.notes}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, notes: value })
                }
              />
            </div>
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
            title="Rank Identity"
            description="Core tiering, system, and aliases."
          >
            <div className="form-field--wide">
              <TextInput
                label="Name"
                value={values.name}
                onChange={(value) => setField("name", value)}
                required
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Alias"
                values={values.alias}
                onChange={(value) => setField("alias", value)}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Tier"
                value={values.tier}
                onChange={(value) => setField("tier", value)}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="System"
                value={values.system}
                onChange={(value) => setField("system", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
                placeholder="Short summary or hierarchy description"
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra details and tags.">
            <div className="form-field--wide">
              <TextArea
                label="Notes"
                value={values.notes}
                onChange={(value) => setField("notes", value)}
              />
            </div>
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
              {t("Create rank")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
