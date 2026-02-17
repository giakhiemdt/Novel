import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { useToast } from "../../components/common/Toast";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TraitEditor } from "../../components/form/TraitEditor";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import boardIcon from "../../assets/icons/board.svg";
import {
  createRank,
  deleteRank,
  getAllRanks,
  getRanksPage,
  getRankBoardLayout,
  linkRank,
  saveRankBoardLayout,
  unlinkRank,
  updateRankLinkConditions,
  updateRank,
} from "./rank.api";
import { RankBoard, type RankLinkSelection } from "./RankBoard";
import { RankList } from "./RankList";
import { validateRank } from "./rank.schema";
import type {
  Rank,
  RankCondition,
  RankPayload,
  RankPreviousLink,
} from "./rank.types";
import { getAllRankSystems } from "../rank-system/rank-system.api";
import type { RankSystem } from "../rank-system/rank-system.types";
import {
  createEmptyTraitDraft,
  normalizeTraitArray,
  toTraitDrafts,
  toTraitPayload,
} from "../../utils/trait";

const initialState = {
  name: "",
  alias: [] as string[],
  tier: "",
  systemId: "",
  system: "",
  description: "",
  traits: [createEmptyTraitDraft()],
  notes: "",
  tags: [] as string[],
  color: "",
};

type RankFormState = typeof initialState;

const createEmptyCondition = (): RankCondition => ({
  name: "",
  description: "",
});

const normalizeConditionDraft = (conditions?: RankCondition[]): RankCondition[] => {
  const normalized = (conditions ?? [])
    .map((item) => ({
      name: item.name?.trim() ?? "",
      description: item.description?.trim() ?? "",
    }))
    .filter((item) => item.name.length > 0);
  return normalized.length > 0 ? normalized : [createEmptyCondition()];
};

const normalizeConditionPayload = (conditions: RankCondition[]): RankCondition[] =>
  conditions
    .map((item) => ({
      name: item.name.trim(),
      description: item.description?.trim() ?? "",
    }))
    .filter((item) => item.name.length > 0)
    .map((item) => ({
      name: item.name,
      description: item.description.length > 0 ? item.description : undefined,
    }));

export const RankCreate = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { values, setField, reset } = useForm<RankFormState>(initialState);
  const [items, setItems] = useState<Rank[]>([]);
  const [boardItems, setBoardItems] = useState<Rank[]>([]);
  const [rankSystems, setRankSystems] = useState<RankSystem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Rank | null>(null);
  const [editValues, setEditValues] = useState<RankFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [links, setLinks] = useState<Record<string, RankPreviousLink[]>>({});
  const [boardPositions, setBoardPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [boardLinkBends, setBoardLinkBends] = useState<
    Record<string, { midX: number }>
  >({});
  const [boardConditionNodePositions, setBoardConditionNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [selectedLink, setSelectedLink] = useState<{
    currentId: string;
    previousId: string;
  } | null>(null);
  const [linkConditionsDraft, setLinkConditionsDraft] = useState<RankCondition[]>([
    { name: "", description: "" },
  ]);
  const [isSavingLinkConditions, setIsSavingLinkConditions] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    tier: "",
    systemId: "",
    system: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [layoutSaveTimer, setLayoutSaveTimer] = useState<number | null>(null);
  const layoutLoadSeqRef = useRef(0);
  const hasLayoutInteractionRef = useRef(false);
  const layoutPositionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const layoutLinkBendsRef = useRef<Record<string, { midX: number }>>({});
  const layoutConditionNodePositionsRef = useRef<
    Record<string, { x: number; y: number }>
  >({});

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getRanksPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = (response?.data ?? []).map((item) => ({
        ...item,
        traits: normalizeTraitArray(item.traits),
      }));
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
  }, [page, pageSize, filters, notify, getRanksPage]);

  const loadBoardItems = useCallback(async () => {
    try {
      const data = await getAllRanks();
      const normalizedData = (data ?? []).map((item) => ({
        ...item,
        traits: normalizeTraitArray(item.traits),
      }));
      setBoardItems(normalizedData);
      setLinks(() => {
        const next: Record<string, RankPreviousLink[]> = {};
        normalizedData.forEach((item) => {
          const currentId = item.id;
          if (!currentId) {
            return;
          }
          const mapped =
            item.previousLinks?.map((link) => ({
              previousId: link.previousId,
              conditions: normalizeConditionPayload(link.conditions ?? []),
            })) ??
            (item.previousId
              ? [
                  {
                    previousId: item.previousId,
                    conditions: normalizeConditionPayload(item.conditions ?? []),
                  },
                ]
              : []);
          next[currentId] = mapped;
        });
        return next;
      });
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRanks, notify]);

  const loadRankSystems = useCallback(async () => {
    try {
      const data = await getAllRankSystems();
      setRankSystems(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllRankSystems, notify]);

  const loadBoardLayout = useCallback(async () => {
    const seq = layoutLoadSeqRef.current + 1;
    layoutLoadSeqRef.current = seq;
    try {
      const data = await getRankBoardLayout();
      if (seq !== layoutLoadSeqRef.current || hasLayoutInteractionRef.current) {
        return;
      }
      setBoardPositions(data?.positions ?? {});
      setBoardLinkBends(data?.linkBends ?? {});
      setBoardConditionNodePositions(data?.conditionNodePositions ?? {});
      layoutPositionsRef.current = data?.positions ?? {};
      layoutLinkBendsRef.current = data?.linkBends ?? {};
      layoutConditionNodePositionsRef.current = data?.conditionNodePositions ?? {};
      setLayoutRevision((prev) => prev + 1);
    } catch (err) {
      if (seq !== layoutLoadSeqRef.current || hasLayoutInteractionRef.current) {
        return;
      }
      const message = (err as Error).message;
      if (message !== "rank board layout not found") {
        notify(message, "error");
      }
      setBoardPositions({});
      setBoardLinkBends({});
      setBoardConditionNodePositions({});
      layoutPositionsRef.current = {};
      layoutLinkBendsRef.current = {};
      layoutConditionNodePositionsRef.current = {};
      setLayoutRevision((prev) => prev + 1);
    }
  }, [getRankBoardLayout, notify]);

  useEffect(() => {
    if (!showList) {
      return;
    }
    void loadItems();
  }, [loadItems, refreshKey, showList]);

  useEffect(() => {
    if (!showBoard) {
      return;
    }
    void loadBoardItems();
  }, [loadBoardItems, refreshKey, showBoard]);

  useEffect(() => {
    void loadRankSystems();
  }, [loadRankSystems]);

  useEffect(() => {
    if (!showBoard) {
      return;
    }
    void loadBoardLayout();
  }, [loadBoardLayout, showBoard]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    hasLayoutInteractionRef.current = false;
    void loadRankSystems();
    if (showBoard) {
      void loadBoardLayout();
    }
  });

  useEffect(() => {
    return () => {
      if (layoutSaveTimer !== null) {
        window.clearTimeout(layoutSaveTimer);
      }
    };
  }, [layoutSaveTimer]);

  useEffect(() => {
    if (!showBoard) {
      setSelectedLink(null);
      setLinkConditionsDraft([createEmptyCondition()]);
    }
  }, [showBoard]);

  const handleFilterChange = (
    key: "q" | "name" | "tag" | "tier" | "systemId" | "system",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({ q: "", name: "", tag: "", tier: "", systemId: "", system: "" });
  };

  const mapRankToForm = (item: Rank): RankFormState => ({
    name: item.name ?? "",
    alias: item.alias ?? [],
    tier: item.tier ?? "",
    systemId: item.systemId ?? "",
    system: item.system ?? "",
    description: item.description ?? "",
    traits: toTraitDrafts(item.traits),
    notes: item.notes ?? "",
    tags: item.tags ?? [],
    color: item.color ?? "",
  });

  const buildPayload = (state: RankFormState): RankPayload => ({
    name: state.name,
    alias: state.alias,
    tier: state.tier || undefined,
    systemId: state.systemId || undefined,
    system: state.system || undefined,
    description: state.description || undefined,
    traits: toTraitPayload(state.traits),
    notes: state.notes || undefined,
    tags: state.tags,
    color: state.color || undefined,
  });

  const handleBoardColorChange = async (id: string, value: string) => {
    const item =
      editItem?.id === id
        ? editItem
        : boardItems.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    setEditValues((prev) =>
      prev && editItem?.id === id ? { ...prev, color: value } : prev
    );
    setIsSavingColor(true);
    try {
      const base = mapRankToForm(item);
      const payload = buildPayload({ ...base, color: value });
      await updateRank(id, payload);
      notify(t("Rank updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingColor(false);
    }
  };

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
      setPage(1);
      setRefreshKey((prev) => prev + 1);
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

  const boardItemsById = useMemo(
    () =>
      new Map(
        boardItems
          .filter((item): item is Rank & { id: string } => Boolean(item.id))
          .map((item) => [item.id, item])
      ),
    [boardItems]
  );

  const rankSystemNameById = useMemo(
    () =>
      rankSystems.reduce<Record<string, string>>((acc, rankSystem) => {
        acc[rankSystem.id] = rankSystem.name;
        return acc;
      }, {}),
    [rankSystems]
  );

  const rankSystemOptions = useMemo(
    () => [
      ...rankSystems.map((rankSystem) => ({
        value: rankSystem.id,
        label: rankSystem.name,
      })),
      { value: "__create__", label: t("Create new rank system") },
    ],
    [rankSystems, t]
  );

  const visibleBoardItems = useMemo(() => {
    if (!filters.systemId) {
      return boardItems;
    }
    return boardItems.filter((item) => item.systemId === filters.systemId);
  }, [boardItems, filters.systemId]);

  useEffect(() => {
    if (editItem && filters.systemId && editItem.systemId !== filters.systemId) {
      setEditItem(null);
      setEditValues(null);
    }
    if (!selectedLink) {
      return;
    }
    const existsCurrent = visibleBoardItems.some(
      (item) => item.id === selectedLink.currentId
    );
    const existsPrevious = visibleBoardItems.some(
      (item) => item.id === selectedLink.previousId
    );
    if (!existsCurrent || !existsPrevious) {
      setSelectedLink(null);
      setLinkConditionsDraft([createEmptyCondition()]);
    }
  }, [editItem, filters.systemId, selectedLink, visibleBoardItems]);

  const canLinkRanks = (currentId: string, previousId: string): boolean => {
    const current = boardItemsById.get(currentId);
    const previous = boardItemsById.get(previousId);
    if (!current || !previous) {
      return false;
    }
    if (currentId === previousId) {
      notify(t("A rank cannot link to itself."), "error");
      return false;
    }
    return true;
  };

  const resolveLinkConditions = useCallback(
    (currentId: string, previousId: string): RankCondition[] => {
      const override = links[currentId] ?? [];
      const overrideMatch = override.find((link) => link.previousId === previousId);
      if (overrideMatch) {
        return normalizeConditionPayload(overrideMatch.conditions ?? []);
      }
      return [];
    },
    [links]
  );

  useEffect(() => {
    if (!selectedLink) {
      return;
    }
    const resolved = resolveLinkConditions(
      selectedLink.currentId,
      selectedLink.previousId
    );
    setLinkConditionsDraft(normalizeConditionDraft(resolved));
  }, [selectedLink, resolveLinkConditions]);

  const handleEditSave = async () => {
    if (!editItem || !editValues || !editItem.id) {
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
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Rank) => {
    if (!item.id) {
      return;
    }
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
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleSelectLink = (link: RankLinkSelection | null) => {
    if (!link) {
      setSelectedLink(null);
      setLinkConditionsDraft([]);
      return;
    }
    setSelectedLink({
      currentId: link.currentId,
      previousId: link.previousId,
    });
    setLinkConditionsDraft(normalizeConditionDraft(link.conditions));
  };

  const handleSaveLinkConditions = async () => {
    if (!selectedLink) {
      return;
    }
    const conditions = normalizeConditionPayload(linkConditionsDraft);
    setIsSavingLinkConditions(true);
    try {
      const response = await updateRankLinkConditions({
        currentId: selectedLink.currentId,
        previousId: selectedLink.previousId,
        conditions,
      });
      setLinks((prev) => ({
        ...prev,
        [selectedLink.currentId]: (prev[selectedLink.currentId] ?? []).map((link) =>
          link.previousId === selectedLink.previousId
            ? { ...link, conditions }
            : link
        ),
      }));
      setLinkConditionsDraft(normalizeConditionDraft(conditions));
      notify(`Updated: ${response.message}`, "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingLinkConditions(false);
    }
  };

  const handleUnlinkSelectedLink = async () => {
    if (!selectedLink) {
      return;
    }
    await handleBoardUnlink(selectedLink.currentId, selectedLink.previousId);
  };

  const handleConditionChange = (
    index: number,
    field: "name" | "description",
    value: string
  ) => {
    setLinkConditionsDraft((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddConditionField = () => {
    setLinkConditionsDraft((prev) => [...prev, createEmptyCondition()]);
  };

  const handleRemoveConditionField = (index: number) => {
    setLinkConditionsDraft((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleBoardLink = async (currentId: string, previousId: string) => {
    if (!canLinkRanks(currentId, previousId)) {
      return;
    }
    const existing = links[currentId]?.some((link) => link.previousId === previousId);
    if (existing) {
      setSelectedLink({ currentId, previousId });
      setLinkConditionsDraft(
        normalizeConditionDraft(resolveLinkConditions(currentId, previousId))
      );
      return;
    }
    try {
      const conditions: RankCondition[] = [];
      const response = await linkRank({ currentId, previousId, conditions });
      setLinks((prev) => ({
        ...prev,
        [currentId]: [...(prev[currentId] ?? []), { previousId, conditions }],
      }));
      setSelectedLink({ currentId, previousId });
      setLinkConditionsDraft([createEmptyCondition()]);
      notify(`Linked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleBoardUnlink = async (currentId: string, previousId: string) => {
    try {
      const response = await unlinkRank({ currentId, previousId });
      setLinks((prev) => ({
        ...prev,
        [currentId]: (prev[currentId] ?? []).filter(
          (link) => link.previousId !== previousId
        ),
      }));
      setSelectedLink((prev) => {
        if (
          prev &&
          prev.currentId === currentId &&
          prev.previousId === previousId
        ) {
          setLinkConditionsDraft([createEmptyCondition()]);
          return null;
        }
        return prev;
      });
      notify(`Unlinked: ${response.message}`, "success");
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const selectedLinkInfo = useMemo(() => {
    if (!selectedLink) {
      return null;
    }
    const previous = boardItemsById.get(selectedLink.previousId);
    const current = boardItemsById.get(selectedLink.currentId);
    return {
      previousName: previous?.name ?? selectedLink.previousId,
      currentName: current?.name ?? selectedLink.currentId,
    };
  }, [selectedLink, boardItemsById]);

  const handleBoardPositionsChange = (positions: Record<string, { x: number; y: number }>) => {
    hasLayoutInteractionRef.current = true;
    setBoardPositions(positions);
    layoutPositionsRef.current = positions;
    if (layoutSaveTimer !== null) {
      window.clearTimeout(layoutSaveTimer);
    }
    const timer = window.setTimeout(async () => {
      try {
        await saveRankBoardLayout(
          layoutPositionsRef.current,
          layoutLinkBendsRef.current,
          layoutConditionNodePositionsRef.current
        );
      } catch (err) {
        notify((err as Error).message, "error");
      }
    }, 350);
    setLayoutSaveTimer(timer);
  };

  const handleBoardLinkBendsChange = (
    linkBends: Record<string, { midX: number }>
  ) => {
    hasLayoutInteractionRef.current = true;
    setBoardLinkBends(linkBends);
    layoutLinkBendsRef.current = linkBends;
    if (layoutSaveTimer !== null) {
      window.clearTimeout(layoutSaveTimer);
    }
    const timer = window.setTimeout(async () => {
      try {
        await saveRankBoardLayout(
          layoutPositionsRef.current,
          layoutLinkBendsRef.current,
          layoutConditionNodePositionsRef.current
        );
      } catch (err) {
        notify((err as Error).message, "error");
      }
    }, 350);
    setLayoutSaveTimer(timer);
  };

  const handleBoardConditionNodePositionsChange = (
    conditionNodePositions: Record<string, { x: number; y: number }>
  ) => {
    hasLayoutInteractionRef.current = true;
    setBoardConditionNodePositions(conditionNodePositions);
    layoutConditionNodePositionsRef.current = conditionNodePositions;
    if (layoutSaveTimer !== null) {
      window.clearTimeout(layoutSaveTimer);
    }
    const timer = window.setTimeout(async () => {
      try {
        await saveRankBoardLayout(
          layoutPositionsRef.current,
          layoutLinkBendsRef.current,
          layoutConditionNodePositionsRef.current
        );
      } catch (err) {
        notify((err as Error).message, "error");
      }
    }, 350);
    setLayoutSaveTimer(timer);
  };

  return (
    <div>
      <CrudPageShell
        title="Rank nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new rank"
        onToggleForm={() => setShowForm((prev) => !prev)}
        controls={
          <>
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
                label="Tag"
                value={filters.tag}
                onChange={(value) => handleFilterChange("tag", value)}
              />
              <TextInput
                label="Tier"
                value={filters.tier}
                onChange={(value) => handleFilterChange("tier", value)}
              />
              <Select
                label="Rank System"
                value={filters.systemId}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/rank-systems");
                    return;
                  }
                  handleFilterChange("systemId", value);
                }}
                options={rankSystemOptions}
                placeholder={rankSystems.length > 0 ? "All" : "No rank systems yet."}
              />
              <TextInput
                label="System"
                value={filters.system}
                onChange={(value) => handleFilterChange("system", value)}
              />
              <div className="form-field filter-actions">
                <Button type="button" variant="ghost" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              </div>
            </FilterPanel>
            <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
            <div className="filter-block">
              <button
                type="button"
                className="filter-toggle"
                onClick={() => setShowBoard((prev) => !prev)}
                aria-expanded={showBoard}
              >
                <img className="filter-toggle__icon" src={boardIcon} alt={t("Board")} />
                <span className="filter-toggle__label">
                  {showBoard ? t("Hide board") : t("Show board")}
                </span>
              </button>
              {showBoard && <p className="header__subtitle">{t("Board")}</p>}
            </div>
          </>
        }
        list={
          showList ? (
            <>
              <RankList
                items={items}
                rankSystemNameById={rankSystemNameById}
                onEdit={handleEditOpen}
                onDelete={handleDelete}
              />
              {items.length > 0 || page > 1 || hasNext ? (
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
              ) : null}
            </>
          ) : null
        }
      />
      {showBoard && (
        <RankBoard
          items={visibleBoardItems}
          links={links}
          initialPositions={boardPositions}
          initialLinkBends={boardLinkBends}
          initialConditionNodePositions={boardConditionNodePositions}
          selectedId={editItem?.id}
          selectedLink={selectedLink}
          onSelect={(item) => {
            if (!item) {
              handleEditCancel();
              return;
            }
            handleEditOpen(item);
          }}
          onSelectLink={handleSelectLink}
          onLink={handleBoardLink}
          onUnlink={handleBoardUnlink}
          onPositionsChange={handleBoardPositionsChange}
          onLinkBendsChange={handleBoardLinkBendsChange}
          onConditionNodePositionsChange={handleBoardConditionNodePositionsChange}
          onColorChange={handleBoardColorChange}
          isSavingColor={isSavingColor}
          key={`rank-board-${layoutRevision}`}
        />
      )}
      {showBoard && selectedLink && (
        <div className="card rank-link-editor">
          <div className="card__header">
            <div>
              <h3 className="section-title">{t("Promotion Link")}</h3>
              <p className="header__subtitle">
                {selectedLinkInfo
                  ? `${selectedLinkInfo.previousName} → ${selectedLinkInfo.currentName}`
                  : `${selectedLink.previousId} → ${selectedLink.currentId}`}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedLink(null);
                setLinkConditionsDraft([createEmptyCondition()]);
              }}
            >
              {t("Cancel")}
            </Button>
          </div>
          <div className="form-field rank-condition-builder">
            <label>{t("Promotion Conditions")}</label>
            <div className="rank-condition-list">
              {linkConditionsDraft.map((condition, index) => (
                <div className="rank-condition-item" key={`condition-${index + 1}`}>
                  <div className="rank-condition-fields">
                    <input
                      className="input rank-condition-input"
                      value={condition.name}
                      onChange={(event) =>
                        handleConditionChange(index, "name", event.target.value)
                      }
                      placeholder={`${t("Condition name")} ${index + 1}`}
                    />
                    <input
                      className="input rank-condition-input"
                      value={condition.description ?? ""}
                      onChange={(event) =>
                        handleConditionChange(index, "description", event.target.value)
                      }
                      placeholder={`${t("Condition description")} ${index + 1}`}
                    />
                  </div>
                  {linkConditionsDraft.length > 1 && (
                    <button
                      type="button"
                      className="rank-condition-icon rank-condition-icon--remove"
                      onClick={() => handleRemoveConditionField(index)}
                      aria-label={t("Remove condition")}
                      title={t("Remove condition")}
                    >
                      −
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="rank-condition-icon rank-condition-icon--add"
                onClick={handleAddConditionField}
                aria-label={t("Add condition")}
                title={t("Add condition")}
              >
                +
              </button>
            </div>
          </div>
          <div className="page-toolbar">
            <Button
              onClick={handleSaveLinkConditions}
              disabled={isSavingLinkConditions}
            >
              {isSavingLinkConditions ? t("Saving...") : t("Save conditions")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setLinkConditionsDraft([createEmptyCondition()])}
            >
              {t("Clear conditions")}
            </Button>
            <Button variant="ghost" onClick={() => void handleUnlinkSelectedLink()}>
              {t("Unlink")}
            </Button>
          </div>
        </div>
      )}

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
              <Select
                label="Rank System"
                value={editValues.systemId}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/rank-systems");
                    return;
                  }
                  setEditValues((prev) => prev && { ...prev, systemId: value });
                }}
                options={rankSystemOptions}
                placeholder={rankSystems.length > 0 ? "Select" : "No rank systems yet."}
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
            <div className="form-field--narrow">
              <TextInput
                label="Color"
                type="color"
                value={editValues.color}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, color: value })
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
            <div className="form-field--wide">
              <TraitEditor
                label="Traits"
                values={editValues.traits}
                onChange={(traits) =>
                  setEditValues((prev) => prev && { ...prev, traits })
                }
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
              <Select
                label="Rank System"
                value={values.systemId}
                onChange={(value) => {
                  if (value === "__create__") {
                    navigate("/rank-systems");
                    return;
                  }
                  setField("systemId", value);
                }}
                options={rankSystemOptions}
                placeholder={rankSystems.length > 0 ? "Select" : "No rank systems yet."}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="System"
                value={values.system}
                onChange={(value) => setField("system", value)}
              />
            </div>
            <div className="form-field--narrow">
              <TextInput
                label="Color"
                type="color"
                value={values.color}
                onChange={(value) => setField("color", value)}
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
            <div className="form-field--wide">
              <TraitEditor
                label="Traits"
                values={values.traits}
                onChange={(traits) => setField("traits", traits)}
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
