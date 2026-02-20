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

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

type TimelineStructurePanelProps = {
  open: boolean;
};

export const TimelineStructurePanel = ({ open }: TimelineStructurePanelProps) => {
  const { t } = useI18n();
  const { notify } = useToast();

  const [loading, setLoading] = useState(false);
  const [axes, setAxes] = useState<TimelineAxis[]>([]);
  const [eras, setEras] = useState<TimelineEra[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);

  const [selectedAxisId, setSelectedAxisId] = useState("");
  const [selectedEraId, setSelectedEraId] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

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

  const axisOptions = useMemo(
    () => axes.map((axis) => ({ value: axis.id, label: `${axis.name} (${axis.id})` })),
    [axes]
  );

  const eraOptions = useMemo(
    () => eras.map((era) => ({ value: era.id, label: `${era.name} (${era.id})` })),
    [eras]
  );

  const segmentOptions = useMemo(
    () =>
      segments.map((segment) => ({
        value: segment.id,
        label: `${segment.name} (${segment.id})`,
      })),
    [segments]
  );

  const loadAxes = useCallback(async (): Promise<TimelineAxis[]> => {
    const response = await getTimelineAxesPage({ limit: 200, offset: 0 });
    const items = response.data ?? [];
    setAxes(items);
    return items;
  }, []);

  const loadEras = useCallback(async (axisId?: string): Promise<TimelineEra[]> => {
    const response = await getTimelineErasPage({
      limit: 300,
      offset: 0,
      axisId: axisId || undefined,
    });
    const items = response.data ?? [];
    setEras(items);
    return items;
  }, []);

  const loadSegments = useCallback(
    async (axisId?: string, eraId?: string): Promise<TimelineSegment[]> => {
      const response = await getTimelineSegmentsPage({
        limit: 400,
        offset: 0,
        axisId: axisId || undefined,
        eraId: eraId || undefined,
      });
      const items = response.data ?? [];
      setSegments(items);
      return items;
    },
    []
  );

  const loadMarkers = useCallback(
    async (
      axisId?: string,
      eraId?: string,
      segmentId?: string
    ): Promise<TimelineMarker[]> => {
      const response = await getTimelineMarkersPage({
        limit: 500,
        offset: 0,
        axisId: axisId || undefined,
        eraId: eraId || undefined,
        segmentId: segmentId || undefined,
      });
      const items = response.data ?? [];
      setMarkers(items);
      return items;
    },
    []
  );

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const loadedAxes = await loadAxes();
      const axisId =
        selectedAxisId && loadedAxes.some((axis) => axis.id === selectedAxisId)
          ? selectedAxisId
          : loadedAxes[0]?.id ?? "";
      setSelectedAxisId(axisId);

      const loadedEras = await loadEras(axisId || undefined);
      const eraId =
        selectedEraId && loadedEras.some((era) => era.id === selectedEraId)
          ? selectedEraId
          : loadedEras[0]?.id ?? "";
      setSelectedEraId(eraId);

      const loadedSegments = await loadSegments(axisId || undefined, eraId || undefined);
      const segmentId =
        selectedSegmentId &&
        loadedSegments.some((segment) => segment.id === selectedSegmentId)
          ? selectedSegmentId
          : loadedSegments[0]?.id ?? "";
      setSelectedSegmentId(segmentId);

      await loadMarkers(axisId || undefined, eraId || undefined, segmentId || undefined);
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
    selectedSegmentId,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshData();
  }, [open, refreshData]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!selectedAxisId) {
      setEras([]);
      setSegments([]);
      setMarkers([]);
      setSelectedEraId("");
      setSelectedSegmentId("");
      return;
    }
    const sync = async () => {
      try {
        const loadedEras = await loadEras(selectedAxisId);
        const nextEraId =
          selectedEraId && loadedEras.some((era) => era.id === selectedEraId)
            ? selectedEraId
            : loadedEras[0]?.id ?? "";
        setSelectedEraId(nextEraId);
      } catch (error) {
        notify((error as Error).message, "error");
      }
    };
    void sync();
  }, [open, selectedAxisId, selectedEraId, loadEras, notify]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!selectedEraId) {
      setSegments([]);
      setMarkers([]);
      setSelectedSegmentId("");
      return;
    }
    const sync = async () => {
      try {
        const loadedSegments = await loadSegments(selectedAxisId, selectedEraId);
        const nextSegmentId =
          selectedSegmentId &&
          loadedSegments.some((segment) => segment.id === selectedSegmentId)
            ? selectedSegmentId
            : loadedSegments[0]?.id ?? "";
        setSelectedSegmentId(nextSegmentId);
      } catch (error) {
        notify((error as Error).message, "error");
      }
    };
    void sync();
  }, [
    open,
    selectedAxisId,
    selectedEraId,
    selectedSegmentId,
    loadSegments,
    notify,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!selectedSegmentId) {
      setMarkers([]);
      return;
    }
    const sync = async () => {
      try {
        await loadMarkers(selectedAxisId, selectedEraId, selectedSegmentId);
      } catch (error) {
        notify((error as Error).message, "error");
      }
    };
    void sync();
  }, [open, selectedAxisId, selectedEraId, selectedSegmentId, loadMarkers, notify]);

  const handleCreateAxis = async () => {
    if (!axisName.trim()) {
      notify("Axis name is required", "error");
      return;
    }
    try {
      await createTimelineAxis({
        name: axisName.trim(),
        code: axisCode.trim() || undefined,
        axisType,
      });
      setAxisName("");
      setAxisCode("");
      notify("Axis created", "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateEra = async () => {
    if (!selectedAxisId) {
      notify("Select an axis first", "error");
      return;
    }
    if (!eraName.trim()) {
      notify("Era name is required", "error");
      return;
    }
    try {
      await createTimelineEra({
        axisId: selectedAxisId,
        name: eraName.trim(),
        code: eraCode.trim() || undefined,
      });
      setEraName("");
      setEraCode("");
      notify("Era created", "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateSegment = async () => {
    if (!selectedEraId) {
      notify("Select an era first", "error");
      return;
    }
    if (!segmentName.trim()) {
      notify("Segment name is required", "error");
      return;
    }
    try {
      await createTimelineSegment({
        eraId: selectedEraId,
        name: segmentName.trim(),
        code: segmentCode.trim() || undefined,
      });
      setSegmentName("");
      setSegmentCode("");
      notify("Segment created", "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const handleCreateMarker = async () => {
    if (!selectedSegmentId) {
      notify("Select a segment first", "error");
      return;
    }
    if (!markerLabel.trim()) {
      notify("Marker label is required", "error");
      return;
    }
    const parsedTick = Number(markerTick);
    if (!Number.isFinite(parsedTick)) {
      notify("Tick must be a number", "error");
      return;
    }
    try {
      await createTimelineMarker({
        segmentId: selectedSegmentId,
        label: markerLabel.trim(),
        tick: parsedTick,
        markerType: markerType.trim() || undefined,
      });
      setMarkerLabel("");
      setMarkerType("");
      setMarkerTick("");
      notify("Marker created", "success");
      await refreshData();
    } catch (error) {
      notify((error as Error).message, "error");
    }
  };

  const runSnapshot = async () => {
    if (!selectedAxisId) {
      notify("Select an axis first", "error");
      return;
    }
    const parsedTick = Number(tick);
    if (!Number.isFinite(parsedTick)) {
      notify("Tick must be a number", "error");
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
      notify("Select an axis first", "error");
      return;
    }
    const parsedTick = Number(tick);
    if (!Number.isFinite(parsedTick)) {
      notify("Tick must be a number", "error");
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
      notify("Select an axis first", "error");
      return;
    }
    if (!subjectId.trim()) {
      notify("Subject ID is required for diff", "error");
      return;
    }
    const parsedFromTick = Number(fromTick);
    const parsedToTick = Number(toTick);
    if (!Number.isFinite(parsedFromTick) || !Number.isFinite(parsedToTick)) {
      notify("fromTick and toTick must be numbers", "error");
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
      notify("Select an axis first", "error");
      return;
    }
    if (!subjectId.trim()) {
      notify("Subject ID is required for history", "error");
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

  if (!open) {
    return null;
  }

  return (
    <div className="timeline-page" style={{ marginTop: 16 }}>
      <FormSection
        title="Timeline-first panel"
        description="Manage axis, era, segment, marker and state APIs."
      >
        <Select
          label="Axis"
          value={selectedAxisId}
          onChange={setSelectedAxisId}
          options={axisOptions}
          placeholder="Select axis"
        />
        <Select
          label="Era"
          value={selectedEraId}
          onChange={setSelectedEraId}
          options={eraOptions}
          placeholder="Select era"
          disabled={!selectedAxisId}
        />
        <Select
          label="Segment"
          value={selectedSegmentId}
          onChange={setSelectedSegmentId}
          options={segmentOptions}
          placeholder="Select segment"
          disabled={!selectedEraId}
        />
        <div className="form-field">
          <label>{t("Refresh")}</label>
          <Button variant="ghost" onClick={() => void refreshData()} disabled={loading}>
            {loading ? "Loading..." : "Reload timeline-first data"}
          </Button>
        </div>
      </FormSection>

      <FormSection title="Create axis">
        <TextInput label="Axis name" value={axisName} onChange={setAxisName} required />
        <TextInput label="Axis code" value={axisCode} onChange={setAxisCode} />
        <Select
          label="Axis type"
          value={axisType}
          onChange={(value) =>
            setAxisType((value as (typeof AXIS_TYPES)[number]) || "main")
          }
          options={AXIS_TYPES.map((value) => ({ value, label: value }))}
          placeholder="Select type"
        />
        <div className="form-field">
          <label>{t("Action")}</label>
          <Button onClick={() => void handleCreateAxis()}>Create axis</Button>
        </div>
      </FormSection>

      <FormSection title="Create era">
        <TextInput label="Era name" value={eraName} onChange={setEraName} required />
        <TextInput label="Era code" value={eraCode} onChange={setEraCode} />
        <TextInput label="Axis ID" value={selectedAxisId} onChange={setSelectedAxisId} />
        <div className="form-field">
          <label>{t("Action")}</label>
          <Button onClick={() => void handleCreateEra()} disabled={!selectedAxisId}>
            Create era
          </Button>
        </div>
      </FormSection>

      <FormSection title="Create segment">
        <TextInput
          label="Segment name"
          value={segmentName}
          onChange={setSegmentName}
          required
        />
        <TextInput label="Segment code" value={segmentCode} onChange={setSegmentCode} />
        <TextInput label="Era ID" value={selectedEraId} onChange={setSelectedEraId} />
        <div className="form-field">
          <label>{t("Action")}</label>
          <Button onClick={() => void handleCreateSegment()} disabled={!selectedEraId}>
            Create segment
          </Button>
        </div>
      </FormSection>

      <FormSection title="Create marker">
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
        <TextInput
          label="Segment ID"
          value={selectedSegmentId}
          onChange={setSelectedSegmentId}
        />
        <div className="form-field">
          <label>{t("Action")}</label>
          <Button onClick={() => void handleCreateMarker()} disabled={!selectedSegmentId}>
            Create marker
          </Button>
        </div>
      </FormSection>

      <FormSection title="State queries">
        <Select
          label="Subject type"
          value={subjectType}
          onChange={(value) =>
            setSubjectType((value as (typeof SUBJECT_TYPES)[number]) || "character")
          }
          options={SUBJECT_TYPES.map((value) => ({ value, label: value }))}
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
        <div className="form-field">
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
      </FormSection>
    </div>
  );
};
