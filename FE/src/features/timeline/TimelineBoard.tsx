import {
  PointerEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Timeline } from "./timeline.types";

type TimelineBoardProps = {
  items: Timeline[];
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

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const durations = useMemo(() => {
    const values = items.map((item) => Math.max(1, item.durationYears || 1));
    const max = Math.max(...values, 1);
    return { max };
  }, [items]);

  const startYears = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    const prevMap: Record<string, string | undefined> = {};
    items.forEach((item) => {
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

    items.forEach((item) => {
      cache[item.id] = getStart(item.id);
    });

    return cache;
  }, [items, links]);

  const prevById = useMemo(() => {
    const prevMap: Record<string, string | undefined> = {};
    items.forEach((item) => {
      const hasLinkOverride = Object.prototype.hasOwnProperty.call(links, item.id);
      const prevId = hasLinkOverride ? links[item.id]?.previousId : item.previousId;
      if (prevId) {
        prevMap[item.id] = prevId;
      }
    });
    return prevMap;
  }, [items, links]);

  const nextById = useMemo(() => {
    const nextMap: Record<string, string> = {};
    items.forEach((item) => {
      const hasLinkOverride = Object.prototype.hasOwnProperty.call(links, item.id);
      const prevId = hasLinkOverride ? links[item.id]?.previousId : item.previousId;
      if (prevId) {
        nextMap[prevId] = item.id;
      }
    });
    return nextMap;
  }, [items, links]);

  const getChainIds = (startId: string): string[] => {
    const visited = new Set<string>();
    let head = startId;
    while (prevById[head] && !visited.has(prevById[head]!)) {
      visited.add(head);
      head = prevById[head]!;
    }
    const chain: string[] = [];
    let current: string | undefined = head;
    while (current && !visited.has(current)) {
      chain.push(current);
      visited.add(current);
      current = nextById[current];
    }
    return chain;
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
      const itemsById = new Map(items.map((item) => [item.id, item]));
      let index = 0;

      const placeRoot = (item: Timeline) => {
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

      items.forEach((item) => {
        const prevId = links[item.id]?.previousId;
        if (!prevId || !itemsById.has(prevId)) {
          placeRoot(item);
        }
      });

      for (let pass = 0; pass < items.length; pass += 1) {
        let changed = false;
        items.forEach((item) => {
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

      items.forEach((item) => {
        if (!next[item.id]) {
          placeRoot(item);
        }
      });

      return next;
    });
  }, [items, boardWidth, links]);

  useEffect(() => {
    if (!items.length || draggingId) {
      return;
    }
    setPositions((prev) => {
      const next = { ...prev };
      const itemsById = new Map(items.map((item) => [item.id, item]));
      items.forEach((item) => {
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
  }, [items, prevById, boardWidth, draggingId]);

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
    if (!event.altKey) {
      const chain = getChainIds(item.id);
      setDragChain(chain.length > 1 ? chain : null);
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
    const currentItem = items.find((item) => item.id === draggingId);
    const currentWidth = currentItem ? getWidth(currentItem) : MIN_WIDTH;

    items.forEach((item) => {
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

    setSnapTarget(target);
    setPositions((prev) => {
      if (dragChain && dragChain.length > 1) {
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
      }
      return {
        ...prev,
        [draggingId]: { x: nextX, y: nextY },
      };
    });
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
    const previousId = links[currentId]?.previousId;
    const nextId = nextById[currentId];

    if (hasDragged && snapTarget) {
      if (snapTarget.mode === "previous") {
        if (previousId && previousId !== snapTarget.targetId) {
          onRelink(currentId, snapTarget.targetId);
        } else if (!previousId) {
          onLink(currentId, snapTarget.targetId);
        }
      } else if (snapTarget.mode === "next") {
        const targetPrev = links[snapTarget.targetId]?.previousId;
        if (targetPrev && targetPrev !== currentId) {
          onRelink(snapTarget.targetId, currentId);
        } else if (!targetPrev) {
          onLink(snapTarget.targetId, currentId);
        }
      }
    } else if (hasDragged && !dragChain) {
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

  const selected = items.find((item) => item.id === selectedId);
  const selectedPos = selected ? positions[selected.id] : null;
  const selectedWidth = selected ? getWidth(selected) : 0;
  const detailScale = Math.min(1.3, Math.max(0.7, 1 / scale));

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
        {items.map((item) => {
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
