import type { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";

type BoardViewportControlsProps = {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onReset: () => void;
  minimap?: ReactNode;
  minimapTitle?: string;
  className?: string;
  toolbarAlign?: "left" | "right";
};

export const BoardViewportControls = ({
  zoom,
  onZoomOut,
  onZoomIn,
  onFit,
  onReset,
  minimap,
  minimapTitle,
  className,
  toolbarAlign = "left",
}: BoardViewportControlsProps) => {
  const { t } = useI18n();

  return (
    <>
      <div
        className={`graph-board-toolbar graph-board-toolbar--${toolbarAlign}${className ? ` ${className}` : ""}`}
      >
        <button
          type="button"
          className="graph-board-tool"
          onClick={onZoomOut}
          title={t("Zoom out")}
        >
          -
        </button>
        <span className="graph-board-zoom">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="graph-board-tool"
          onClick={onZoomIn}
          title={t("Zoom in")}
        >
          +
        </button>
        <button
          type="button"
          className="graph-board-tool"
          onClick={onFit}
          title={t("Fit view")}
        >
          {t("Fit")}
        </button>
        <button
          type="button"
          className="graph-board-tool"
          onClick={onReset}
          title={t("Reset view")}
        >
          {t("Reset")}
        </button>
      </div>

      {minimap ? (
        <div className="graph-board-minimap">
          <span className="graph-board-minimap__title">
            {minimapTitle ?? t("Mini map")}
          </span>
          <div className="graph-board-minimap__content">{minimap}</div>
        </div>
      ) : null}
    </>
  );
};
