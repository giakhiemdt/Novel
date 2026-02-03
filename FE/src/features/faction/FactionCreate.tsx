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
import { createFaction, deleteFaction, getAllFactions, updateFaction } from "./faction.api";
import { FactionList } from "./FactionList";
import { validateFaction } from "./faction.schema";
import type { Faction, FactionPayload } from "./faction.types";

const initialState = {
  name: "",
  alias: [] as string[],
  type: "",
  alignment: "",
  isPublic: false,
  isCanon: false,
  ideology: "",
  goal: "",
  doctrine: "",
  taboos: [] as string[],
  powerLevel: "",
  influenceScope: "",
  militaryPower: "",
  specialAssets: [] as string[],
  leadershipType: "",
  leaderTitle: "",
  hierarchyNote: "",
  memberPolicy: "",
  foundingStory: "",
  ageEstimate: "",
  majorConflicts: [] as string[],
  reputation: "",
  currentStatus: "",
  currentStrategy: "",
  knownEnemies: [] as string[],
  knownAllies: [] as string[],
  notes: "",
  tags: [] as string[],
};

type FactionFormState = typeof initialState;

export const FactionCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<FactionFormState>(initialState);
  const [items, setItems] = useState<Faction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Faction | null>(null);
  const [editValues, setEditValues] = useState<FactionFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { notify } = useToast();

  const loadItems = useCallback(async () => {
    try {
      const data = await getAllFactions();
      setItems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllFactions]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useProjectChange(() => {
    void loadItems();
  });

  const mapFactionToForm = (item: Faction): FactionFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    type: item.type ?? "",
    alignment: item.alignment ?? "",
    isPublic: item.isPublic ?? false,
    isCanon: item.isCanon ?? false,
    ideology: item.ideology ?? "",
    goal: item.goal ?? "",
    doctrine: item.doctrine ?? "",
    taboos: item.taboos ?? [],
    powerLevel: item.powerLevel !== undefined ? String(item.powerLevel) : "",
    influenceScope: item.influenceScope ?? "",
    militaryPower: item.militaryPower ?? "",
    specialAssets: item.specialAssets ?? [],
    leadershipType: item.leadershipType ?? "",
    leaderTitle: item.leaderTitle ?? "",
    hierarchyNote: item.hierarchyNote ?? "",
    memberPolicy: item.memberPolicy ?? "",
    foundingStory: item.foundingStory ?? "",
    ageEstimate: item.ageEstimate ?? "",
    majorConflicts: item.majorConflicts ?? [],
    reputation: item.reputation ?? "",
    currentStatus: item.currentStatus ?? "",
    currentStrategy: item.currentStrategy ?? "",
    knownEnemies: item.knownEnemies ?? [],
    knownAllies: item.knownAllies ?? [],
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): FactionPayload => ({
    name: values.name,
    alias: values.alias,
    type: values.type || undefined,
    alignment: values.alignment || undefined,
    isPublic: values.isPublic,
    isCanon: values.isCanon,
    ideology: values.ideology || undefined,
    goal: values.goal || undefined,
    doctrine: values.doctrine || undefined,
    taboos: values.taboos,
    powerLevel: values.powerLevel === "" ? undefined : Number(values.powerLevel),
    influenceScope: values.influenceScope || undefined,
    militaryPower: values.militaryPower || undefined,
    specialAssets: values.specialAssets,
    leadershipType: values.leadershipType || undefined,
    leaderTitle: values.leaderTitle || undefined,
    hierarchyNote: values.hierarchyNote || undefined,
    memberPolicy: values.memberPolicy || undefined,
    foundingStory: values.foundingStory || undefined,
    ageEstimate: values.ageEstimate || undefined,
    majorConflicts: values.majorConflicts,
    reputation: values.reputation || undefined,
    currentStatus: values.currentStatus || undefined,
    currentStrategy: values.currentStrategy || undefined,
    knownEnemies: values.knownEnemies,
    knownAllies: values.knownAllies,
    notes: values.notes || undefined,
    tags: values.tags,
  });

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateFaction(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }

    try {
      const created = await createFaction(payload);
      notify(t("Faction created successfully."), "success");
      reset();
      setShowForm(false);
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Faction) => {
    setEditItem(item);
    setEditValues(mapFactionToForm(item));
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
    setIsSavingEdit(true);
    try {
      await updateFaction(editItem.id, {
        name: editValues.name,
        alias: editValues.alias,
        type: editValues.type || undefined,
        alignment: editValues.alignment || undefined,
        isPublic: editValues.isPublic,
        isCanon: editValues.isCanon,
        ideology: editValues.ideology || undefined,
        goal: editValues.goal || undefined,
        doctrine: editValues.doctrine || undefined,
        taboos: editValues.taboos,
        powerLevel:
          editValues.powerLevel === "" ? undefined : Number(editValues.powerLevel),
        influenceScope: editValues.influenceScope || undefined,
        militaryPower: editValues.militaryPower || undefined,
        specialAssets: editValues.specialAssets,
        leadershipType: editValues.leadershipType || undefined,
        leaderTitle: editValues.leaderTitle || undefined,
        hierarchyNote: editValues.hierarchyNote || undefined,
        memberPolicy: editValues.memberPolicy || undefined,
        foundingStory: editValues.foundingStory || undefined,
        ageEstimate: editValues.ageEstimate || undefined,
        majorConflicts: editValues.majorConflicts,
        reputation: editValues.reputation || undefined,
        currentStatus: editValues.currentStatus || undefined,
        currentStrategy: editValues.currentStrategy || undefined,
        knownEnemies: editValues.knownEnemies,
        knownAllies: editValues.knownAllies,
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Faction updated successfully."), "success");
      await loadItems();
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Faction) => {
    const confirmed = window.confirm(
      t("Delete this faction? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteFaction(item.id);
      notify(t("Faction deleted."), "success");
      if (editItem?.id === item.id) {
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
            <h3 className="section-title">{t("Faction nodes")}</h3>
            <p className="header__subtitle">
              {t("Click a row to inspect details.")}
            </p>
          </div>
          <Button onClick={() => setShowForm((prev) => !prev)} variant="primary">
            {showForm ? t("Close form") : t("Create new faction")}
          </Button>
        </div>
        <FactionList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
      </div>

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit faction")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Faction Identity" description="Core public info and alignment.">
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
              <TextInput
                label="Type"
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, type: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Alignment"
                value={editValues.alignment}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, alignment: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Public")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isPublic}
                  onChange={(event) =>
                    setEditValues(
                      (prev) => prev && { ...prev, isPublic: event.target.checked }
                    )
                  }
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
            </div>
            <div className="form-field--narrow">
              <label className="toggle">
                <span>{t("Canon")}</span>
                <input
                  type="checkbox"
                  checked={editValues.isCanon}
                  onChange={(event) =>
                    setEditValues(
                      (prev) => prev && { ...prev, isCanon: event.target.checked }
                    )
                  }
                />
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </label>
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
          </FormSection>

          <FormSection title="Belief System" description="Doctrine and ideology details.">
            <div className="form-field--wide">
              <TextInput
                label="Ideology"
                value={editValues.ideology}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, ideology: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Goal"
                value={editValues.goal}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, goal: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Doctrine"
                value={editValues.doctrine}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, doctrine: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Taboos"
                values={editValues.taboos}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, taboos: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Founding Story"
                value={editValues.foundingStory}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, foundingStory: value })
                }
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Age Estimate"
                value={editValues.ageEstimate}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, ageEstimate: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Power & Influence" description="How the faction shapes the world.">
            <div className="form-field--narrow form-field--compact">
              <TextInput
                label="Power Level"
                type="number"
                value={editValues.powerLevel}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, powerLevel: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Influence Scope"
                value={editValues.influenceScope}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, influenceScope: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Military Power"
                value={editValues.militaryPower}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, militaryPower: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Special Assets"
                values={editValues.specialAssets}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, specialAssets: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Major Conflicts"
                values={editValues.majorConflicts}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, majorConflicts: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Reputation"
                value={editValues.reputation}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, reputation: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Leadership" description="Hierarchy and member policies.">
            <div className="form-field--wide">
              <TextInput
                label="Leadership Type"
                value={editValues.leadershipType}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, leadershipType: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Leader Title"
                value={editValues.leaderTitle}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, leaderTitle: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Hierarchy Note"
                value={editValues.hierarchyNote}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, hierarchyNote: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Member Policy"
                value={editValues.memberPolicy}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, memberPolicy: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Current Status" description="Relations and current strategy.">
            <div className="form-field--wide">
              <TextInput
                label="Current Status"
                value={editValues.currentStatus}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, currentStatus: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <TextInput
                label="Current Strategy"
                value={editValues.currentStrategy}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, currentStrategy: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Known Enemies"
                values={editValues.knownEnemies}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, knownEnemies: value })
                }
              />
            </div>
            <div className="form-field--wide">
              <MultiSelect
                label="Known Allies"
                values={editValues.knownAllies}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, knownAllies: value })
                }
              />
            </div>
          </FormSection>

          <FormSection title="Notes & Tags" description="Extra context for the archive.">
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
      <FormSection title="Faction Identity" description="Core public info and alignment.">
        <div className="form-field--wide">
          <TextInput
            label="Name"
            value={values.name}
            onChange={(value) => setField("name", value)}
            required
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Type"
            value={values.type}
            onChange={(value) => setField("type", value)}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Alignment"
            value={values.alignment}
            onChange={(value) => setField("alignment", value)}
          />
        </div>
        <div className="form-field--narrow">
          <label className="toggle">
            <span>{t("Public")}</span>
            <input
              type="checkbox"
              checked={values.isPublic}
              onChange={(event) => setField("isPublic", event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
          </label>
        </div>
        <div className="form-field--narrow">
          <label className="toggle">
            <span>{t("Canon")}</span>
            <input
              type="checkbox"
              checked={values.isCanon}
              onChange={(event) => setField("isCanon", event.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
          </label>
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Alias"
            values={values.alias}
            onChange={(value) => setField("alias", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Belief System" description="Doctrine and ideology details.">
        <div className="form-field--wide">
          <TextInput
            label="Ideology"
            value={values.ideology}
            onChange={(value) => setField("ideology", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Goal"
            value={values.goal}
            onChange={(value) => setField("goal", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Doctrine"
            value={values.doctrine}
            onChange={(value) => setField("doctrine", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Taboos"
            values={values.taboos}
            onChange={(value) => setField("taboos", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Founding Story"
            value={values.foundingStory}
            onChange={(value) => setField("foundingStory", value)}
          />
        </div>
        <div className="form-field--narrow">
          <TextInput
            label="Age Estimate"
            value={values.ageEstimate}
            onChange={(value) => setField("ageEstimate", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Power & Influence" description="How the faction shapes the world.">
        <div className="form-field--narrow form-field--compact">
          <TextInput
            label="Power Level"
            type="number"
            value={values.powerLevel}
            onChange={(value) => setField("powerLevel", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Influence Scope"
            value={values.influenceScope}
            onChange={(value) => setField("influenceScope", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Military Power"
            value={values.militaryPower}
            onChange={(value) => setField("militaryPower", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Special Assets"
            values={values.specialAssets}
            onChange={(value) => setField("specialAssets", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Major Conflicts"
            values={values.majorConflicts}
            onChange={(value) => setField("majorConflicts", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Reputation"
            value={values.reputation}
            onChange={(value) => setField("reputation", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Leadership" description="Hierarchy and member policies.">
        <div className="form-field--wide">
          <TextInput
            label="Leadership Type"
            value={values.leadershipType}
            onChange={(value) => setField("leadershipType", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Leader Title"
            value={values.leaderTitle}
            onChange={(value) => setField("leaderTitle", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Hierarchy Note"
            value={values.hierarchyNote}
            onChange={(value) => setField("hierarchyNote", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Member Policy"
            value={values.memberPolicy}
            onChange={(value) => setField("memberPolicy", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Current Status" description="Relations and current strategy.">
        <div className="form-field--wide">
          <TextInput
            label="Current Status"
            value={values.currentStatus}
            onChange={(value) => setField("currentStatus", value)}
          />
        </div>
        <div className="form-field--wide">
          <TextInput
            label="Current Strategy"
            value={values.currentStrategy}
            onChange={(value) => setField("currentStrategy", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Known Enemies"
            values={values.knownEnemies}
            onChange={(value) => setField("knownEnemies", value)}
          />
        </div>
        <div className="form-field--wide">
          <MultiSelect
            label="Known Allies"
            values={values.knownAllies}
            onChange={(value) => setField("knownAllies", value)}
          />
        </div>
      </FormSection>

      <FormSection title="Notes & Tags" description="Extra context for the archive.">
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
          {t("Create faction")}
        </Button>
      </div>
        </>
      )}
    </div>
  );
};
