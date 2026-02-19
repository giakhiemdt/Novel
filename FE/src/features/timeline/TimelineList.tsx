import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { formatDateTime } from "../../utils/date";
import { traitValuesToLabels } from "../../utils/trait";
import type { Timeline } from "./timeline.types";

export type TimelineListProps = {
  items: Timeline[];
  selectedId?: string;
  onSelect?: (item: Timeline) => void;
  onEdit?: (item: Timeline) => void;
  onDelete?: (item: Timeline) => void;
};

export const TimelineList = ({
  items,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: TimelineListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Timeline | null>(null);
  if (items.length === 0) {
    return <p className="header__subtitle">{t("No timelines yet.")}</p>;
  }

  const renderValue = (value: unknown) => {
    if (Array.isArray(value)) {
      const labels: string[] =
        value.length > 0 && typeof value[0] === "object"
          ? traitValuesToLabels(value)
          : value.filter((item): item is string => typeof item === "string");
      if (labels.length === 0) {
        return <span className="header__subtitle">-</span>;
      }
      return (
        <div className="pill-list">
          {labels.map((item) => (
            <span className="pill" key={item}>
              {item}
            </span>
          ))}
        </div>
      );
    }
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const detailSections = (item: Timeline) => [
    {
      title: t("Timeline Setup"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Code"), value: item.code, size: "narrow" },
        { label: t("Duration (Years)"), value: item.durationYears, size: "narrow" },
        { label: t("Ongoing"), value: item.isOngoing ? t("Yes") : t("No"), size: "narrow" },
        { label: t("Created"), value: formatDateTime(item.createdAt), size: "narrow" },
        { label: t("Updated"), value: formatDateTime(item.updatedAt), size: "narrow" },
      ],
    },
    {
      title: t("Narrative"),
      fields: [
        { label: t("Summary"), value: item.summary, size: "wide" },
        { label: t("Description"), value: item.description, size: "wide" },
        { label: t("Notes"), value: item.notes, size: "wide" },
      ],
    },
    {
      title: t("Worldbuilding"),
      fields: [
        { label: t("Technology Level"), value: item.technologyLevel, size: "narrow" },
        { label: t("Power Environment"), value: item.powerEnvironment, size: "narrow" },
        { label: t("World State"), value: item.worldState, size: "narrow" },
        { label: t("Dominant Forces"), value: item.dominantForces, size: "wide" },
        { label: t("Major Changes"), value: item.majorChanges, size: "wide" },
        { label: t("Characteristics"), value: item.characteristics, size: "wide" },
        { label: t("Tags"), value: item.tags, size: "wide" },
      ],
    },
    {
      title: t("Linking"),
      fields: [
        { label: t("Previous Timeline ID"), value: item.previousId, size: "wide" },
        { label: t("Next Timeline ID"), value: item.nextId, size: "wide" },
      ],
    },
  ];

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Years")}</th>
            <th>{t("Duration")}</th>
            <th>{t("Created")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = Boolean(selectedId && item.id === selectedId);
            return (
              <tr
                key={item.id}
                className={`table__row ${isSelected ? "table__row--active" : ""}`}
                onClick={() => onSelect?.(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect?.(item);
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td>
                  <strong>{item.name}</strong>
                  <div className="header__subtitle">{item.id}</div>
                </td>
                <td>0 - {item.durationYears ?? 0}</td>
                <td>{item.durationYears ?? 0}</td>
                <td>{formatDateTime(item.createdAt)}</td>
                <td className="table__actions">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {detailItem && (
        <div className="modal__backdrop" onClick={() => setDetailItem(null)}>
          <div
            className="modal modal--details modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <div>
                <h3>{t("Timeline details")}</h3>
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
