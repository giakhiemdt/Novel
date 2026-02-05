import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Rank } from "./rank.types";

type RankBoardProps = {
  items: Rank[];
  links: Record<string, { previousId?: string; conditions?: string[] }>;
  selectedId?: string;
  onSelect?: (item: Rank | null) => void;
  onLink: (currentId: string, previousId: string) => void;
  onRelink: (currentId: string, previousId: string) => void;
  onUnlink: (currentId: string, previousId: string) => void;
};

type Position = { x: number; y: number };
type SnapTarget = { targetId: string; mode: "previous" | "next" };

const MIN_WIDTH = 160;
const BAR_HEIGHT = 34;
const ROW_GAP = 16;
const COL_GAP = 20;
const SNAP_DISTANCE = 12;

export const RankBoard = ({
  items,
  links,
  selectedId,
  onSelect,
  onLink,
  onRelink,
  onUnlink,
}: RankBoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);
  const splitRef = useRef(false);

  const itemsWithId = useMemo(
    () => items.filter((item): item is Rank & { id: string } => Boolean(item.id)),
    [items]
  );

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
      const hasOverride = Object.prototype.hasOwnProperty.call(links, item.id);
      const prevId = hasOverride ? links[item.id]?.previousId : item.previousId;
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

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      const columns = 3;
      let index = 0;
      const placeRoot = (item: Rank & { id: string }) => {
        if (next[item.id]) {
          return;
        }
        const col = index % columns;
        const row = Math.floor(index / columns);
        next[item.id] = {
          x: COL_GAP + col * (MIN_WIDTH + COL_GAP),
          y: COL_GAP + row * (BAR_HEIGHT + ROW_GAP),
        };
        index += 1;
      };

      itemsWithId.forEach((item) => {
        const prevId = prevById[item.id];
        if (!prevId) {
          placeRoot(item);
        }
      });

      for (let pass = 0; pass < itemsWithId.length; pass += 1) {
        let changed = false;
        itemsWithId.forEach((item) => {
          if (next[item.id]) {
            return;
          }
          const prevId = prevById[item.id];
          if (!prevId) {
            return;
          }
          const prevPos = next[prevId];
          if (!prevPos) {
            return;
          }
          next[item.id] = { x: prevPos.x + MIN_WIDTH, y: prevPos.y };
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
  }, [itemsWithId, prevById]);

  const toBoardCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    };
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    item: Rank & { id: string }
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
    splitRef.current = event.shiftKey;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
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

    let bestDistance = Number.POSITIVE_INFINITY;
    let nextX = rawX;
    let nextY = rawY;
    let target: SnapTarget | null = null;

    itemsWithId.forEach((item) => {
      if (item.id === draggingId) {
        return;
      }
      const targetPos = positions[item.id];
      if (!targetPos) {
        return;
      }
      const sameRow = Math.abs(rawY - targetPos.y) <= BAR_HEIGHT;
      if (!sameRow) {
        return;
      }
      const targetEnd = targetPos.x + MIN_WIDTH;
      const distanceToPrev = Math.abs(rawX - targetEnd);
      if (distanceToPrev <= SNAP_DISTANCE && distanceToPrev < bestDistance) {
        bestDistance = distanceToPrev;
        nextX = targetEnd;
        nextY = targetPos.y;
        target = { targetId: item.id, mode: "previous" };
      }
      const distanceToNext = Math.abs(rawX + MIN_WIDTH - targetPos.x);
      if (distanceToNext <= SNAP_DISTANCE && distanceToNext < bestDistance) {
        bestDistance = distanceToNext;
        nextX = targetPos.x - MIN_WIDTH;
        nextY = targetPos.y;
        target = { targetId: item.id, mode: "next" };
      }
    });

    const chain =
      !splitRef.current &&
      (prevById[draggingId] || nextById[draggingId])
        ? getChainIds(draggingId)
        : null;
    if (chain && chain.length > 1) {
      setSnapTarget(target);
      setPositions((prev) => {
        const anchorPrev = prev[draggingId] ?? { x: 0, y: 0 };
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

    setSnapTarget(target);
    setPositions((prev) => ({
      ...prev,
      [draggingId]: { x: nextX, y: nextY },
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingId) {
      return;
    }
    try {
      if (event.pointerId) {
        const target = event.target as HTMLElement;
        target.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // ignore
    }

    const currentId = draggingId;
    const previousId = prevById[currentId];
    const nextId = nextById[currentId];
    const shiftSplit = splitRef.current;

    if (hasDragged && snapTarget && !shiftSplit) {
      if (snapTarget.mode === "previous") {
        if (previousId && previousId !== snapTarget.targetId) {
          onRelink(currentId, snapTarget.targetId);
        } else if (!previousId) {
          onLink(currentId, snapTarget.targetId);
        }
      } else if (snapTarget.mode === "next") {
        const targetPrev = prevById[snapTarget.targetId];
        if (targetPrev && targetPrev !== currentId) {
          onRelink(snapTarget.targetId, currentId);
        } else if (!targetPrev) {
          onLink(snapTarget.targetId, currentId);
        }
      }
    } else if (hasDragged && shiftSplit) {
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
    splitRef.current = false;
  };

  return (
    <div
      className="rank-board"
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="rank-board__canvas">
        {itemsWithId.map((item) => {
          const position = positions[item.id] ?? { x: COL_GAP, y: COL_GAP };
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              className={`rank-bar${isSelected ? " rank-bar--active" : ""}`}
              style={{
                width: MIN_WIDTH,
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
              onClick={() => onSelect?.(item)}
              onPointerDown={(event) => handlePointerDown(event, item)}
            >
              <span className="rank-bar__label">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
