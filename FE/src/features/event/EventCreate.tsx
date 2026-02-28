import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { FilterPanel } from "../../components/common/FilterPanel";
import { Pagination } from "../../components/common/Pagination";
import { ListPanel } from "../../components/common/ListPanel";
import { CrudPageShell } from "../../components/crud/CrudPageShell";
import { useToast } from "../../components/common/Toast";
import { FormSection } from "../../components/form/FormSection";
import { MultiSelect } from "../../components/form/MultiSelect";
import { Select } from "../../components/form/Select";
import { TextArea } from "../../components/form/TextArea";
import { TextInput } from "../../components/form/TextInput";
import { useForm } from "../../hooks/useForm";
import { useProjectChange } from "../../hooks/useProjectChange";
import { useI18n } from "../../i18n/I18nProvider";
import { createEvent, deleteEvent, getEventsPage, updateEvent } from "./event.api";
import { getAllLocations } from "../location/location.api";
import { getAllCharacters } from "../character/character.api";
import {
  getTimelineMarkersPage,
  getTimelineSegmentsPage,
} from "../timeline/timeline-structure.api";
import { EventList } from "./EventList";
import { validateEvent } from "./event.schema";
import type { Event, EventParticipant, EventPayload } from "./event.types";
import type { Location } from "../location/location.types";
import type { Character } from "../character/character.types";
import type {
  TimelineMarker,
  TimelineSegment,
} from "../timeline/timeline-structure.types";

const initialState = {
  name: "",
  type: "",
  typeDetail: "",
  scope: "",
  locationId: "",
  segmentId: "",
  markerId: "",
  summary: "",
  description: "",
  participants: [] as EventParticipantForm[],
  notes: "",
  tags: [] as string[],
};

type EventFormState = typeof initialState;

type EventParticipantForm = {
  characterId: string;
  role: string;
  participationType: string;
  outcome?: string;
  statusChange?: string;
  note?: string;
  characterName?: string;
};

const TYPE_OPTIONS = [
  { value: "POLITICAL", label: "POLITICAL" },
  { value: "MILITARY", label: "MILITARY" },
  { value: "SOCIAL", label: "SOCIAL" },
  { value: "ECONOMIC", label: "ECONOMIC" },
  { value: "CULTURAL", label: "CULTURAL" },
  { value: "KNOWLEDGE", label: "KNOWLEDGE" },
  { value: "NATURAL", label: "NATURAL" },
  { value: "PERSONAL", label: "PERSONAL" },
  { value: "WORLD_LEVEL", label: "WORLD_LEVEL" },
];

const TYPE_DETAIL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  POLITICAL: [
    { value: "FOUNDING", label: "FOUNDING" },
    { value: "ANNEXATION", label: "ANNEXATION" },
    { value: "SECESSION", label: "SECESSION" },
    { value: "REBELLION", label: "REBELLION" },
    { value: "REVOLUTION", label: "REVOLUTION" },
    { value: "COUP", label: "COUP" },
    { value: "REGIME_CHANGE", label: "REGIME_CHANGE" },
    { value: "TREATY", label: "TREATY" },
    { value: "ALLIANCE", label: "ALLIANCE" },
    { value: "BREAK_ALLIANCE", label: "BREAK_ALLIANCE" },
    { value: "DECLARATION", label: "DECLARATION" },
    { value: "LAW_ENACTMENT", label: "LAW_ENACTMENT" },
  ],
  MILITARY: [
    { value: "WAR", label: "WAR" },
    { value: "BATTLE", label: "BATTLE" },
    { value: "SIEGE", label: "SIEGE" },
    { value: "INVASION", label: "INVASION" },
    { value: "DEFENSE", label: "DEFENSE" },
    { value: "MASSACRE", label: "MASSACRE" },
    { value: "MILITARY_CAMPAIGN", label: "MILITARY_CAMPAIGN" },
    { value: "ARMISTICE", label: "ARMISTICE" },
    { value: "OCCUPATION", label: "OCCUPATION" },
    { value: "RETREAT", label: "RETREAT" },
  ],
  SOCIAL: [
    { value: "MIGRATION", label: "MIGRATION" },
    { value: "EXODUS", label: "EXODUS" },
    { value: "UPRISING", label: "UPRISING" },
    { value: "REFORM", label: "REFORM" },
    { value: "CENSUS", label: "CENSUS" },
    { value: "FESTIVAL", label: "FESTIVAL" },
    { value: "RIOT", label: "RIOT" },
    { value: "PURGE", label: "PURGE" },
    { value: "DISPLACEMENT", label: "DISPLACEMENT" },
  ],
  ECONOMIC: [
    { value: "TRADE_AGREEMENT", label: "TRADE_AGREEMENT" },
    { value: "EMBARGO", label: "EMBARGO" },
    { value: "ECONOMIC_BOOM", label: "ECONOMIC_BOOM" },
    { value: "ECONOMIC_CRISIS", label: "ECONOMIC_CRISIS" },
    { value: "RESOURCE_DISCOVERY", label: "RESOURCE_DISCOVERY" },
    { value: "MARKET_COLLAPSE", label: "MARKET_COLLAPSE" },
    { value: "MONOPOLY_FORMED", label: "MONOPOLY_FORMED" },
    { value: "TAX_REFORM", label: "TAX_REFORM" },
  ],
  CULTURAL: [
    { value: "RELIGION_FOUNDING", label: "RELIGION_FOUNDING" },
    { value: "SCHISM", label: "SCHISM" },
    { value: "CRUSADE", label: "CRUSADE" },
    { value: "HERESY_DECLARED", label: "HERESY_DECLARED" },
    { value: "CANONIZATION", label: "CANONIZATION" },
    { value: "CULTURAL_REFORM", label: "CULTURAL_REFORM" },
    { value: "IDEOLOGY_BIRTH", label: "IDEOLOGY_BIRTH" },
    { value: "PROPHET_APPEARANCE", label: "PROPHET_APPEARANCE" },
  ],
  KNOWLEDGE: [
    { value: "DISCOVERY", label: "DISCOVERY" },
    { value: "INVENTION", label: "INVENTION" },
    { value: "MAGIC_BREAKTHROUGH", label: "MAGIC_BREAKTHROUGH" },
    { value: "SPELL_CREATION", label: "SPELL_CREATION" },
    { value: "TECH_REVOLUTION", label: "TECH_REVOLUTION" },
    { value: "EXPERIMENT_FAILURE", label: "EXPERIMENT_FAILURE" },
    { value: "ARTIFACT_CREATION", label: "ARTIFACT_CREATION" },
    { value: "ARTIFACT_LOSS", label: "ARTIFACT_LOSS" },
  ],
  NATURAL: [
    { value: "EARTHQUAKE", label: "EARTHQUAKE" },
    { value: "FLOOD", label: "FLOOD" },
    { value: "VOLCANO", label: "VOLCANO" },
    { value: "STORM", label: "STORM" },
    { value: "PLAGUE", label: "PLAGUE" },
    { value: "FAMINE", label: "FAMINE" },
    { value: "METEOR_IMPACT", label: "METEOR_IMPACT" },
    { value: "CLIMATE_SHIFT", label: "CLIMATE_SHIFT" },
    { value: "MAGICAL_DISASTER", label: "MAGICAL_DISASTER" },
  ],
  PERSONAL: [
    { value: "BIRTH", label: "BIRTH" },
    { value: "DEATH", label: "DEATH" },
    { value: "ASSASSINATION", label: "ASSASSINATION" },
    { value: "CORONATION", label: "CORONATION" },
    { value: "ABDICATION", label: "ABDICATION" },
    { value: "MARRIAGE", label: "MARRIAGE" },
    { value: "BETRAYAL", label: "BETRAYAL" },
    { value: "DUEL", label: "DUEL" },
    { value: "ASCENSION", label: "ASCENSION" },
    { value: "INITIATION", label: "INITIATION" },
    { value: "FALL", label: "FALL" },
  ],
  WORLD_LEVEL: [
    { value: "ERA_BEGIN", label: "ERA_BEGIN" },
    { value: "ERA_END", label: "ERA_END" },
    { value: "WORLD_RESET", label: "WORLD_RESET" },
    { value: "DIVINE_INTERVENTION", label: "DIVINE_INTERVENTION" },
    { value: "SEAL_BROKEN", label: "SEAL_BROKEN" },
    { value: "APOCALYPSE", label: "APOCALYPSE" },
    { value: "WORLD_CREATION", label: "WORLD_CREATION" },
    { value: "WORLD_FRAGMENTATION", label: "WORLD_FRAGMENTATION" },
  ],
};

const SCOPE_OPTIONS = [
  { value: "PERSONAL", label: "PERSONAL" },
  { value: "LOCAL", label: "LOCAL" },
  { value: "SETTLEMENT", label: "SETTLEMENT" },
  { value: "REGIONAL", label: "REGIONAL" },
  { value: "TERRITORIAL", label: "TERRITORIAL" },
  { value: "WORLD", label: "WORLD" },
];

const PARTICIPANT_ROLE_OPTIONS = [
  { value: "CANDIDATE", label: "CANDIDATE" },
  { value: "PARTICIPANT", label: "PARTICIPANT" },
  { value: "LEADER", label: "LEADER" },
  { value: "CHALLENGER", label: "CHALLENGER" },
  { value: "DEFENDER", label: "DEFENDER" },
  { value: "OBSERVER", label: "OBSERVER" },
  { value: "VICTIM", label: "VICTIM" },
  { value: "ORGANIZER", label: "ORGANIZER" },
];

const PARTICIPATION_TYPE_OPTIONS = [
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "PASSIVE", label: "PASSIVE" },
  { value: "INDIRECT", label: "INDIRECT" },
];

const PARTICIPANT_OUTCOME_OPTIONS = [
  { value: "PASSED", label: "PASSED" },
  { value: "FAILED", label: "FAILED" },
  { value: "ELIMINATED", label: "ELIMINATED" },
  { value: "SURVIVED", label: "SURVIVED" },
  { value: "PROMOTED", label: "PROMOTED" },
  { value: "INJURED", label: "INJURED" },
  { value: "CAPTURED", label: "CAPTURED" },
  { value: "ESCAPED", label: "ESCAPED" },
];

export const EventCreate = () => {
  const { t } = useI18n();
  const { values, setField, reset } = useForm<EventFormState>(initialState);
  const [items, setItems] = useState<Event[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Event | null>(null);
  const [editValues, setEditValues] = useState<EventFormState | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [participantId, setParticipantId] = useState("");
  const [editParticipantId, setEditParticipantId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [showList, setShowList] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    name: "",
    tag: "",
    type: "",
    segmentId: "",
    markerId: "",
    locationId: "",
    characterId: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const { notify } = useToast();

  const segmentNameById = Object.fromEntries(
    segments.map((segment) => [segment.id, segment.name])
  ) as Record<string, string>;

  const markerOptions = (segmentId: string) =>
    markers
      .filter((marker) => !segmentId || marker.segmentId === segmentId)
      .map((marker) => ({
        value: marker.id,
        label: `${marker.label} · ${
          segmentNameById[marker.segmentId] ?? marker.segmentId
        } · #${marker.tick}`,
      }));

  const loadItems = useCallback(async () => {
    try {
      const offset = (page - 1) * pageSize;
      const response = await getEventsPage({
        ...filters,
        limit: pageSize + 1,
        offset,
      });
      const data = response?.data ?? [];
      const total = typeof response?.meta?.total === "number" ? response.meta.total : undefined;
      const nextPage = total !== undefined ? offset + Math.min(data.length, pageSize) < total : data.length > pageSize;
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
  }, [page, pageSize, filters, notify, getEventsPage]);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getAllLocations();
      setLocations(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllLocations]);

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getAllCharacters();
      setCharacters(data ?? []);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  }, [getAllCharacters]);

  const loadTimelineStructure = useCallback(async () => {
    try {
      const loadAll = async <T,>(
        loader: (query: { limit: number; offset: number }) => Promise<{
          data: T[];
          meta?: { total?: number };
        }>
      ): Promise<T[]> => {
        const limit = 200;
        let offset = 0;
        let done = false;
        const items: T[] = [];

        while (!done) {
          const response = await loader({ limit, offset });
          const batch = response?.data ?? [];
          items.push(...batch);

          const total =
            typeof response?.meta?.total === "number" ? response.meta.total : undefined;
          offset += batch.length;
          if (total !== undefined) {
            done = offset >= total || batch.length === 0;
          } else {
            done = batch.length < limit;
          }
        }

        return items;
      };

      const [loadedSegments, loadedMarkers] = await Promise.all([
        loadAll((query) => getTimelineSegmentsPage(query)),
        loadAll((query) => getTimelineMarkersPage(query)),
      ]);
      setSegments(loadedSegments);
      setMarkers(loadedMarkers);
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
    void loadLocations();
    void loadCharacters();
    void loadTimelineStructure();
  }, [loadLocations, loadCharacters, loadTimelineStructure]);

  useProjectChange(() => {
    setPage(1);
    setRefreshKey((prev) => prev + 1);
    void loadLocations();
    void loadCharacters();
    void loadTimelineStructure();
  });

  const handleFilterChange = (
    key:
      | "q"
      | "name"
      | "tag"
      | "type"
      | "segmentId"
      | "markerId"
      | "locationId"
      | "characterId",
    value: string
  ) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      q: "",
      name: "",
      tag: "",
      type: "",
      segmentId: "",
      markerId: "",
      locationId: "",
      characterId: "",
    });
  };

  const mapEventToForm = (item: Event): EventFormState => ({
    name: item.name ?? "",
    type: item.type ?? "",
    typeDetail: item.typeDetail ?? "",
    scope: item.scope ?? "",
    locationId: item.locationId ?? "",
    segmentId: item.segmentId ?? item.timelineId ?? "",
    markerId: item.markerId ?? "",
    summary: item.summary ?? "",
    description: item.description ?? "",
    participants: (item.participants ?? []).map((participant) => ({
      ...participant,
      outcome: participant.outcome ?? "",
      statusChange: participant.statusChange ?? "",
      note: participant.note ?? "",
    })),
    notes: item.notes ?? "",
    tags: item.tags ?? [],
  });

  const buildPayload = (): EventPayload => {
    return {
      name: values.name,
      type: values.type || undefined,
      typeDetail: values.typeDetail || undefined,
      scope: values.scope || undefined,
      locationId: values.locationId || undefined,
      markerId: values.markerId || undefined,
      segmentId: values.segmentId || undefined,
      summary: values.summary || undefined,
      description: values.description || undefined,
    participants: values.participants.map((participant) => ({
      characterId: participant.characterId,
      role: participant.role,
      participationType: participant.participationType as EventParticipant["participationType"],
      outcome: participant.outcome || undefined,
      statusChange: participant.statusChange || undefined,
      note: participant.note || undefined,
    })),
    notes: values.notes || undefined,
    tags: values.tags,
    };
  };

  const validateParticipants = (participants: EventParticipantForm[]) => {
    for (const participant of participants) {
      if (!participant.role || !participant.participationType) {
        return t("Participant role and participation type are required.");
      }
    }
    return null;
  };

  const validateMarkerSelection = (form: EventFormState) => {
    if (!form.segmentId && !form.markerId) {
      return null;
    }
    if (form.segmentId && !form.markerId) {
      return t("Please select a marker for the selected segment.");
    }
    if (!form.markerId) {
      return null;
    }
    const marker = markers.find((item) => item.id === form.markerId);
    if (!marker) {
      return t("Selected marker is not available.");
    }
    if (form.segmentId && marker.segmentId !== form.segmentId) {
      return t("Selected marker does not belong to the selected segment.");
    }
    return null;
  };

  const handleAddParticipant = () => {
    if (!participantId) {
      return;
    }
    if (values.participants.some((item) => item.characterId === participantId)) {
      return;
    }
    const character = characters.find((item) => item.id === participantId);
    setField("participants", [
      ...values.participants,
      {
        characterId: participantId,
        characterName: character?.name,
        role: "",
        participationType: "",
        outcome: "",
        statusChange: "",
        note: "",
      },
    ]);
    setParticipantId("");
  };

  const handleAddEditParticipant = () => {
    if (!editValues || !editParticipantId) {
      return;
    }
    if (editValues.participants.some((item) => item.characterId === editParticipantId)) {
      return;
    }
    const character = characters.find((item) => item.id === editParticipantId);
    setEditValues((prev) =>
      prev
        ? {
            ...prev,
            participants: [
              ...prev.participants,
              {
                characterId: editParticipantId,
                characterName: character?.name,
                role: "",
                participationType: "",
                outcome: "",
                statusChange: "",
                note: "",
              },
            ],
          }
        : prev
    );
    setEditParticipantId("");
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    const validation = validateEvent(payload);
    if (!validation.valid) {
      notify(
        `${t("Missing required fields:")} ${validation.missing.join(", ")}`,
        "error"
      );
      return;
    }
    const participantError = validateParticipants(values.participants);
    if (participantError) {
      notify(participantError, "error");
      return;
    }
    const markerError = validateMarkerSelection(values);
    if (markerError) {
      notify(markerError, "error");
      return;
    }
    try {
      await createEvent(payload);
      notify(t("Event created successfully."), "success");
      reset();
      setShowForm(false);
      setPage(1);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    }
  };

  const handleEditOpen = (item: Event) => {
    setEditItem(item);
    setEditValues(mapEventToForm(item));
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
    const participantError = validateParticipants(editValues.participants);
    if (participantError) {
      notify(participantError, "error");
      return;
    }
    const markerError = validateMarkerSelection(editValues);
    if (markerError) {
      notify(markerError, "error");
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateEvent(editItem.id, {
        name: editValues.name,
        type: editValues.type || undefined,
        typeDetail: editValues.typeDetail || undefined,
        scope: editValues.scope || undefined,
        locationId: editValues.locationId || undefined,
        markerId: editValues.markerId || undefined,
        segmentId: editValues.segmentId || undefined,
        summary: editValues.summary || undefined,
        description: editValues.description || undefined,
        participants: editValues.participants.map((participant) => ({
          characterId: participant.characterId,
          role: participant.role,
          participationType: participant.participationType as EventParticipant["participationType"],
          outcome: participant.outcome || undefined,
          statusChange: participant.statusChange || undefined,
          note: participant.note || undefined,
        })),
        notes: editValues.notes || undefined,
        tags: editValues.tags,
      });
      notify(t("Event updated successfully."), "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (item: Event) => {
    const confirmed = window.confirm(
      t("Delete this event? This action cannot be undone.")
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteEvent(item.id);
      notify(t("Event deleted."), "success");
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
      <CrudPageShell
        title="Event nodes"
        subtitle="Click a row to inspect details."
        showForm={showForm}
        createLabel="Create new event"
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
                label="Type"
                value={filters.type}
                onChange={(value) => handleFilterChange("type", value)}
              />
              <Select
                label="Segment"
                value={filters.segmentId}
                onChange={(value) => {
                  handleFilterChange("segmentId", value);
                  if (!value) {
                    handleFilterChange("markerId", "");
                  } else if (
                    filters.markerId &&
                    !markers.some(
                      (marker) =>
                        marker.id === filters.markerId && marker.segmentId === value
                    )
                  ) {
                    handleFilterChange("markerId", "");
                  }
                }}
                options={segments.map((segment) => ({
                  value: segment.id,
                  label: segment.name,
                }))}
                placeholder="All"
              />
              <Select
                label="Marker"
                value={filters.markerId}
                onChange={(value) => handleFilterChange("markerId", value)}
                options={markerOptions(filters.segmentId)}
                placeholder="All"
              />
              <Select
                label="Location"
                value={filters.locationId}
                onChange={(value) => handleFilterChange("locationId", value)}
                options={locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
                placeholder="All"
              />
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
              <div className="form-field filter-actions">
                <Button type="button" variant="ghost" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              </div>
            </FilterPanel>
            <ListPanel open={showList} onToggle={() => setShowList((prev) => !prev)} />
          </>
        }
        list={
          showList ? (
            <>
              <EventList items={items} onEdit={handleEditOpen} onDelete={handleDelete} />
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

      {editItem && editValues && (
        <>
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="section-title">{t("Edit event")}</h3>
                <p className="header__subtitle">{editItem.name}</p>
              </div>
              <Button variant="ghost" onClick={handleEditCancel}>
                {t("Cancel")}
              </Button>
            </div>
          </div>

          <FormSection title="Event Identity" description="Core timeline attributes.">
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
                label="Type"
                value={editValues.type}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev ? { ...prev, type: value, typeDetail: "" } : prev
                  )
                }
                options={TYPE_OPTIONS}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type Detail"
                value={editValues.typeDetail}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, typeDetail: value })
                }
                options={TYPE_DETAIL_OPTIONS[editValues.type] ?? []}
                disabled={!editValues.type}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Scope"
                value={editValues.scope}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, scope: value })
                }
                options={SCOPE_OPTIONS}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Location"
                value={editValues.locationId}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, locationId: value })
                }
                options={locations.map((location) => ({
                  label: location.name,
                  value: location.id,
                }))}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Segment"
                value={editValues.segmentId}
                onChange={(value) =>
                  setEditValues((prev) =>
                    prev
                      ? {
                          ...prev,
                          segmentId: value,
                          markerId: value
                            ? prev.markerId &&
                              markers.some(
                                (marker) =>
                                  marker.id === prev.markerId && marker.segmentId === value
                              )
                              ? prev.markerId
                              : ""
                            : "",
                        }
                      : prev
                  )
                }
                options={segments.map((segment) => ({
                  label: segment.name,
                  value: segment.id ?? "",
                }))}
                placeholder="Select segment"
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Marker"
                value={editValues.markerId}
                onChange={(value) =>
                  setEditValues((prev) => (prev ? { ...prev, markerId: value } : prev))
                }
                options={markerOptions(editValues.segmentId)}
                placeholder="Select marker"
              />
            </div>
            <div className="form-field--wide">
              <label>{t("Participants")}</label>
              <div className="participant-picker">
                <select
                  className="select"
                  value={editParticipantId}
                  onChange={(event) => setEditParticipantId(event.target.value)}
                >
                  <option value="">{t("Select character")}</option>
                  {characters
                    .filter(
                      (character) =>
                        !editValues.participants.some(
                          (item) => item.characterId === character.id
                        )
                    )
                    .map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddEditParticipant}
                  disabled={!editParticipantId}
                >
                  {t("Add")}
                </Button>
              </div>
              {editValues.participants.length === 0 ? (
                <span className="header__subtitle">{t("No participants selected.")}</span>
              ) : (
                <div className="participant-list">
                  {editValues.participants.map((participant, index) => (
                    <div key={participant.characterId} className="participant-card">
                      <div className="participant-card__header">
                        <strong>
                          {participant.characterName ??
                            characters.find(
                              (character) => character.id === participant.characterId
                            )?.name ??
                            participant.characterId}
                        </strong>
                        <button
                          type="button"
                          className="table__action table__action--ghost"
                          onClick={() =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.filter(
                                      (_, itemIndex) => itemIndex !== index
                                    ),
                                  }
                                : prev
                            )
                          }
                        >
                          {t("Remove")}
                        </button>
                      </div>
                      <div className="participant-grid">
                        <Select
                          label="Role"
                          value={participant.role}
                          onChange={(value) =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.map((item, idx) =>
                                      idx === index ? { ...item, role: value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          options={PARTICIPANT_ROLE_OPTIONS}
                          required
                        />
                        <Select
                          label="Participation Type"
                          value={participant.participationType}
                          onChange={(value) =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.map((item, idx) =>
                                      idx === index
                                        ? { ...item, participationType: value }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          options={PARTICIPATION_TYPE_OPTIONS}
                          required
                        />
                        <Select
                          label="Outcome"
                          value={participant.outcome ?? ""}
                          onChange={(value) =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.map((item, idx) =>
                                      idx === index ? { ...item, outcome: value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                          options={PARTICIPANT_OUTCOME_OPTIONS}
                        />
                        <TextInput
                          label="Status Change"
                          value={participant.statusChange ?? ""}
                          onChange={(value) =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.map((item, idx) =>
                                      idx === index
                                        ? { ...item, statusChange: value }
                                        : item
                                    ),
                                  }
                                : prev
                            )
                          }
                        />
                        <TextArea
                          label="Note"
                          value={participant.note ?? ""}
                          onChange={(value) =>
                            setEditValues((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    participants: prev.participants.map((item, idx) =>
                                      idx === index ? { ...item, note: value } : item
                                    ),
                                  }
                                : prev
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Narrative" description="Describe the event.">
            <div className="form-field--wide">
              <TextArea
                label="Summary"
                value={editValues.summary}
                onChange={(value) =>
                  setEditValues((prev) => prev && { ...prev, summary: value })
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
          <FormSection title="Event Identity" description="Core timeline attributes.">
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
                label="Type"
                value={values.type}
                onChange={(value) => {
                  setField("type", value);
                  setField("typeDetail", "");
                }}
                options={TYPE_OPTIONS}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Type Detail"
                value={values.typeDetail}
                onChange={(value) => setField("typeDetail", value)}
                options={TYPE_DETAIL_OPTIONS[values.type] ?? []}
                disabled={!values.type}
              />
            </div>
            <div className="form-field--narrow">
              <Select
                label="Scope"
                value={values.scope}
                onChange={(value) => setField("scope", value)}
                options={SCOPE_OPTIONS}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Location"
                value={values.locationId}
                onChange={(value) => setField("locationId", value)}
                options={locations.map((location) => ({
                  label: location.name,
                  value: location.id,
                }))}
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Segment"
                value={values.segmentId}
                onChange={(value) => {
                  setField("segmentId", value);
                  if (
                    !value ||
                    !markers.some(
                      (marker) => marker.id === values.markerId && marker.segmentId === value
                    )
                  ) {
                    setField("markerId", "");
                  }
                }}
                options={segments.map((segment) => ({
                  label: segment.name,
                  value: segment.id ?? "",
                }))}
                placeholder="Select segment"
              />
            </div>
            <div className="form-field--wide">
              <Select
                label="Marker"
                value={values.markerId}
                onChange={(value) => setField("markerId", value)}
                options={markerOptions(values.segmentId)}
                placeholder="Select marker"
              />
            </div>
            <div className="form-field--wide">
              <label>{t("Participants")}</label>
              <div className="participant-picker">
                <select
                  className="select"
                  value={participantId}
                  onChange={(event) => setParticipantId(event.target.value)}
                >
                  <option value="">{t("Select character")}</option>
                  {characters
                    .filter(
                      (character) =>
                        !values.participants.some(
                          (item) => item.characterId === character.id
                        )
                    )
                    .map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddParticipant}
                  disabled={!participantId}
                >
                  {t("Add")}
                </Button>
              </div>
              {values.participants.length === 0 ? (
                <span className="header__subtitle">{t("No participants selected.")}</span>
              ) : (
                <div className="participant-list">
                  {values.participants.map((participant, index) => (
                    <div key={participant.characterId} className="participant-card">
                      <div className="participant-card__header">
                        <strong>
                          {participant.characterName ??
                            characters.find(
                              (character) => character.id === participant.characterId
                            )?.name ??
                            participant.characterId}
                        </strong>
                        <button
                          type="button"
                          className="table__action table__action--ghost"
                          onClick={() =>
                            setField(
                              "participants",
                              values.participants.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            )
                          }
                        >
                          {t("Remove")}
                        </button>
                      </div>
                      <div className="participant-grid">
                        <Select
                          label="Role"
                          value={participant.role}
                          onChange={(value) =>
                            setField(
                              "participants",
                              values.participants.map((item, idx) =>
                                idx === index ? { ...item, role: value } : item
                              )
                            )
                          }
                          options={PARTICIPANT_ROLE_OPTIONS}
                          required
                        />
                        <Select
                          label="Participation Type"
                          value={participant.participationType}
                          onChange={(value) =>
                            setField(
                              "participants",
                              values.participants.map((item, idx) =>
                                idx === index
                                  ? { ...item, participationType: value }
                                  : item
                              )
                            )
                          }
                          options={PARTICIPATION_TYPE_OPTIONS}
                          required
                        />
                        <Select
                          label="Outcome"
                          value={participant.outcome ?? ""}
                          onChange={(value) =>
                            setField(
                              "participants",
                              values.participants.map((item, idx) =>
                                idx === index ? { ...item, outcome: value } : item
                              )
                            )
                          }
                          options={PARTICIPANT_OUTCOME_OPTIONS}
                        />
                        <TextInput
                          label="Status Change"
                          value={participant.statusChange ?? ""}
                          onChange={(value) =>
                            setField(
                              "participants",
                              values.participants.map((item, idx) =>
                                idx === index
                                  ? { ...item, statusChange: value }
                                  : item
                              )
                            )
                          }
                        />
                        <TextArea
                          label="Note"
                          value={participant.note ?? ""}
                          onChange={(value) =>
                            setField(
                              "participants",
                              values.participants.map((item, idx) =>
                                idx === index ? { ...item, note: value } : item
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Narrative" description="Describe the event.">
            <div className="form-field--wide">
              <TextArea
                label="Summary"
                value={values.summary}
                onChange={(value) => setField("summary", value)}
              />
            </div>
            <div className="form-field--wide">
              <TextArea
                label="Description"
                value={values.description}
                onChange={(value) => setField("description", value)}
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
              {t("Create event")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
