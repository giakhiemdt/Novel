import { useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Location } from "./location.types";

export type LocationListProps = {
  items: Location[];
  onSelect?: (item: Location) => void;
  onEdit?: (item: Location) => void;
  onDelete?: (item: Location) => void;
  onLink?: (parentId: string, childId: string) => void;
  onUnlink?: (childId: string) => void;
  onError?: (message: string) => void;
};

const TYPE_LEVELS: Record<string, number> = {
  "LEVEL 1 - STRUCTURE": 1,
  "LEVEL 2 - COMPLEX": 2,
  "LEVEL 3 - SETTLEMENT": 3,
  "LEVEL 4 - REGION": 4,
  "LEVEL 5 - TERRITORY": 5,
  "LEVEL 6 - WORLD SCALE": 6,
};

export const LocationList = ({
  items,
  onSelect,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  onError,
}: LocationListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Location | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const renderValue = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="header__subtitle">-</span>;
      }
      return (
        <div className="pill-list">
          {value.map((item) => (
            <span className="pill" key={item}>
              {item}
            </span>
          ))}
        </div>
      );
    }
    if (typeof value === "boolean") {
      return value ? t("Yes") : t("No");
    }
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const detailSections = (item: Location) => [
    {
      title: t("Location Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Alias"), value: item.alias, size: "wide" },
        { label: t("Type"), value: item.type ? t(item.type) : "-", size: "narrow" },
        {
          label: t("Type Detail"),
          value: item.typeDetail ? t(item.typeDetail) : "-",
          size: "narrow",
        },
        {
          label: t("Category"),
          value: item.category ? t(item.category) : "-",
          size: "narrow",
        },
        { label: t("Habitable"), value: item.isHabitable, size: "narrow" },
        { label: t("Secret"), value: item.isSecret, size: "narrow" },
        { label: t("Terrain"), value: item.terrain, size: "wide" },
        { label: t("Climate"), value: item.climate, size: "wide" },
        { label: t("Environment"), value: item.environment, size: "wide" },
      ],
    },
    {
      title: t("Environment"),
      fields: [
        { label: t("Natural Resources"), value: item.naturalResources, size: "wide" },
        { label: t("Power Density"), value: item.powerDensity, size: "narrow" },
        { label: t("Danger Level"), value: item.dangerLevel, size: "narrow" },
        { label: t("Anomalies"), value: item.anomalies, size: "wide" },
        { label: t("Restrictions"), value: item.restrictions, size: "wide" },
      ],
    },
    {
      title: t("History"),
      fields: [
        { label: t("Historical Summary"), value: item.historicalSummary, size: "wide" },
        { label: t("Legend"), value: item.legend, size: "wide" },
        { label: t("Ruins Origin"), value: item.ruinsOrigin, size: "wide" },
        { label: t("Current Status"), value: item.currentStatus, size: "wide" },
        { label: t("Controlled By"), value: item.controlledBy, size: "wide" },
        { label: t("Population Note"), value: item.populationNote, size: "wide" },
      ],
    },
    {
      title: t("Notes & Tags"),
      fields: [
        { label: t("Notes"), value: item.notes, size: "wide" },
        { label: t("Tags"), value: item.tags, size: "wide" },
      ],
    },
  ];

  const tree = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, { ...item, children: [] }]));
    const roots: (Location & { children: Location[] })[] = [];
    byId.forEach((item) => {
      if (item.parentId && byId.has(item.parentId)) {
        const parent = byId.get(item.parentId);
        parent?.children.push(item);
      } else {
        roots.push(item);
      }
    });
    return roots;
  }, [items]);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No locations yet.")}</p>;
  }

  const handleDrop = (parentId: string, childId: string) => {
    if (parentId === childId) {
      return;
    }
    const parent = items.find((item) => item.id === parentId);
    const child = items.find((item) => item.id === childId);
    if (!parent || !child) {
      return;
    }
    if (child.parentId === parentId) {
      return;
    }
    const parentLevel = parent.type ? TYPE_LEVELS[parent.type] : undefined;
    const childLevel = child.type ? TYPE_LEVELS[child.type] : undefined;
    if (!parentLevel || !childLevel) {
      onError?.(t("Type is required for both locations."));
      return;
    }
    if (parentLevel < childLevel) {
      onError?.(t("Parent type must be >= child type."));
      return;
    }
    onLink?.(parentId, childId);
  };

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (item: Location & { children?: Location[] }, depth = 0) => {
    const isDragOver = dragOverId === item.id;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isCollapsed = collapsed[item.id];
    return (
      <div key={item.id} className="tree-item">
        <div
          className={`tree-row${isDragOver ? " tree-row--drag-over" : ""}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", item.id);
            setDraggingId(item.id);
          }}
          onDragEnd={() => {
            setDraggingId(null);
            setDragOverId(null);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (draggingId) {
              setDragOverId(item.id);
            }
          }}
          onDragLeave={() => {
            if (dragOverId === item.id) {
              setDragOverId(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (draggingId) {
              handleDrop(item.id, draggingId);
            }
            setDragOverId(null);
          }}
          onClick={() => onSelect?.(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect?.(item);
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
                  toggleCollapse(item.id);
                }
              }}
              aria-label={t("Toggle children")}
              disabled={!hasChildren}
            >
              {hasChildren ? (isCollapsed ? "▸" : "▾") : "•"}
            </button>
            <strong>{item.name}</strong>
            <span className="tree-row__meta">
              {item.type ? t(item.type) : "-"}
            </span>
            <span className="tree-row__meta">
              {item.typeDetail ? t(item.typeDetail) : "-"}
            </span>
            <span className="tree-row__meta">{item.climate ?? "-"}</span>
            <span className="tree-row__meta">{item.terrain ?? "-"}</span>
          </div>
          <div className="table__actions tree-row__actions">
            <button
              type="button"
              className="table__action"
              onClick={(event) => {
                event.stopPropagation();
                setDetailItem(item);
              }}
            >
              {t("Detail")}
            </button>
            <button
              type="button"
              className="table__action table__action--ghost"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(item);
              }}
            >
              {t("Edit")}
            </button>
            <button
              type="button"
              className="table__action table__action--danger"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(item);
              }}
            >
              {t("Delete")}
            </button>
          </div>
        </div>
        {item.children && item.children.length > 0 && !isCollapsed && (
          <div className="tree-children">
            {item.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="tree-list"
        onDragOver={(event) => {
          if (draggingId) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (dragOverId) {
            return;
          }
          if (draggingId) {
            const child = items.find((item) => item.id === draggingId);
            if (!child?.parentId) {
              setDraggingId(null);
              setDragOverId(null);
              return;
            }
            onUnlink?.(draggingId);
            setDraggingId(null);
            setDragOverId(null);
          }
        }}
      >
        <div className="tree-header">
          <span>{t("Name")}</span>
          <span>{t("Type")}</span>
          <span>{t("Type Detail")}</span>
          <span>{t("Climate")}</span>
          <span>{t("Terrain")}</span>
          <span>{t("Actions")}</span>
        </div>
        {tree.map((item) => renderNode(item, 0))}
      </div>

      {detailItem && (
        <div className="modal__backdrop" onClick={() => setDetailItem(null)}>
          <div
            className="modal modal--details modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <div>
                <h3>{t("Location details")}</h3>
                <p className="modal__subtitle">{detailItem.name}</p>
              </div>
              <button
                className="modal__close"
                type="button"
                onClick={() => setDetailItem(null)}
                aria-label={t("Close modal")}
              >
                ✕
              </button>
            </div>
            <div className="modal__body detail-sections">
              {detailSections(detailItem).map((section) => (
                <section key={section.title} className="detail-section">
                  <h4 className="detail-section__title">{section.title}</h4>
                  <div className="detail-grid">
                    {section.fields.map((field) => (
                      <div
                        key={field.label}
                        className={[
                          "detail-item",
                          field.size === "wide" ? "detail-item--wide" : "",
                          field.size === "narrow" ? "detail-item--narrow" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="detail-item__label">{field.label}</span>
                        <div className="detail-item__value">
                          {renderValue(field.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
