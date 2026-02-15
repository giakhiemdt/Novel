import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export type BoardPoint = { x: number; y: number };
export type BoardRect = { x: number; y: number; width: number; height: number };

type UseBoardViewportOptions = {
  boardRef: RefObject<HTMLElement | null>;
  minScale?: number;
  maxScale?: number;
  defaultPan?: BoardPoint;
  wheelZoomFactor?: number;
  consumeWheel?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useBoardViewport = ({
  boardRef,
  minScale = 0.5,
  maxScale = 2.4,
  defaultPan = { x: 0, y: 0 },
  wheelZoomFactor = 0.001,
  consumeWheel = true,
}: UseBoardViewportOptions) => {
  const [scale, setScaleState] = useState(1);
  const [pan, setPanState] = useState<BoardPoint>(defaultPan);
  const [isPanning, setIsPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const scaleRef = useRef(1);
  const panRef = useRef<BoardPoint>(defaultPan);
  const panStartRef = useRef<BoardPoint>({ x: 0, y: 0 });

  const setScale = useCallback(
    (next: number | ((prev: number) => number)) => {
      const current = scaleRef.current;
      const resolved = typeof next === "function" ? next(current) : next;
      const clamped = clamp(resolved, minScale, maxScale);
      if (clamped === current) {
        return;
      }
      scaleRef.current = clamped;
      setScaleState(clamped);
    },
    [maxScale, minScale]
  );

  const setPan = useCallback((next: BoardPoint | ((prev: BoardPoint) => BoardPoint)) => {
    const current = panRef.current;
    const resolved = typeof next === "function" ? next(current) : next;
    panRef.current = resolved;
    setPanState(resolved);
  }, []);

  const toWorldCoords = useCallback(
    (clientX: number, clientY: number): BoardPoint => {
      const rect = boardRef.current?.getBoundingClientRect();
      const rawX = clientX - (rect?.left ?? 0);
      const rawY = clientY - (rect?.top ?? 0);
      const currentScale = scaleRef.current;
      const currentPan = panRef.current;
      return {
        x: (rawX - currentPan.x) / currentScale,
        y: (rawY - currentPan.y) / currentScale,
      };
    },
    [boardRef]
  );

  const zoomAtPointer = useCallback(
    (nextScale: number, pointerX: number, pointerY: number) => {
      const currentScale = scaleRef.current;
      const clamped = clamp(nextScale, minScale, maxScale);
      if (clamped === currentScale) {
        return;
      }
      const ratio = clamped / currentScale;
      const currentPan = panRef.current;
      const nextPan = {
        x: pointerX - (pointerX - currentPan.x) * ratio,
        y: pointerY - (pointerY - currentPan.y) * ratio,
      };

      scaleRef.current = clamped;
      panRef.current = nextPan;
      setScaleState(clamped);
      setPanState(nextPan);
    },
    [maxScale, minScale]
  );

  const zoomBy = useCallback(
    (delta: number, clientX?: number, clientY?: number) => {
      const node = boardRef.current;
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      const pointerX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
      const pointerY = clientY !== undefined ? clientY - rect.top : rect.height / 2;
      zoomAtPointer(scaleRef.current + delta, pointerX, pointerY);
    },
    [boardRef, zoomAtPointer]
  );

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const currentPan = panRef.current;
      panStartRef.current = {
        x: clientX - rect.left - currentPan.x,
        y: clientY - rect.top - currentPan.y,
      };
      setIsPanning(true);
    },
    [boardRef]
  );

  const movePan = useCallback(
    (clientX: number, clientY: number): boolean => {
      if (!isPanning) {
        return false;
      }
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) {
        return false;
      }
      const nextPan = {
        x: clientX - rect.left - panStartRef.current.x,
        y: clientY - rect.top - panStartRef.current.y,
      };
      panRef.current = nextPan;
      setPanState(nextPan);
      return true;
    },
    [boardRef, isPanning]
  );

  const stopPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    scaleRef.current = 1;
    panRef.current = defaultPan;
    setScaleState(1);
    setPanState(defaultPan);
  }, [defaultPan]);

  const centerOnWorldPoint = useCallback(
    (worldX: number, worldY: number) => {
      const node = boardRef.current;
      if (!node) {
        return;
      }
      const currentScale = scaleRef.current;
      const nextPan = {
        x: node.clientWidth / 2 - worldX * currentScale,
        y: node.clientHeight / 2 - worldY * currentScale,
      };
      panRef.current = nextPan;
      setPanState(nextPan);
    },
    [boardRef]
  );

  const fitToRect = useCallback(
    (rect: BoardRect, padding = 28) => {
      const node = boardRef.current;
      if (!node || rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const targetScale = clamp(
        Math.min(
          (node.clientWidth - padding * 2) / rect.width,
          (node.clientHeight - padding * 2) / rect.height
        ),
        minScale,
        maxScale
      );
      const nextPan = {
        x: (node.clientWidth - rect.width * targetScale) / 2 - rect.x * targetScale,
        y: (node.clientHeight - rect.height * targetScale) / 2 - rect.y * targetScale,
      };

      scaleRef.current = targetScale;
      panRef.current = nextPan;
      setScaleState(targetScale);
      setPanState(nextPan);
    },
    [boardRef, maxScale, minScale]
  );

  useEffect(() => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const updateSize = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [boardRef]);

  useEffect(() => {
    if (!consumeWheel) {
      return;
    }
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = node.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      zoomAtPointer(scaleRef.current - event.deltaY * wheelZoomFactor, pointerX, pointerY);
    };

    node.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      node.removeEventListener("wheel", handleWheel, true);
    };
  }, [boardRef, consumeWheel, wheelZoomFactor, zoomAtPointer]);

  return {
    scale,
    pan,
    isPanning,
    viewportSize,
    setScale,
    setPan,
    zoomBy,
    startPan,
    movePan,
    stopPan,
    resetView,
    fitToRect,
    centerOnWorldPoint,
    toWorldCoords,
  };
};
