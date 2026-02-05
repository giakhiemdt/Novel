import {
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Event } from "../event/event.types";
import type { Timeline } from "./timeline.types";

type TimelineBoardProps = {
  items: Timeline[];
  events?: Event[];
  selectedId?: string;
  onSelect: (item: Timeline | null) => void;
  links: Record<string, { previousId?: string }>;
  onLink: (currentId: string, previousId: string) => void;
  onUnlink: (currentId: string, previousId: string) => void;
  onRelink: (currentId: string, previousId: string) => void;
  onDelete?: (item: Timeline) => void;
};

type Position = { x: number; y: number };
type SnapTarget = { targetId: string; mode: "previous" | "next" };

const MIN_WIDTH = 140;
const BAR_HEIGHT = 34;
const SNAP_DISTANCE = 12;
const ROW_GAP = 18;
const COL_GAP = 22;
const EVENT_ROW_GAP = 16;
const EVENT_OFFSET_Y = 22;
const EVENT_DOT = 8;
const PALETTE = [
  "#3d8fa6",
  "#c28a35",
  "#4f8f6a",
  "#4b85b9",
  "#6c7bb2",
  "#7c9b4f",
  "#a86b4d",
  "#3f9aa2",
  "#8aa06e",
  "#a28c57",
];

const hashString = (value: string) =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const TimelineBoard = ({
  items,
  events = [],
  selectedId,
  onSelect,
  links,
  onLink,
  onUnlink,
  onRelink,
  onDelete,
}: TimelineBoardProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);
  const [dragChain, setDragChain] = useState<string[] | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const panRef = useRef<Position>({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const splitRef = useRef(false);
  const itemsWithId = useMemo(
    () => items.filter((item): item is Timeline & { id: string } => Boolean(item.id)),
    [items]
  );

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const durations = useMemo(() => {
    const values = itemsWithId.map((item) => Math.max(1, item.durationYears || 1));
    const max = Math.max(...values, 1);
    return { max };
  }, [itemsWithId]);

  const startYears = useMemo(() => {
    const byId = new Map(itemsWithId.map((item) => [item.id, item]));
    const prevMap: Record<string, string | undefined> = {};
    itemsWithId.forEach((item) => {
      const prevId = links[item.id]?.previousId ?? item.previousId;
      if (prevId) {
        prevMap[item.id] = prevId;
      }
    });
    const cache: Record<string, number> = {};
    const visiting = new Set<string>();

    const getStart = (id: string): number => {
      if (cache[id] !== undefined) {
        return cache[id];
      }
      if (visiting.has(id)) {
        return 0;
      }
      visiting.add(id);
      const prevId = prevMap[id];
      const prevItem = prevId ? byId.get(prevId) : undefined;
      if (!prevId || !prevItem) {
        cache[id] = 0;
        visiting.delete(id);
        return 0;
      }
      const prevStart = getStart(prevId);
      const prevDuration = Math.max(0, prevItem.durationYears ?? 0);
      const value = prevStart + prevDuration;
      cache[id] = value;
      visiting.delete(id);
      return value;
    };

    itemsWithId.forEach((item) => {
      cache[item.id] = getStart(item.id);
    });

    return cache;
  }, [itemsWithId, links]);

  const { prevById, nextById, adjacency } = useMemo(() => {
    const prevMap: Record<string, string | undefined> = {};
    const nextMap: Record<string, string> = {};
    const adj: Record<string, Set<string>> = {};
    const addAdj = (a: string, b: string) => {
      if (!a || !b) {
        return;
      }
      if (!adj[a]) {
        adj[a] = new Set();
      }
      if (!adj[b]) {
        adj[b] = new Set();
      }
      adj[a]!.add(b);
      adj[b]!.add(a);
    };

    itemsWithId.forEach((item) => {
      const hasLinkOverride = Object.prototype.hasOwnProperty.call(links, item.id);
      const prevId = hasLinkOverride ? links[item.id]?.previousId : item.previousId;
      if (prevId) {
        prevMap[item.id] = prevId;
      }
    });

    Object.entries(prevMap).forEach(([currentId, prevId]) => {
      if (!prevId) {
        return;
      }
      if (!nextMap[prevId]) {
        nextMap[prevId] = currentId;
      }
      addAdj(prevId, currentId);
    });

    return { prevById: prevMap, nextById: nextMap, adjacency: adj };
  }, [itemsWithId, links]);

  const getChainIds = (startId: string): string[] => {
    const visited = new Set<string>();
    const queue: string[] = [startId];
    while (queue.length) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      const neighbors = adjacency[current];
      if (neighbors) {
        neighbors.forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        });
      }
    }
    return Array.from(visited);
  };

  const getOrderedChain = (startId: string): string[] => {
    let head = startId;
    const seen = new Set<string>();
    while (prevById[head] && !seen.has(prevById[head]!)) {
      seen.add(head);
      head = prevById[head]!;
    }
    const ordered: string[] = [];
    let current: string | undefined = head;
    while (current && !ordered.includes(current)) {
      ordered.push(current);
      current = nextById[current];
    }
    return ordered.length ? ordered : [startId];
  };

  const getWidth = (item: Timeline) => {
    if (!boardWidth) {
      return MIN_WIDTH;
    }
    const duration = Math.max(1, item.durationYears || 1);
    const ratio = duration / durations.max;
    const available = Math.max(boardWidth - 2 * COL_GAP, MIN_WIDTH);
    return Math.max(MIN_WIDTH, Math.round(available * (0.25 + ratio * 0.65)));
  };

  useEffect(() => {
    if (!boardRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBoardWidth(entry.contentRect.width);
      }
    });

    observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      const columns =
        boardWidth > 0 ? Math.max(1, Math.floor(boardWidth / 260)) : 3;
      const itemsById = new Map(itemsWithId.map((item) => [item.id, item]));
      let index = 0;

      const placeRoot = (item: Timeline & { id: string }) => {
        if (next[item.id]) {
          return;
        }
        const col = index % columns;
        const row = Math.floor(index / columns);
        next[item.id] = {
          x: COL_GAP + col * 220,
          y: COL_GAP + row * (BAR_HEIGHT + ROW_GAP),
        };
        index += 1;
      };

      itemsWithId.forEach((item) => {
        const prevId = links[item.id]?.previousId;
        if (!prevId || !itemsById.has(prevId)) {
          placeRoot(item);
        }
      });

      for (let pass = 0; pass < itemsWithId.length; pass += 1) {
        let changed = false;
        itemsWithId.forEach((item) => {
          if (next[item.id]) {
            return;
          }
          const prevId = links[item.id]?.previousId;
          if (!prevId) {
            return;
          }
          const prevPos = next[prevId];
          const prevItem = itemsById.get(prevId);
          if (!prevPos || !prevItem) {
            return;
          }
          const prevWidth = getWidth(prevItem);
          next[item.id] = { x: prevPos.x + prevWidth, y: prevPos.y };
          changed = true;
        });
        if (!changed) {
          break;
        }
      }

      itemsWithId.forEach((item) => {
        if (!next[item.id]) {
          placeRoot(item);
        }
      });

      return next;
    });
  }, [itemsWithId, boardWidth, links]);

  useEffect(() => {
    if (!itemsWithId.length || draggingId) {
      return;
    }
    setPositions((prev) => {
      const next = { ...prev };
      const itemsById = new Map(itemsWithId.map((item) => [item.id, item]));
      itemsWithId.forEach((item) => {
        const prevId = prevById[item.id];
        if (!prevId) {
          return;
        }
        const prevPos = next[prevId];
        const prevItem = itemsById.get(prevId);
        if (!prevPos || !prevItem) {
          return;
        }
        const prevWidth = getWidth(prevItem);
        const currentPos = next[item.id] ?? prevPos;
        next[item.id] = { x: prevPos.x + prevWidth, y: currentPos.y };
      });
      return next;
    });
  }, [itemsWithId, prevById, boardWidth, draggingId]);

  const clampPosition = (_id: string, x: number, y: number) => ({
    x,
    y,
  });

  const toBoardCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const rawX = clientX - (rect?.left ?? 0);
    const rawY = clientY - (rect?.top ?? 0);
    return {
      x: (rawX - pan.x) / scale,
      y: (rawY - pan.y) / scale,
    };
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    item: Timeline
  ) => {
    if (!item.id) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = positions[item.id] ?? { x: 0, y: 0 };
    const { x: pointerX, y: pointerY } = toBoardCoords(
      event.clientX,
      event.clientY
    );
    setDragOffset({ x: pointerX - position.x, y: pointerY - position.y });
    setDragStart({ x: pointerX, y: pointerY });
    setHasDragged(false);
    setDraggingId(item.id);
    splitRef.current = event.shiftKey;
    if (!event.shiftKey) {
      const chain = getChainIds(item.id);
      const hasLink = Boolean(prevById[item.id] || nextById[item.id]);
      setDragChain(hasLink && chain.length > 1 ? chain : null);
    } else {
      setDragChain(null);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isPanning && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const nextX = event.clientX - rect.left - panStart.x;
      const nextY = event.clientY - rect.top - panStart.y;
      panRef.current = { x: nextX, y: nextY };
      setPan({ x: nextX, y: nextY });
      return;
    }
    if (!draggingId || !boardRef.current) {
      return;
    }
    const { x: pointerX, y: pointerY } = toBoardCoords(
      event.clientX,
      event.clientY
    );
    if (!hasDragged) {
      const deltaX = Math.abs(pointerX - dragStart.x);
      const deltaY = Math.abs(pointerY - dragStart.y);
      if (deltaX > 3 || deltaY > 3) {
        setHasDragged(true);
      }
    }
    const rawX = pointerX - dragOffset.x;
    const rawY = pointerY - dragOffset.y;
    const base = clampPosition(draggingId, rawX, rawY);

    let bestDistance = Number.POSITIVE_INFINITY;
    let nextX = base.x;
    let nextY = base.y;
    let target: SnapTarget | null = null;
    const currentItem = itemsWithId.find((item) => item.id === draggingId);
    const currentWidth = currentItem ? getWidth(currentItem) : MIN_WIDTH;

    itemsWithId.forEach((item) => {
      if (item.id === draggingId) {
        return;
      }
      const targetPos = positions[item.id];
      if (!targetPos) {
        return;
      }
      const targetWidth = getWidth(item);
      const targetEnd = targetPos.x + targetWidth;
      const sameRow = Math.abs(base.y - targetPos.y) <= BAR_HEIGHT;
      if (!sameRow) {
        return;
      }

      const distanceToPrev = Math.abs(base.x - targetEnd);
      if (distanceToPrev <= SNAP_DISTANCE && distanceToPrev < bestDistance) {
        bestDistance = distanceToPrev;
        nextX = targetEnd;
        nextY = targetPos.y;
        target = { targetId: item.id, mode: "previous" };
      }

      const distanceToNext = Math.abs(base.x + currentWidth - targetPos.x);
      if (distanceToNext <= SNAP_DISTANCE && distanceToNext < bestDistance) {
        bestDistance = distanceToNext;
        nextX = targetPos.x - currentWidth;
        nextY = targetPos.y;
        target = { targetId: item.id, mode: "next" };
      }
    });

    const chain =
      !splitRef.current &&
      draggingId &&
      (prevById[draggingId] || nextById[draggingId])
        ? getChainIds(draggingId)
        : null;
    if (chain && chain.length > 1) {
      setSnapTarget(target);
      setPositions((prev) => {
        const anchorId = draggingId;
        const anchorPrev = prev[anchorId] ?? { x: 0, y: 0 };
        const deltaX = nextX - anchorPrev.x;
        const deltaY = nextY - anchorPrev.y;
        const next = { ...prev };
        chain.forEach((id) => {
          const currentPos = prev[id] ?? { x: 0, y: 0 };
          next[id] = { x: currentPos.x + deltaX, y: currentPos.y + deltaY };
        });
        return next;
      });
      return;
    }

    if (dragChain && dragChain.length > 1 && snapTarget) {
      setSnapTarget(null);
      setPositions((prev) => {
        const anchorId = draggingId;
        const anchorPrev = prev[anchorId] ?? { x: 0, y: 0 };
        const deltaX = nextX - anchorPrev.x;
        const deltaY = nextY - anchorPrev.y;
        const next = { ...prev };
        dragChain.forEach((id) => {
          const currentPos = prev[id] ?? { x: 0, y: 0 };
          next[id] = { x: currentPos.x + deltaX, y: currentPos.y + deltaY };
        });
        return next;
      });
      return;
    }

    setSnapTarget(target);
    setPositions((prev) => ({
      ...prev,
      [draggingId]: { x: nextX, y: nextY },
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (!draggingId) {
      return;
    }
    try {
      if (event.pointerId) {
        const target = event.target as HTMLElement;
        target.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // ignore pointer capture release issues
    }

    const currentId = draggingId;
    const previousId = prevById[currentId];
    const nextId = nextById[currentId];
    const shiftSplit = splitRef.current;

    const releaseChain =
      prevById[currentId] || nextById[currentId] ? getChainIds(currentId) : null;
    if (hasDragged && releaseChain && releaseChain.length > 1 && !shiftSplit) {
      setDraggingId(null);
      setSnapTarget(null);
      setHasDragged(false);
      setDragChain(null);
      return;
    }
    if (hasDragged && snapTarget && !shiftSplit) {
      const chain = getOrderedChain(currentId);
      const chainHead = chain[0];
      const chainTail = chain[chain.length - 1];
      if (snapTarget.mode === "previous") {
        if (chainHead && snapTarget.targetId) {
          onLink(chainHead, snapTarget.targetId);
        }
      } else if (snapTarget.mode === "next") {
        if (chainTail && snapTarget.targetId) {
          onLink(snapTarget.targetId, chainTail);
        }
      }
    } else if (hasDragged && (!releaseChain || releaseChain.length <= 1)) {
      if (previousId) {
        onUnlink(currentId, previousId);
      }
      if (nextId) {
        onUnlink(nextId, currentId);
      }
    }

    if (hasDragged && shiftSplit) {
      if (previousId) {
        onUnlink(currentId, previousId);
      }
      if (nextId) {
        onUnlink(nextId, currentId);
      }
    }

    setDraggingId(null);
    setSnapTarget(null);
    setHasDragged(false);
    setDragChain(null);
    splitRef.current = false;
  };

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".timeline-bar")) {
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setIsPanning(true);
    setPanStart({
      x: event.clientX - rect.left - pan.x,
      y: event.clientY - rect.top - pan.y,
    });
    onSelect(null);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!boardRef.current) {
      return;
    }
    event.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const currentScale = scaleRef.current;
    const nextScale = Math.min(
      2.2,
      Math.max(0.5, currentScale - event.deltaY * 0.001)
    );
    if (nextScale === currentScale) {
      return;
    }
    const currentPan = panRef.current;
    const scaleRatio = nextScale / currentScale;
    const nextPanX = pointerX - (pointerX - currentPan.x) * scaleRatio;
    const nextPanY = pointerY - (pointerY - currentPan.y) * scaleRatio;
    scaleRef.current = nextScale;
    panRef.current = { x: nextPanX, y: nextPanY };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setScale(scaleRef.current);
        setPan(panRef.current);
        rafRef.current = null;
      });
    }
  };

  const selected = itemsWithId.find((item) => item.id === selectedId);
  const selectedPos = selected ? positions[selected.id] : null;
  const selectedWidth = selected ? getWidth(selected) : 0;
  const detailScale = Math.min(1.3, Math.max(0.7, 1 / scale));

  const eventPositions = useMemo(() => {
    if (!events.length) {
      return [];
    }
    const byTimeline = new Map<string, Event[]>();
    events.forEach((event) => {
      if (!event.timelineId || typeof event.timelineYear !== "number") {
        return;
      }
      if (!byTimeline.has(event.timelineId)) {
        byTimeline.set(event.timelineId, []);
      }
      byTimeline.get(event.timelineId)!.push(event);
    });

    const eventPins: Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      timelineId: string;
      year: number;
      type?: string;
      rise: number;
    }> = [];

    const timelineById = new Map(itemsWithId.map((item) => [item.id, item]));
    byTimeline.forEach((list, timelineId) => {
      const timeline = timelineById.get(timelineId);
      const timelinePos = positions[timelineId];
      if (!timeline || !timelinePos) {
        return;
      }
      const duration = Math.max(1, timeline.durationYears || 1);
      const width = getWidth(timeline);
      const baseX = timelinePos.x;
      const baseY = timelinePos.y + BAR_HEIGHT + EVENT_OFFSET_Y;

      const sorted = [...list].sort(
        (a, b) => (a.timelineYear ?? 0) - (b.timelineYear ?? 0)
      );
      const rows: number[] = [];
      sorted.forEach((event) => {
        const year = event.timelineYear ?? 0;
        const ratio = Math.min(1, Math.max(0, year / duration));
        const x = baseX + ratio * width;
        const labelWidth = Math.max(60, event.name.length * 7 + 36);
        let row = 0;
        while (
          rows[row] !== undefined &&
          Math.abs(rows[row] - x) < labelWidth
        ) {
          row += 1;
        }
        rows[row] = x;
        eventPins.push({
          id: event.id ?? `${timelineId}-${year}-${row}`,
          name: event.name,
          x,
          y: baseY + row * EVENT_ROW_GAP,
          timelineId,
          year,
          type: event.type,
          rise: baseY + row * EVENT_ROW_GAP - timelinePos.y,
        });
      });
    });

    return eventPins;
  }, [events, itemsWithId, positions, startYears, getWidth]);

  return (
    <div
      className="timeline-board"
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerDown={handleBoardPointerDown}
      onWheel={handleWheel}
    >
      <div
        className="timeline-board__canvas"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        }}
      >
        {itemsWithId.map((item) => {
          const position = positions[item.id] ?? { x: COL_GAP, y: COL_GAP };
          const width = getWidth(item);
          const isSelected = item.id === selectedId;
          const hasPrev = Boolean(links[item.id]?.previousId);
          const hasNext = Boolean(nextById[item.id]);
          const color = PALETTE[hashString(item.id) % PALETTE.length];
          const showStart = !hasPrev;
          const showEnd = true;
          const durationLabel = item.durationYears ?? 0;
          const startYear = startYears[item.id] ?? 0;
          const endYear = startYear + durationLabel;
          return (
            <button
              key={item.id}
              type="button"
              className={`timeline-bar${isSelected ? " timeline-bar--active" : ""}${
                hasPrev ? " timeline-bar--linked-prev" : ""
              }${hasNext ? " timeline-bar--linked-next" : ""}`}
              style={{
                width,
                transform: `translate(${position.x}px, ${position.y}px)`,
                ["--timeline-color" as string]: color,
              }}
              onClick={() => onSelect(item)}
              onPointerDown={(event) => handlePointerDown(event, item)}
            >
              <span className="timeline-bar__label">{item.name}</span>
              {showStart && (
                <span className="timeline-bar__time timeline-bar__time--start">
                  {startYear}
                </span>
              )}
              {showEnd && (
                <span className="timeline-bar__time timeline-bar__time--end">
                  {endYear}
                </span>
              )}
              <span className="timeline-bar__duration">{durationLabel}</span>
              <span
                className="timeline-bar__cap timeline-bar__cap--left"
                aria-hidden="true"
              />
              <span
                className="timeline-bar__cap timeline-bar__cap--right"
                aria-hidden="true"
              />
            </button>
          );
        })}
        {eventPositions.map((event) => (
          <div
            key={event.id}
            className="timeline-event"
            style={{
              transform: `translate(${event.x}px, ${event.y}px)`,
              ["--timeline-event-color" as string]:
                PALETTE[hashString(event.timelineId) % PALETTE.length],
              ["--timeline-event-year" as string]: `"${event.year}"`,
              ["--timeline-event-rise" as string]: `${event.rise}px`,
            }}
            title={event.name}
          >
            <span className="timeline-event__dot" />
            <span className="timeline-event__label">{event.name}</span>
          </div>
        ))}
        {selected && selectedPos && (
        <div
          className="timeline-card"
          style={{
            transform: `translate(${selectedPos.x + selectedWidth + 16}px, ${
              selectedPos.y - 8
            }px) scale(${detailScale})`,
            transformOrigin: "top left",
          }}
        >
          <strong>{selected.name}</strong>
          <p>{selected.summary ?? t("No summary yet.")}</p>
          <div className="timeline-card__meta">
            <span>{startYears[selected.id] ?? 0}</span>
            <span>→</span>
            <span>
              {(startYears[selected.id] ?? 0) + (selected.durationYears ?? 0)}
            </span>
          </div>
          {onDelete && (
            <div className="timeline-card__actions">
              <button
                type="button"
                className="table__action table__action--danger"
                onClick={() => onDelete(selected)}
              >
                {t("Delete")}
              </button>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};
