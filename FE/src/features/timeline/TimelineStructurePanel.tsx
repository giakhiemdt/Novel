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
  deleteTimelineAxis,
  deleteTimelineEra,
  deleteTimelineSegment,
  getTimelineAxesPage,
  getTimelineErasPage,
  getTimelineMarkersPage,
  getTimelineSegmentsPage,
  getTimelineStateDiff,
  getTimelineStateHistory,
  getTimelineStateProjection,
  getTimelineStateSnapshot,
  updateTimelineAxis,
  updateTimelineEra,
  updateTimelineMarker,
  updateTimelineSegment,
} from "./timeline-structure.api";
import type {
  TimelineAxis,
  TimelineEra,
  TimelineMarker,
  TimelineSegment,
  TimelineStructStatus,
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
type EditableNodeType = "axis" | "era" | "segment";
type DraggableNodeType = "era" | "segment" | "marker";
type DropTargetType = "axis" | "era" | "segment";

type DragNodeState = {
  nodeType: DraggableNodeType;
  id: string;
} | null;

type DetailNodeState =
  | { nodeType: "axis"; node: TimelineAxis }
  | { nodeType: "era"; node: TimelineEra }
  | { nodeType: "segment"; node: TimelineSegment }
  | null;

type AxisEditState = {
  nodeType: "axis";
  id: string;
  name: string;
  code: string;
  axisType: (typeof AXIS_TYPES)[number];
  description: string;
  sortOrder: string;
  startTick: string;
  endTick: string;
  status: TimelineStructStatus;
};

type EraEditState = {
  nodeType: "era";
  id: string;
  axisId: string;
  name: string;
  code: string;
  summary: string;
  description: string;
  order: string;
  startTick: string;
  endTick: string;
  status: TimelineStructStatus;
};

type SegmentEditState = {
  nodeType: "segment";
  id: string;
  axisId: string;
  eraId: string;
  name: string;
  code: string;
  summary: string;
  description: string;
  order: string;
  startTick: string;
  endTick: string;
  status: TimelineStructStatus;
};

type EditNodeState = AxisEditState | EraEditState | SegmentEditState | null;

const CREATE_MODE_LABELS: Record<CreateMode, string> = {
  axis: "Axis",
  era: "Era",
  segment: "Segment",
  marker: "Marker",
};

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

const toInputValue = (value?: number): string =>
  typeof value === "number" ? String(value) : "";

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
  const [detailNode, setDetailNode] = useState<DetailNodeState>(null);
  const [editNode, setEditNode] = useState<EditNodeState>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draggingNode, setDraggingNode] = useState<DragNodeState>(null);
  const [dragOverNodeKey, setDragOverNodeKey] = useState("");

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
  const mainAxis = useMemo(
    () => axes.find((axis) => axis.axisType === "main"),
    [axes]
  );
  const hasMainAxis = Boolean(mainAxis);
  const firstAvailableCreateAxisType = useMemo<(typeof AXIS_TYPES)[number]>(
    () => AXIS_TYPES.find((type) => !hasMainAxis || type !== "main") ?? "parallel",
    [hasMainAxis]
  );
  const createAxisTypeOptions = useMemo(
    () =>
      AXIS_TYPES.filter((type) => !hasMainAxis || type !== "main").map((value) => ({
        value,
        label: AXIS_TYPE_LABELS[value],
      })),
    [hasMainAxis]
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

  useEffect(() => {
    if (createMode !== "axis") {
      return;
    }
    if (axisType === "main" && hasMainAxis) {
      setAxisType(firstAvailableCreateAxisType);
    }
  }, [axisType, createMode, firstAvailableCreateAxisType, hasMainAxis]);

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
      setAxisName("");
      setAxisCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateEra = async () => {
    const targetAxisId =
      (selectedAxisId && axes.some((axis) => axis.id === selectedAxisId)
        ? selectedAxisId
        : [...axes].sort(sortAxes)[0]?.id) ?? "";
    if (!targetAxisId) {
      notify(t("Select an axis first"), "error");
      return;
    }
    if (!eraName.trim()) {
      notify(t("Era name is required"), "error");
      return;
    }
    try {
      const created = await createTimelineEra({
        axisId: targetAxisId,
        name: eraName.trim(),
        code: eraCode.trim() || undefined,
      });
      notify(t("Era created"), "success");
      await refreshData();
      setSelectedAxisId(created.axisId);
      setSelectedEraId(created.id);
      setSelectedSegmentId("");
      setSelectedNodeKey(getNodeKey("era", created.id));
      setEraName("");
      setEraCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateSegment = async () => {
    const targetEraId =
      (selectedEraId && eras.some((era) => era.id === selectedEraId)
        ? selectedEraId
        : [...eras].sort(sortEras)[0]?.id) ?? "";
    if (!targetEraId) {
      notify(t("Select an era first"), "error");
      return;
    }
    if (!segmentName.trim()) {
      notify(t("Segment name is required"), "error");
      return;
    }
    try {
      const created = await createTimelineSegment({
        eraId: targetEraId,
        name: segmentName.trim(),
        code: segmentCode.trim() || undefined,
      });
      notify(t("Segment created"), "success");
      await refreshData();
      setSelectedAxisId(created.axisId);
      setSelectedEraId(created.eraId);
      setSelectedSegmentId(created.id);
      setSelectedNodeKey(getNodeKey("segment", created.id));
      setSegmentName("");
      setSegmentCode("");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateMarker = async () => {
    const targetSegmentId =
      (selectedSegmentId &&
      segments.some((segment) => segment.id === selectedSegmentId)
        ? selectedSegmentId
        : [...segments].sort(sortSegments)[0]?.id) ?? "";
    if (!targetSegmentId) {
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
        segmentId: targetSegmentId,
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

  const clearDragState = () => {
    setDraggingNode(null);
    setDragOverNodeKey("");
  };

  const canDropOnTarget = (targetType: DropTargetType, targetId: string): boolean => {
    if (!draggingNode) {
      return false;
    }
    if (draggingNode.nodeType === "era" && targetType === "axis") {
      const era = eras.find((item) => item.id === draggingNode.id);
      return Boolean(era && era.axisId !== targetId);
    }
    if (draggingNode.nodeType === "segment" && targetType === "era") {
      const segment = segments.find((item) => item.id === draggingNode.id);
      return Boolean(segment && segment.eraId !== targetId);
    }
    if (draggingNode.nodeType === "marker" && targetType === "segment") {
      const marker = markers.find((item) => item.id === draggingNode.id);
      return Boolean(marker && marker.segmentId !== targetId);
    }
    return false;
  };

  const handleDropToTarget = async (targetType: DropTargetType, targetId: string) => {
    if (!draggingNode || !canDropOnTarget(targetType, targetId)) {
      clearDragState();
      return;
    }

    try {
      if (draggingNode.nodeType === "era" && targetType === "axis") {
        const era = eras.find((item) => item.id === draggingNode.id);
        if (!era) {
          clearDragState();
          return;
        }
        await updateTimelineEra(era.id, {
          axisId: targetId,
          name: era.name,
          code: era.code,
          summary: era.summary,
          description: era.description,
          order: era.order,
          startTick: era.startTick,
          endTick: era.endTick,
          status: era.status,
          notes: era.notes,
          tags: era.tags,
        });
      }

      if (draggingNode.nodeType === "segment" && targetType === "era") {
        const segment = segments.find((item) => item.id === draggingNode.id);
        if (!segment) {
          clearDragState();
          return;
        }
        await updateTimelineSegment(segment.id, {
          eraId: targetId,
          name: segment.name,
          code: segment.code,
          summary: segment.summary,
          description: segment.description,
          order: segment.order,
          startTick: segment.startTick,
          endTick: segment.endTick,
          status: segment.status,
          notes: segment.notes,
          tags: segment.tags,
        });
      }

      if (draggingNode.nodeType === "marker" && targetType === "segment") {
        const marker = markers.find((item) => item.id === draggingNode.id);
        if (!marker) {
          clearDragState();
          return;
        }
        await updateTimelineMarker(marker.id, {
          segmentId: targetId,
          label: marker.label,
          tick: marker.tick,
          markerType: marker.markerType,
          description: marker.description,
          eventRefId: marker.eventRefId,
          status: marker.status,
          notes: marker.notes,
          tags: marker.tags,
        });
      }

      notify(t("Node moved successfully."), "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      clearDragState();
    }
  };

  const openDetail = (
    nodeType: EditableNodeType,
    node: TimelineAxis | TimelineEra | TimelineSegment
  ) => {
    if (nodeType === "axis") {
      setDetailNode({ nodeType, node: node as TimelineAxis });
      return;
    }
    if (nodeType === "era") {
      setDetailNode({ nodeType, node: node as TimelineEra });
      return;
    }
    setDetailNode({ nodeType, node: node as TimelineSegment });
  };

  const openEditAxis = (axis: TimelineAxis) => {
    setEditNode({
      nodeType: "axis",
      id: axis.id,
      name: axis.name,
      code: axis.code ?? "",
      axisType: axis.axisType,
      description: axis.description ?? "",
      sortOrder: toInputValue(axis.sortOrder),
      startTick: toInputValue(axis.startTick),
      endTick: toInputValue(axis.endTick),
      status: axis.status ?? "active",
    });
  };

  const openEditEra = (era: TimelineEra) => {
    setEditNode({
      nodeType: "era",
      id: era.id,
      axisId: era.axisId,
      name: era.name,
      code: era.code ?? "",
      summary: era.summary ?? "",
      description: era.description ?? "",
      order: toInputValue(era.order),
      startTick: toInputValue(era.startTick),
      endTick: toInputValue(era.endTick),
      status: era.status ?? "active",
    });
  };

  const openEditSegment = (segment: TimelineSegment) => {
    setEditNode({
      nodeType: "segment",
      id: segment.id,
      axisId: segment.axisId,
      eraId: segment.eraId,
      name: segment.name,
      code: segment.code ?? "",
      summary: segment.summary ?? "",
      description: segment.description ?? "",
      order: toInputValue(segment.order),
      startTick: toInputValue(segment.startTick),
      endTick: toInputValue(segment.endTick),
      status: segment.status ?? "active",
    });
  };

  const parseOptionalNumber = (
    value: string,
    label: string
  ): number | undefined => {
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new Error(t(`${label} must be a number`));
    }
    return parsed;
  };

  const validateTickRange = (
    startTick?: number,
    endTick?: number
  ): boolean => {
    if (
      typeof startTick === "number" &&
      typeof endTick === "number" &&
      startTick > endTick
    ) {
      notify(t("Start tick cannot be greater than end tick"), "error");
      return false;
    }
    return true;
  };

  const handleSaveEdit = async () => {
    if (!editNode) {
      return;
    }

    const trimmedName = editNode.name.trim();
    if (!trimmedName) {
      if (editNode.nodeType === "axis") {
        notify(t("Axis name is required"), "error");
      } else if (editNode.nodeType === "era") {
        notify(t("Era name is required"), "error");
      } else {
        notify(t("Segment name is required"), "error");
      }
      return;
    }

    try {
      setSavingEdit(true);
      if (editNode.nodeType === "axis") {
        const sortOrder = parseOptionalNumber(editNode.sortOrder, "Sort order");
        const startTick = parseOptionalNumber(editNode.startTick, "Start tick");
        const endTick = parseOptionalNumber(editNode.endTick, "End tick");
        if (!validateTickRange(startTick, endTick)) {
          setSavingEdit(false);
          return;
        }
        await updateTimelineAxis(editNode.id, {
          name: trimmedName,
          code: editNode.code.trim() || undefined,
          axisType: editNode.axisType,
          description: editNode.description.trim() || undefined,
          sortOrder,
          startTick,
          endTick,
          status: editNode.status,
        });
      } else if (editNode.nodeType === "era") {
        const order = parseOptionalNumber(editNode.order, "Order");
        const startTick = parseOptionalNumber(editNode.startTick, "Start tick");
        const endTick = parseOptionalNumber(editNode.endTick, "End tick");
        if (!validateTickRange(startTick, endTick)) {
          setSavingEdit(false);
          return;
        }
        await updateTimelineEra(editNode.id, {
          axisId: editNode.axisId,
          name: trimmedName,
          code: editNode.code.trim() || undefined,
          summary: editNode.summary.trim() || undefined,
          description: editNode.description.trim() || undefined,
          order,
          startTick,
          endTick,
          status: editNode.status,
        });
      } else {
        const order = parseOptionalNumber(editNode.order, "Order");
        const startTick = parseOptionalNumber(editNode.startTick, "Start tick");
        const endTick = parseOptionalNumber(editNode.endTick, "End tick");
        if (!validateTickRange(startTick, endTick)) {
          setSavingEdit(false);
          return;
        }
        await updateTimelineSegment(editNode.id, {
          eraId: editNode.eraId,
          name: trimmedName,
          code: editNode.code.trim() || undefined,
          summary: editNode.summary.trim() || undefined,
          description: editNode.description.trim() || undefined,
          order,
          startTick,
          endTick,
          status: editNode.status,
        });
      }

      notify(t("Save changes"), "success");
      setEditNode(null);
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteNodeByType = async (
    nodeType: EditableNodeType,
    id: string
  ) => {
    try {
      let successMessage = "Deleted successfully.";
      if (nodeType === "axis") {
        await deleteTimelineAxis(id);
        successMessage = "Axis deleted";
      } else if (nodeType === "era") {
        await deleteTimelineEra(id);
        successMessage = "Era deleted";
      } else {
        await deleteTimelineSegment(id);
        successMessage = "Segment deleted";
      }
      notify(t(successMessage), "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleDeleteAxis = async (axis: TimelineAxis) => {
    if (!window.confirm(t("Delete this axis? This action cannot be undone."))) {
      return;
    }
    await deleteNodeByType("axis", axis.id);
  };

  const handleDeleteEra = async (era: TimelineEra) => {
    if (!window.confirm(t("Delete this era? This action cannot be undone."))) {
      return;
    }
    await deleteNodeByType("era", era.id);
  };

  const handleDeleteSegment = async (segment: TimelineSegment) => {
    if (!window.confirm(t("Delete this segment? This action cannot be undone."))) {
      return;
    }
    await deleteNodeByType("segment", segment.id);
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
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.id);
            setDraggingNode({ nodeType: "marker", id: node.id });
          }}
          onDragEnd={clearDragState}
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
    const isDragOver = dragOverNodeKey === nodeKey;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className={`tree-row${isDragOver ? " tree-row--drag-over" : ""}`}
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.id);
            setDraggingNode({ nodeType: "segment", id: node.id });
          }}
          onDragEnd={clearDragState}
          onDragOver={(event) => {
            if (canDropOnTarget("segment", node.id)) {
              event.preventDefault();
              if (dragOverNodeKey !== nodeKey) {
                setDragOverNodeKey(nodeKey);
              }
            }
          }}
          onDragLeave={() => {
            if (dragOverNodeKey === nodeKey) {
              setDragOverNodeKey("");
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canDropOnTarget("segment", node.id)) {
              void handleDropToTarget("segment", node.id);
            }
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
              className="table__action"
              onClick={(event) => {
                event.stopPropagation();
                openDetail("segment", node);
              }}
            >
              {t("Detail")}
            </button>
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                openEditSegment(node);
              }}
            >
              {t("Edit")}
            </button>
            <button
              type="button"
              className="table__action table__action--danger"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeleteSegment(node);
              }}
            >
              {t("Delete")}
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
    const isDragOver = dragOverNodeKey === nodeKey;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className={`tree-row${isDragOver ? " tree-row--drag-over" : ""}`}
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.id);
            setDraggingNode({ nodeType: "era", id: node.id });
          }}
          onDragEnd={clearDragState}
          onDragOver={(event) => {
            if (canDropOnTarget("era", node.id)) {
              event.preventDefault();
              if (dragOverNodeKey !== nodeKey) {
                setDragOverNodeKey(nodeKey);
              }
            }
          }}
          onDragLeave={() => {
            if (dragOverNodeKey === nodeKey) {
              setDragOverNodeKey("");
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canDropOnTarget("era", node.id)) {
              void handleDropToTarget("era", node.id);
            }
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
              className="table__action"
              onClick={(event) => {
                event.stopPropagation();
                openDetail("era", node);
              }}
            >
              {t("Detail")}
            </button>
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                openEditEra(node);
              }}
            >
              {t("Edit")}
            </button>
            <button
              type="button"
              className="table__action table__action--danger"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeleteEra(node);
              }}
            >
              {t("Delete")}
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
    const isDragOver = dragOverNodeKey === nodeKey;

    return (
      <div key={nodeKey} className="tree-item">
        <div
          className={`tree-row${isDragOver ? " tree-row--drag-over" : ""}`}
          style={{
            paddingLeft: `${depth * 20 + 12}px`,
            boxShadow: isSelected
              ? "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 50%, transparent)"
              : undefined,
          }}
          onDragOver={(event) => {
            if (canDropOnTarget("axis", node.id)) {
              event.preventDefault();
              if (dragOverNodeKey !== nodeKey) {
                setDragOverNodeKey(nodeKey);
              }
            }
          }}
          onDragLeave={() => {
            if (dragOverNodeKey === nodeKey) {
              setDragOverNodeKey("");
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canDropOnTarget("axis", node.id)) {
              void handleDropToTarget("axis", node.id);
            }
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
              className="table__action"
              onClick={(event) => {
                event.stopPropagation();
                openDetail("axis", node);
              }}
            >
              {t("Detail")}
            </button>
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                openEditAxis(node);
              }}
            >
              {t("Edit")}
            </button>
            <button
              type="button"
              className="table__action table__action--danger"
              onClick={(event) => {
                event.stopPropagation();
                void handleDeleteAxis(node);
              }}
            >
              {t("Delete")}
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

  const createDisabled =
    createMode === "axis"
      ? false
      : createMode === "era"
        ? axes.length === 0
        : createMode === "segment"
          ? eras.length === 0
          : segments.length === 0;

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
        description="Create one node at a time, then drag and drop to re-parent."
      >
        <Select
          label="Node type"
          value={createMode}
          onChange={(value) => setCreateMode((value as CreateMode) || "axis")}
          options={(Object.keys(CREATE_MODE_LABELS) as CreateMode[]).map((value) => ({
            value,
            label: CREATE_MODE_LABELS[value],
          }))}
          placeholder="Select type"
        />

        {createMode === "axis" ? (
          <>
            <TextInput label="Axis name" value={axisName} onChange={setAxisName} required />
            <TextInput label="Axis code" value={axisCode} onChange={setAxisCode} />
            <Select
              label="Axis type"
              value={axisType}
              onChange={(value) =>
                setAxisType(
                  (value as (typeof AXIS_TYPES)[number]) || firstAvailableCreateAxisType
                )
              }
              options={createAxisTypeOptions}
              placeholder="Select type"
            />
          </>
        ) : null}

        {createMode === "era" ? (
          <>
            <TextInput label="Era name" value={eraName} onChange={setEraName} required />
            <TextInput label="Era code" value={eraCode} onChange={setEraCode} />
          </>
        ) : null}

        {createMode === "segment" ? (
          <>
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
            {t("Add node")}
          </Button>
        </div>
        <div className="form-field form-field--wide">
          <p className="header__subtitle">
            {hasMainAxis
              ? `${t("Main axis already exists. Only one main axis is allowed.")} `
              : ""}
            {t("Drag an era onto an axis, segment onto an era, and marker onto a segment to re-parent.")}
          </p>
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

      {detailNode ? (
        <div className="modal__backdrop" onClick={() => setDetailNode(null)}>
          <div
            className="modal modal--details modal--wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal__header">
              <div>
                <h3 className="section-title">
                  {detailNode.nodeType === "axis"
                    ? t("Axis details")
                    : detailNode.nodeType === "era"
                      ? t("Era details")
                      : t("Segment details")}
                </h3>
                <p className="modal__subtitle">{detailNode.node.name}</p>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={() => setDetailNode(null)}
                aria-label={t("Close modal")}
              >
                ×
              </button>
            </div>
            <div className="modal__body detail-sections">
              <div className="detail-item">
                <span className="detail-item__label">{t("Type")}</span>
                <strong>
                  {detailNode.nodeType === "axis"
                    ? t(AXIS_TYPE_LABELS[detailNode.node.axisType])
                    : detailNode.nodeType === "era"
                      ? t("Era")
                      : t("Segment")}
                </strong>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">{t("Code")}</span>
                <strong>{detailNode.node.code || "-"}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">{t("Status")}</span>
                <strong>
                  {detailNode.node.status === "archived" ? t("Archived") : t("Active")}
                </strong>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">{t("Tick")}</span>
                <strong>
                  {formatTickRange(detailNode.node.startTick, detailNode.node.endTick)}
                </strong>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">{t("Parent")}</span>
                <strong>
                  {detailNode.nodeType === "axis"
                    ? "-"
                    : detailNode.nodeType === "era"
                      ? axisNameById.get(detailNode.node.axisId) ?? "-"
                      : eraNameById.get(detailNode.node.eraId) ?? "-"}
                </strong>
              </div>
              <div className="detail-item detail-item--wide">
                <span className="detail-item__label">
                  {detailNode.nodeType === "axis" ? t("Description") : t("Summary")}
                </span>
                <p className="header__subtitle" style={{ margin: 0 }}>
                  {detailNode.nodeType === "axis"
                    ? detailNode.node.description || "-"
                    : detailNode.node.summary || detailNode.node.description || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editNode ? (
        <div className="modal__backdrop" onClick={() => setEditNode(null)}>
          <div
            className="modal modal--wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal__header">
              <div>
                <h3 className="section-title">
                  {editNode.nodeType === "axis"
                    ? t("Edit axis")
                    : editNode.nodeType === "era"
                      ? t("Edit era")
                      : t("Edit segment")}
                </h3>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={() => setEditNode(null)}
                aria-label={t("Close modal")}
              >
                ×
              </button>
            </div>
            <div className="modal__body">
              <div className="modal__grid">
                <TextInput
                  label={
                    editNode.nodeType === "axis"
                      ? "Axis name"
                      : editNode.nodeType === "era"
                        ? "Era name"
                        : "Segment name"
                  }
                  value={editNode.name}
                  onChange={(value) =>
                    setEditNode((prev) => (prev ? { ...prev, name: value } : prev))
                  }
                  required
                />
                <TextInput
                  label={
                    editNode.nodeType === "axis"
                      ? "Axis code"
                      : editNode.nodeType === "era"
                        ? "Era code"
                        : "Segment code"
                  }
                  value={editNode.code}
                  onChange={(value) =>
                    setEditNode((prev) => (prev ? { ...prev, code: value } : prev))
                  }
                />
                {editNode.nodeType === "axis" ? (
                  <Select
                    label="Axis type"
                    value={editNode.axisType}
                    onChange={(value) =>
                      setEditNode((prev) =>
                        prev && prev.nodeType === "axis"
                          ? {
                              ...prev,
                              axisType:
                                (value as (typeof AXIS_TYPES)[number]) || prev.axisType,
                            }
                          : prev
                      )
                    }
                    options={AXIS_TYPES.filter(
                      (value) =>
                        value !== "main" || !hasMainAxis || editNode.axisType === "main"
                    ).map((value) => ({
                      value,
                      label: AXIS_TYPE_LABELS[value],
                    }))}
                    placeholder="Select type"
                  />
                ) : (
                  <div className="form-field">
                    <label>{t("Parent")}</label>
                    <p className="header__subtitle">
                      {editNode.nodeType === "era"
                        ? axisNameById.get(editNode.axisId) ?? "-"
                        : eraNameById.get(editNode.eraId) ?? "-"}
                    </p>
                  </div>
                )}
                <Select
                  label="Status"
                  value={editNode.status}
                  onChange={(value) =>
                    setEditNode((prev) =>
                      prev
                        ? {
                            ...prev,
                            status:
                              value === "archived" ? "archived" : "active",
                          }
                        : prev
                    )
                  }
                  options={[
                    { value: "active", label: "Active" },
                    { value: "archived", label: "Archived" },
                  ]}
                  placeholder="Select"
                />
                <TextInput
                  label={editNode.nodeType === "axis" ? "Sort order" : "Order"}
                  type="number"
                  value={editNode.nodeType === "axis" ? editNode.sortOrder : editNode.order}
                  onChange={(value) =>
                    setEditNode((prev) => {
                      if (!prev) {
                        return prev;
                      }
                      if (prev.nodeType === "axis") {
                        return { ...prev, sortOrder: value };
                      }
                      return { ...prev, order: value };
                    })
                  }
                />
                <TextInput
                  label="Start tick"
                  type="number"
                  value={editNode.startTick}
                  onChange={(value) =>
                    setEditNode((prev) => (prev ? { ...prev, startTick: value } : prev))
                  }
                />
                <TextInput
                  label="End tick"
                  type="number"
                  value={editNode.endTick}
                  onChange={(value) =>
                    setEditNode((prev) => (prev ? { ...prev, endTick: value } : prev))
                  }
                />
                <div className="form-field form-field--wide">
                  <label>{editNode.nodeType === "axis" ? t("Description") : t("Summary")}</label>
                  <textarea
                    className="textarea"
                    value={
                      editNode.nodeType === "axis"
                        ? editNode.description
                        : editNode.summary
                    }
                    onChange={(event) =>
                      setEditNode((prev) => {
                        if (!prev) {
                          return prev;
                        }
                        if (prev.nodeType === "axis") {
                          return { ...prev, description: event.target.value };
                        }
                        return { ...prev, summary: event.target.value };
                      })
                    }
                    rows={4}
                  />
                </div>
                {editNode.nodeType !== "axis" ? (
                  <div className="form-field form-field--wide">
                    <label>{t("Description")}</label>
                    <textarea
                      className="textarea"
                      value={editNode.description}
                      onChange={(event) =>
                        setEditNode((prev) =>
                          prev && prev.nodeType !== "axis"
                            ? { ...prev, description: event.target.value }
                            : prev
                        )
                      }
                      rows={4}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="modal__footer">
              <Button variant="ghost" onClick={() => setEditNode(null)} disabled={savingEdit}>
                {t("Cancel")}
              </Button>
              <Button onClick={() => void handleSaveEdit()} disabled={savingEdit}>
                {savingEdit ? t("Saving...") : t("Save changes")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
