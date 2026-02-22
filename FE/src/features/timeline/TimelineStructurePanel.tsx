import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { Select } from "../../components/form/Select";
import { TextInput } from "../../components/form/TextInput";
import { useI18n } from "../../i18n/I18nProvider";
import {
  createTimelineAxis,
  createTimelineEra,
  createTimelineMarker,
  createTimelineSegment,
  getTimelineAxesPage,
  getTimelineErasPage,
  getTimelineMarkersPage,
  getTimelineSegmentsPage,
  getTimelineStateDiff,
  getTimelineStateHistory,
  getTimelineStateProjection,
  getTimelineStateSnapshot,
} from "./timeline-structure.api";
import type {
  TimelineAxis,
  TimelineEra,
  TimelineMarker,
  TimelineSegment,
} from "./timeline-structure.types";

const AXIS_TYPES = ["main", "parallel", "branch", "loop"] as const;
const AXIS_TYPE_LABELS: Record<(typeof AXIS_TYPES)[number], string> = {
  main: "Main",
  parallel: "Parallel",
  branch: "Branch",
  loop: "Loop",
};

const SUBJECT_TYPES = [
  "character",
  "item",
  "location",
  "event",
  "timeline",
  "timelineAxis",
  "timelineEra",
  "timelineSegment",
  "timelineMarker",
] as const;
const SUBJECT_TYPE_LABELS: Record<(typeof SUBJECT_TYPES)[number], string> = {
  character: "Character",
  item: "Item",
  location: "Location",
  event: "Event",
  timeline: "Timeline",
  timelineAxis: "Timeline Axis",
  timelineEra: "Timeline Era",
  timelineSegment: "Timeline Segment",
  timelineMarker: "Timeline Marker",
};

type TimelineTreeMarkerNode = TimelineMarker & { nodeType: "marker" };
type TimelineTreeSegmentNode = TimelineSegment & {
  nodeType: "segment";
  markers: TimelineTreeMarkerNode[];
};
type TimelineTreeEraNode = TimelineEra & {
  nodeType: "era";
  segments: TimelineTreeSegmentNode[];
};
type TimelineTreeAxisNode = TimelineAxis & {
  nodeType: "axis";
  eras: TimelineTreeEraNode[];
};

type TimelineStructurePanelProps = {
  open: boolean;
};

type CreateMode = "axis" | "era" | "segment" | "marker";

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const compareText = (left?: string, right?: string): number =>
  (left ?? "").localeCompare(right ?? "");

const sortAxes = (left: TimelineAxis, right: TimelineAxis): number =>
  (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || compareText(left.name, right.name);

const sortEras = (left: TimelineEra, right: TimelineEra): number =>
  (left.order ?? 0) - (right.order ?? 0) || compareText(left.name, right.name);

const sortSegments = (left: TimelineSegment, right: TimelineSegment): number =>
  (left.order ?? 0) - (right.order ?? 0) || compareText(left.name, right.name);

const sortMarkers = (left: TimelineMarker, right: TimelineMarker): number =>
  left.tick - right.tick || compareText(left.label, right.label);

const getNodeKey = (
  nodeType: "axis" | "era" | "segment" | "marker",
  id: string
): string => `${nodeType}:${id}`;

const formatTickRange = (startTick?: number, endTick?: number): string => {
  if (typeof startTick !== "number" && typeof endTick !== "number") {
    return "-";
  }
  const startLabel = typeof startTick === "number" ? String(startTick) : "?";
  const endLabel = typeof endTick === "number" ? String(endTick) : "?";
  return `${startLabel} - ${endLabel}`;
};

export const TimelineStructurePanel = ({ open }: TimelineStructurePanelProps) => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [loading, setLoading] = useState(false);
  const [axes, setAxes] = useState<TimelineAxis[]>([]);
  const [eras, setEras] = useState<TimelineEra[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);

  const [selectedNodeKey, setSelectedNodeKey] = useState("");
  const [selectedAxisId, setSelectedAxisId] = useState("");
  const [selectedEraId, setSelectedEraId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

  const [createMode, setCreateMode] = useState<CreateMode>("axis");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showStateQueries, setShowStateQueries] = useState(false);

  const [axisName, setAxisName] = useState("");
  const [axisCode, setAxisCode] = useState("");
  const [axisType, setAxisType] = useState<(typeof AXIS_TYPES)[number]>("main");

  const [eraName, setEraName] = useState("");
  const [eraCode, setEraCode] = useState("");

  const [segmentName, setSegmentName] = useState("");
  const [segmentCode, setSegmentCode] = useState("");

  const [markerLabel, setMarkerLabel] = useState("");
  const [markerType, setMarkerType] = useState("");
  const [markerTick, setMarkerTick] = useState("");

  const [subjectType, setSubjectType] = useState<(typeof SUBJECT_TYPES)[number]>(
    "character"
  );
  const [subjectId, setSubjectId] = useState("");
  const [tick, setTick] = useState("0");
  const [fromTick, setFromTick] = useState("0");
  const [toTick, setToTick] = useState("0");
  const [stateOutput, setStateOutput] = useState("");

  const selectedAxis = useMemo(
    () => axes.find((axis) => axis.id === selectedAxisId),
    [axes, selectedAxisId]
  );
  const selectedEra = useMemo(
    () => eras.find((era) => era.id === selectedEraId),
    [eras, selectedEraId]
  );
  const selectedSegment = useMemo(
    () => segments.find((segment) => segment.id === selectedSegmentId),
    [segments, selectedSegmentId]
  );

  const axisNameById = useMemo(() => {
    const map = new Map<string, string>();
    axes.forEach((axis) => {
      map.set(axis.id, axis.name);
    });
    return map;
  }, [axes]);

  const eraNameById = useMemo(() => {
    const map = new Map<string, string>();
    eras.forEach((era) => {
      map.set(era.id, era.name);
    });
    return map;
  }, [eras]);

  const segmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    segments.forEach((segment) => {
      map.set(segment.id, segment.name);
    });
    return map;
  }, [segments]);

  const markerCountByAxis = useMemo(() => {
    const map = new Map<string, number>();
    markers.forEach((marker) => {
      map.set(marker.axisId, (map.get(marker.axisId) ?? 0) + 1);
    });
    return map;
  }, [markers]);

  const markerCountByEra = useMemo(() => {
    const map = new Map<string, number>();
    markers.forEach((marker) => {
      map.set(marker.eraId, (map.get(marker.eraId) ?? 0) + 1);
    });
    return map;
  }, [markers]);

  const loadAxes = useCallback(async (): Promise<TimelineAxis[]> => {
    const response = await getTimelineAxesPage({ limit: 200, offset: 0 });
    const items = response.data ?? [];
    setAxes(items);
    return items;
  }, []);

  const loadEras = useCallback(async (): Promise<TimelineEra[]> => {
    const response = await getTimelineErasPage({ limit: 200, offset: 0 });
    const items = response.data ?? [];
    setEras(items);
    return items;
  }, []);

  const loadSegments = useCallback(async (): Promise<TimelineSegment[]> => {
    const response = await getTimelineSegmentsPage({ limit: 200, offset: 0 });
    const items = response.data ?? [];
    setSegments(items);
    return items;
  }, []);

  const loadMarkers = useCallback(async (): Promise<TimelineMarker[]> => {
    const response = await getTimelineMarkersPage({ limit: 200, offset: 0 });
    const items = response.data ?? [];
    setMarkers(items);
    return items;
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedAxes, loadedEras, loadedSegments, loadedMarkers] = await Promise.all([
        loadAxes(),
        loadEras(),
        loadSegments(),
        loadMarkers(),
      ]);

      const nextAxisId =
        selectedAxisId && loadedAxes.some((axis) => axis.id === selectedAxisId)
          ? selectedAxisId
          : loadedAxes[0]?.id ?? "";

      const erasForAxis = loadedEras
        .filter((era) => era.axisId === nextAxisId)
        .sort(sortEras);
      const nextEraId =
        selectedEraId &&
        loadedEras.some((era) => era.id === selectedEraId && era.axisId === nextAxisId)
          ? selectedEraId
          : erasForAxis[0]?.id ?? "";

      const segmentsForEra = loadedSegments
        .filter((segment) => segment.eraId === nextEraId)
        .sort(sortSegments);
      const nextSegmentId =
        selectedSegmentId &&
        loadedSegments.some(
          (segment) => segment.id === selectedSegmentId && segment.eraId === nextEraId
        )
          ? selectedSegmentId
          : segmentsForEra[0]?.id ?? "";

      setSelectedAxisId(nextAxisId);
      setSelectedEraId(nextEraId);
      setSelectedSegmentId(nextSegmentId);

      if (!selectedNodeKey && nextAxisId) {
        setSelectedNodeKey(getNodeKey("axis", nextAxisId));
      }

      if (!nextAxisId && loadedMarkers.length === 0) {
        setSelectedNodeKey("");
      }
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    loadAxes,
    loadEras,
    loadMarkers,
    loadSegments,
    notify,
    selectedAxisId,
    selectedEraId,
    selectedNodeKey,
    selectedSegmentId,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshData();
  }, [open, refreshData]);

  const timelineTree = useMemo<TimelineTreeAxisNode[]>(() => {
    const markersBySegment = new Map<string, TimelineTreeMarkerNode[]>();
    [...markers].sort(sortMarkers).forEach((marker) => {
      const list = markersBySegment.get(marker.segmentId) ?? [];
      list.push({ ...marker, nodeType: "marker" });
      markersBySegment.set(marker.segmentId, list);
    });

    const segmentsByEra = new Map<string, TimelineTreeSegmentNode[]>();
    [...segments].sort(sortSegments).forEach((segment) => {
      const list = segmentsByEra.get(segment.eraId) ?? [];
      list.push({
        ...segment,
        nodeType: "segment",
        markers: markersBySegment.get(segment.id) ?? [],
      });
      segmentsByEra.set(segment.eraId, list);
    });

    const erasByAxis = new Map<string, TimelineTreeEraNode[]>();
    [...eras].sort(sortEras).forEach((era) => {
      const list = erasByAxis.get(era.axisId) ?? [];
      list.push({
        ...era,
        nodeType: "era",
        segments: segmentsByEra.get(era.id) ?? [],
      });
      erasByAxis.set(era.axisId, list);
    });

    return [...axes].sort(sortAxes).map((axis) => ({
      ...axis,
      nodeType: "axis",
      eras: erasByAxis.get(axis.id) ?? [],
    }));
  }, [axes, eras, segments, markers]);

  const selectedPath = useMemo(() => {
    const labels: string[] = [];
    if (selectedAxis?.name) {
      labels.push(selectedAxis.name);
    }
    if (selectedEra?.name) {
      labels.push(selectedEra.name);
    }
    if (selectedSegment?.name) {
      labels.push(selectedSegment.name);
    }
    return labels.join(" > ");
  }, [selectedAxis, selectedEra, selectedSegment]);

  const resetCreateFields = () => {
    setAxisName("");
    setAxisCode("");
    setEraName("");
    setEraCode("");
    setSegmentName("");
    setSegmentCode("");
    setMarkerLabel("");
    setMarkerType("");
    setMarkerTick("");
  };

  const selectAxisNode = useCallback(
    (axisId: string) => {
      const nextEra = [...eras]
        .filter((era) => era.axisId === axisId)
        .sort(sortEras)[0];
      const nextSegment = nextEra
        ? [...segments].filter((segment) => segment.eraId === nextEra.id).sort(sortSegments)[0]
        : undefined;
      setSelectedAxisId(axisId);
      setSelectedEraId(nextEra?.id ?? "");
      setSelectedSegmentId(nextSegment?.id ?? "");
      setSelectedNodeKey(getNodeKey("axis", axisId));
    },
    [eras, segments]
  );

  const selectEraNode = useCallback(
    (era: TimelineEra) => {
      const nextSegment = [...segments]
        .filter((segment) => segment.eraId === era.id)
        .sort(sortSegments)[0];
      setSelectedAxisId(era.axisId);
      setSelectedEraId(era.id);
      setSelectedSegmentId(nextSegment?.id ?? "");
      setSelectedNodeKey(getNodeKey("era", era.id));
    },
    [segments]
  );

  const selectSegmentNode = useCallback((segment: TimelineSegment) => {
    setSelectedAxisId(segment.axisId);
    setSelectedEraId(segment.eraId);
    setSelectedSegmentId(segment.id);
    setSelectedNodeKey(getNodeKey("segment", segment.id));
  }, []);

  const selectMarkerNode = useCallback((marker: TimelineMarker) => {
    setSelectedAxisId(marker.axisId);
    setSelectedEraId(marker.eraId);
    setSelectedSegmentId(marker.segmentId);
    setSelectedNodeKey(getNodeKey("marker", marker.id));
  }, []);

  const toggleCollapsed = (nodeType: "axis" | "era" | "segment", id: string) => {
    const nodeKey = getNodeKey(nodeType, id);
    setCollapsed((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  const prepareCreateAxis = () => {
    setCreateMode("axis");
    resetCreateFields();
  };

  const prepareCreateEra = (axisId?: string) => {
    if (axisId) {
      selectAxisNode(axisId);
    }
    setCreateMode("era");
    setEraName("");
    setEraCode("");
  };

  const prepareCreateSegment = (era?: TimelineEra) => {
    if (era) {
      selectEraNode(era);
    }
    setCreateMode("segment");
    setSegmentName("");
    setSegmentCode("");
  };

  const prepareCreateMarker = (segment?: TimelineSegment) => {
    if (segment) {
      selectSegmentNode(segment);
    }
    setCreateMode("marker");
    setMarkerLabel("");
    setMarkerType("");
    setMarkerTick("");
  };

  const handleCreateAxis = async () => {
    if (!axisName.trim()) {
      notify(t("Axis name is required"), "error");
      return;
    }
    try {
      const created = await createTimelineAxis({
        name: axisName.trim(),
        code: axisCode.trim() || undefined,
        axisType,
      });
      notify(t("Axis created"), "success");
      await refreshData();
      setSelectedAxisId(created.id);
      setSelectedEraId("");
      setSelectedSegmentId("");
      setSelectedNodeKey(getNodeKey("axis", created.id));
      setCreateMode("era");
      setAxisName("");
      setAxisCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateEra = async () => {
    if (!selectedAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    if (!eraName.trim()) {
      notify(t("Era name is required"), "error");
      return;
    }
    try {
      const created = await createTimelineEra({
        axisId: selectedAxisId,
        name: eraName.trim(),
        code: eraCode.trim() || undefined,
      });
      notify(t("Era created"), "success");
      await refreshData();
      setSelectedAxisId(created.axisId);
      setSelectedEraId(created.id);
      setSelectedSegmentId("");
      setSelectedNodeKey(getNodeKey("era", created.id));
      setCreateMode("segment");
      setEraName("");
      setEraCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateSegment = async () => {
    if (!selectedEraId) {
      notify(t("Select an era first"), "error");
      return;
    }
    if (!segmentName.trim()) {
      notify(t("Segment name is required"), "error");
      return;
    }
    try {
      const created = await createTimelineSegment({
        eraId: selectedEraId,
        name: segmentName.trim(),
        code: segmentCode.trim() || undefined,
      });
      notify(t("Segment created"), "success");
      await refreshData();
      setSelectedAxisId(created.axisId);
      setSelectedEraId(created.eraId);
      setSelectedSegmentId(created.id);
      setSelectedNodeKey(getNodeKey("segment", created.id));
      setCreateMode("marker");
      setSegmentName("");
      setSegmentCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateMarker = async () => {
    if (!selectedSegmentId) {
      notify(t("Select a segment first"), "error");
      return;
    }
    if (!markerLabel.trim()) {
      notify(t("Marker label is required"), "error");
      return;
    }
    const parsedTick = Number(markerTick);
    if (!Number.isFinite(parsedTick)) {
      notify(t("Tick must be a number"), "error");
      return;
    }
    try {
      const created = await createTimelineMarker({
        segmentId: selectedSegmentId,
        label: markerLabel.trim(),
        tick: parsedTick,
        markerType: markerType.trim() || undefined,
      });
      notify(t("Marker created"), "success");
      await refreshData();
      setSelectedAxisId(created.axisId);
      setSelectedEraId(created.eraId);
      setSelectedSegmentId(created.segmentId);
      setSelectedNodeKey(getNodeKey("marker", created.id));
      setMarkerLabel("");
      setMarkerType("");
      setMarkerTick("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateByMode = async () => {
    if (createMode === "axis") {
      await handleCreateAxis();
      return;
    }
    if (createMode === "era") {
      await handleCreateEra();
      return;
    }
    if (createMode === "segment") {
      await handleCreateSegment();
      return;
    }
    await handleCreateMarker();
  };

  const runSnapshot = async () => {
    if (!selectedAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    const parsedTick = Number(tick);
    if (!Number.isFinite(parsedTick)) {
      notify(t("Tick must be a number"), "error");
      return;
    }
    try {
      const response = await getTimelineStateSnapshot({
        axisId: selectedAxisId,
        tick: parsedTick,
        subjectType: subjectType || undefined,
        subjectId: subjectId.trim() || undefined,
      });
      setStateOutput(formatJson(response));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const runProjection = async () => {
    if (!selectedAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    const parsedTick = Number(tick);
    if (!Number.isFinite(parsedTick)) {
      notify(t("Tick must be a number"), "error");
      return;
    }
    try {
      const response = await getTimelineStateProjection({
        axisId: selectedAxisId,
        tick: parsedTick,
        subjectType: subjectType || undefined,
        subjectId: subjectId.trim() || undefined,
      });
      setStateOutput(formatJson(response));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const runDiff = async () => {
    if (!selectedAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    if (!subjectId.trim()) {
      notify(t("Subject ID is required for diff"), "error");
      return;
    }
    const parsedFromTick = Number(fromTick);
    const parsedToTick = Number(toTick);
    if (!Number.isFinite(parsedFromTick) || !Number.isFinite(parsedToTick)) {
      notify(t("fromTick and toTick must be numbers"), "error");
      return;
    }
    try {
      const response = await getTimelineStateDiff({
        axisId: selectedAxisId,
        subjectType,
        subjectId: subjectId.trim(),
        fromTick: parsedFromTick,
        toTick: parsedToTick,
      });
      setStateOutput(formatJson(response));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const runHistory = async () => {
    if (!selectedAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    if (!subjectId.trim()) {
      notify(t("Subject ID is required for history"), "error");
      return;
    }
    const parsedFromTick = Number(fromTick);
    const parsedToTick = Number(toTick);
    try {
      const response = await getTimelineStateHistory({
        axisId: selectedAxisId,
        subjectType,
        subjectId: subjectId.trim(),
        tickFrom: Number.isFinite(parsedFromTick) ? parsedFromTick : undefined,
        tickTo: Number.isFinite(parsedToTick) ? parsedToTick : undefined,
        limit: 200,
      });
      setStateOutput(formatJson(response));
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const renderMarkerNode = (node: TimelineTreeMarkerNode, depth: number) => {
    const nodeKey = getNodeKey("marker", node.id);
    const isSelected = selectedNodeKey === nodeKey;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className="tree-row"
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          onClick={() => selectMarkerNode(node)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectMarkerNode(node);
            }
          }}
        >
          <div className="tree-row__main">
            <button type="button" className="tree-row__toggle" disabled>
              •
            </button>
            <div className="tree-row__name">
              <strong>{node.label}</strong>
              {node.description ? (
                <span className="tree-row__description">{node.description}</span>
              ) : null}
            </div>
            <span className="tree-row__meta">{t("Marker")}</span>
            <span className="tree-row__meta">{segmentNameById.get(node.segmentId) ?? "-"}</span>
            <span className="tree-row__meta">{node.tick}</span>
            <span className="tree-row__meta">
              {node.status === "archived" ? t("Archived") : t("Active")}
            </span>
          </div>
          <div className="table__actions tree-row__actions">
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                selectMarkerNode(node);
              }}
            >
              {t("Select")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSegmentNode = (node: TimelineTreeSegmentNode, depth: number) => {
    const nodeKey = getNodeKey("segment", node.id);
    const isCollapsed = collapsed[nodeKey];
    const isSelected = selectedNodeKey === nodeKey;
    const hasChildren = node.markers.length > 0;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className="tree-row"
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          onClick={() => selectSegmentNode(node)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectSegmentNode(node);
            }
          }}
        >
          <div className="tree-row__main">
            <button
              type="button"
              className="tree-row__toggle"
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) {
                  toggleCollapsed("segment", node.id);
                }
              }}
              disabled={!hasChildren}
              aria-label={t("Toggle children")}
            >
              {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
            </button>
            <div className="tree-row__name">
              <strong>{node.name}</strong>
              {node.code ? <span className="tree-row__description">{node.code}</span> : null}
            </div>
            <span className="tree-row__meta">{t("Segment")}</span>
            <span className="tree-row__meta">{eraNameById.get(node.eraId) ?? "-"}</span>
            <span className="tree-row__meta">{formatTickRange(node.startTick, node.endTick)}</span>
            <span className="tree-row__meta">
              {node.status === "archived" ? t("Archived") : t("Active")}
            </span>
          </div>
          <div className="table__actions tree-row__actions">
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                prepareCreateMarker(node);
              }}
            >
              {t("Add marker")}
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed ? (
          <div className="tree-children">
            {node.markers.map((marker) => renderMarkerNode(marker, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEraNode = (node: TimelineTreeEraNode, depth: number) => {
    const nodeKey = getNodeKey("era", node.id);
    const isCollapsed = collapsed[nodeKey];
    const isSelected = selectedNodeKey === nodeKey;
    const hasChildren = node.segments.length > 0;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className="tree-row"
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          onClick={() => selectEraNode(node)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectEraNode(node);
            }
          }}
        >
          <div className="tree-row__main">
            <button
              type="button"
              className="tree-row__toggle"
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) {
                  toggleCollapsed("era", node.id);
                }
              }}
              disabled={!hasChildren}
              aria-label={t("Toggle children")}
            >
              {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
            </button>
            <div className="tree-row__name">
              <strong>{node.name}</strong>
              {node.summary ? (
                <span className="tree-row__description">{node.summary}</span>
              ) : null}
            </div>
            <span className="tree-row__meta">{t("Era")}</span>
            <span className="tree-row__meta">{axisNameById.get(node.axisId) ?? "-"}</span>
            <span className="tree-row__meta">{formatTickRange(node.startTick, node.endTick)}</span>
            <span className="tree-row__meta">
              {node.status === "archived" ? t("Archived") : t("Active")}
            </span>
          </div>
          <div className="table__actions tree-row__actions">
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                prepareCreateSegment(node);
              }}
            >
              {t("Add segment")}
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed ? (
          <div className="tree-children">
            {node.segments.map((segment) => renderSegmentNode(segment, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const renderAxisNode = (node: TimelineTreeAxisNode, depth: number) => {
    const nodeKey = getNodeKey("axis", node.id);
    const isCollapsed = collapsed[nodeKey];
    const isSelected = selectedNodeKey === nodeKey;
    const hasChildren = node.eras.length > 0;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className="tree-row"
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          onClick={() => selectAxisNode(node.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectAxisNode(node.id);
            }
          }}
        >
          <div className="tree-row__main">
            <button
              type="button"
              className="tree-row__toggle"
              onClick={(event) => {
                event.stopPropagation();
                if (hasChildren) {
                  toggleCollapsed("axis", node.id);
                }
              }}
              disabled={!hasChildren}
              aria-label={t("Toggle children")}
            >
              {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
            </button>
            <div className="tree-row__name">
              <strong>{node.name}</strong>
              {node.description ? (
                <span className="tree-row__description">{node.description}</span>
              ) : null}
            </div>
            <span className="tree-row__meta">{t(AXIS_TYPE_LABELS[node.axisType])}</span>
            <span className="tree-row__meta">-</span>
            <span className="tree-row__meta">{formatTickRange(node.startTick, node.endTick)}</span>
            <span className="tree-row__meta">
              {node.status === "archived" ? t("Archived") : t("Active")}
            </span>
          </div>
          <div className="table__actions tree-row__actions">
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                prepareCreateEra(node.id);
              }}
            >
              {t("Add era")}
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed ? (
          <div className="tree-children">
            {node.eras.map((era) => renderEraNode(era, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const createButtonLabel =
    createMode === "axis"
      ? "Create axis"
      : createMode === "era"
        ? "Create era"
        : createMode === "segment"
          ? "Create segment"
          : "Create marker";

  const createDisabled =
    createMode === "axis"
      ? false
      : createMode === "era"
        ? !selectedAxisId
        : createMode === "segment"
          ? !selectedEraId
          : !selectedSegmentId;

  if (!open) {
    return null;
  }

  return (
    <div className="timeline-page" style={{ marginTop: 16 }}>
      <FormSection
        title="Timeline structure tree"
        description="Visual hierarchy for axis, era, segment, and marker."
      >
        <div className="form-field form-field--wide">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={prepareCreateAxis}>
              Create root axis
            </Button>
            <Button
              variant="ghost"
              onClick={() => prepareCreateEra()}
              disabled={!selectedAxisId}
            >
              Add era
            </Button>
            <Button
              variant="ghost"
              onClick={() => prepareCreateSegment()}
              disabled={!selectedEraId}
            >
              Add segment
            </Button>
            <Button
              variant="ghost"
              onClick={() => prepareCreateMarker()}
              disabled={!selectedSegmentId}
            >
              Add marker
            </Button>
            <Button variant="ghost" onClick={() => void refreshData()} disabled={loading}>
              {loading ? "Loading..." : "Reload timeline-first data"}
            </Button>
          </div>
        </div>

        <div className="form-field form-field--wide">
          <label>{t("Selected path")}</label>
          <p className="header__subtitle">{selectedPath || t("No node selected.")}</p>
        </div>

        <div className="form-field form-field--wide">
          <div className="tree-list">
            <div className="tree-header">
              <span>{t("Name")}</span>
              <span>{t("Type")}</span>
              <span>{t("Parent")}</span>
              <span>{t("Tick")}</span>
              <span>{t("Status")}</span>
              <span>{t("Actions")}</span>
            </div>

            {timelineTree.length === 0 ? (
              <p className="header__subtitle">
                {t("No timeline structure yet. Create a root axis to start.")}
              </p>
            ) : (
              timelineTree.map((axisNode) => renderAxisNode(axisNode, 0))
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Quick create"
        description="Select a node in the tree to create child nodes."
      >
        {createMode === "axis" ? (
          <>
            <TextInput label="Axis name" value={axisName} onChange={setAxisName} required />
            <TextInput label="Axis code" value={axisCode} onChange={setAxisCode} />
            <Select
              label="Axis type"
              value={axisType}
              onChange={(value) =>
                setAxisType((value as (typeof AXIS_TYPES)[number]) || "main")
              }
              options={AXIS_TYPES.map((value) => ({
                value,
                label: AXIS_TYPE_LABELS[value],
              }))}
              placeholder="Select type"
            />
          </>
        ) : null}

        {createMode === "era" ? (
          <>
            <div className="form-field">
              <label>{t("Parent axis")}</label>
              <p className="header__subtitle">{selectedAxis?.name ?? t("No axis selected.")}</p>
            </div>
            <TextInput label="Era name" value={eraName} onChange={setEraName} required />
            <TextInput label="Era code" value={eraCode} onChange={setEraCode} />
          </>
        ) : null}

        {createMode === "segment" ? (
          <>
            <div className="form-field">
              <label>{t("Parent era")}</label>
              <p className="header__subtitle">{selectedEra?.name ?? t("No era selected.")}</p>
            </div>
            <TextInput
              label="Segment name"
              value={segmentName}
              onChange={setSegmentName}
              required
            />
            <TextInput label="Segment code" value={segmentCode} onChange={setSegmentCode} />
          </>
        ) : null}

        {createMode === "marker" ? (
          <>
            <div className="form-field">
              <label>{t("Parent segment")}</label>
              <p className="header__subtitle">
                {selectedSegment?.name ?? t("No segment selected.")}
              </p>
            </div>
            <TextInput
              label="Marker label"
              value={markerLabel}
              onChange={setMarkerLabel}
              required
            />
            <TextInput label="Marker type" value={markerType} onChange={setMarkerType} />
            <TextInput
              label="Tick"
              type="number"
              value={markerTick}
              onChange={setMarkerTick}
              required
            />
          </>
        ) : null}

        <div className="form-field">
          <label>{t("Action")}</label>
          <Button onClick={() => void handleCreateByMode()} disabled={createDisabled}>
            {createButtonLabel}
          </Button>
        </div>
      </FormSection>

      <FormSection
        title="Advanced queries"
        description="State query tools for debugging and migration."
      >
        <div className="form-field form-field--wide">
          <Button
            variant="ghost"
            onClick={() => setShowStateQueries((prev) => !prev)}
          >
            {showStateQueries ? "Hide advanced queries" : "Show advanced queries"}
          </Button>
        </div>

        {showStateQueries ? (
          <>
            <Select
              label="Subject type"
              value={subjectType}
              onChange={(value) =>
                setSubjectType((value as (typeof SUBJECT_TYPES)[number]) || "character")
              }
              options={SUBJECT_TYPES.map((value) => ({
                value,
                label: SUBJECT_TYPE_LABELS[value],
              }))}
              placeholder="Select subject type"
            />
            <TextInput label="Subject ID" value={subjectId} onChange={setSubjectId} />
            <TextInput label="Tick" type="number" value={tick} onChange={setTick} />
            <TextInput
              label="From tick"
              type="number"
              value={fromTick}
              onChange={setFromTick}
            />
            <TextInput label="To tick" type="number" value={toTick} onChange={setToTick} />

            <div className="form-field form-field--wide">
              <label>{t("Actions")}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="ghost" onClick={() => void runSnapshot()}>
                  Snapshot
                </Button>
                <Button variant="ghost" onClick={() => void runProjection()}>
                  Projection
                </Button>
                <Button variant="ghost" onClick={() => void runDiff()}>
                  Diff
                </Button>
                <Button variant="ghost" onClick={() => void runHistory()}>
                  History
                </Button>
              </div>
            </div>

            <div className="form-field form-field--wide">
              <label>{t("Result")}</label>
              <textarea
                className="textarea"
                value={stateOutput}
                onChange={(event) => setStateOutput(event.target.value)}
                placeholder={t("State query result will appear here")}
                style={{ minHeight: 280 }}
              />
            </div>
          </>
        ) : null}
      </FormSection>

      <FormSection title="Quick view">
        <div className="form-field">
          <label>{t("Axes")}</label>
          <p className="header__subtitle">{axes.length}</p>
        </div>
        <div className="form-field">
          <label>{t("Eras")}</label>
          <p className="header__subtitle">{eras.length}</p>
        </div>
        <div className="form-field">
          <label>{t("Segments")}</label>
          <p className="header__subtitle">{segments.length}</p>
        </div>
        <div className="form-field">
          <label>{t("Markers")}</label>
          <p className="header__subtitle">{markers.length}</p>
        </div>
        <div className="form-field">
          <label>{t("Marker")}</label>
          <p className="header__subtitle">
            {selectedAxisId ? markerCountByAxis.get(selectedAxisId) ?? 0 : 0}
          </p>
        </div>
        <div className="form-field">
          <label>{t("Era")}</label>
          <p className="header__subtitle">
            {selectedEraId ? markerCountByEra.get(selectedEraId) ?? 0 : 0}
          </p>
        </div>
      </FormSection>
    </div>
  );
};
