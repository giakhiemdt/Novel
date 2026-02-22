import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Event } from "./event.types";

export type EventListProps = {
  items: Event[];
  onSelect?: (item: Event) => void;
  onEdit?: (item: Event) => void;
  onDelete?: (item: Event) => void;
};

export const EventList = ({ items, onSelect, onEdit, onDelete }: EventListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Event | null>(null);
  if (items.length === 0) {
    return <p className="header__subtitle">{t("No events yet.")}</p>;
  }

  const renderValue = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="header__subtitle">-</span>;
      }
      if (typeof value[0] === "object" && value[0] !== null) {
        return (
          <div className="pill-list">
            {value.map((item) => {
              const participant = item as {
                characterId?: string;
                characterName?: string;
                role?: string;
                participationType?: string;
              };
              const label = [
                participant.characterName ?? participant.characterId ?? "-",
                participant.role ? t(participant.role) : "-",
                participant.participationType ? t(participant.participationType) : "-",
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <span className="pill" key={participant.characterId ?? label}>
                  {label}
                </span>
              );
            })}
          </div>
        );
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
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const detailSections = (item: Event) => [
    {
      title: t("Event Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Type"), value: item.type ? t(item.type) : "-", size: "narrow" },
        {
          label: t("Type Detail"),
          value: item.typeDetail ? t(item.typeDetail) : "-",
          size: "narrow",
        },
        { label: t("Scope"), value: item.scope ? t(item.scope) : "-", size: "narrow" },
        {
          label: t("Location"),
          value: item.locationName ?? item.locationId ?? "-",
          size: "wide",
        },
        {
          label: t("Segment"),
          value: item.segmentName ?? item.timelineName ?? item.segmentId ?? item.timelineId ?? "-",
          size: "wide",
        },
        {
          label: t("Marker"),
          value: item.markerLabel ?? item.markerId ?? "-",
          size: "wide",
        },
        {
          label: t("Marker Tick"),
          value: item.markerTick ?? item.timelineYear ?? "-",
          size: "narrow",
        },
        {
          label: t("Duration"),
          value:
            item.durationValue !== undefined
              ? `${item.durationValue} ${
                  item.durationUnit ? t(item.durationUnit) : ""
                }`.trim()
              : "-",
          size: "narrow",
        },
      ],
    },
    {
      title: t("Narrative"),
      fields: [
        { label: t("Summary"), value: item.summary, size: "wide" },
        { label: t("Description"), value: item.description, size: "wide" },
      ],
    },
    {
      title: t("Notes & Tags"),
      fields: [
        { label: t("Participants"), value: item.participants, size: "wide" },
        { label: t("Notes"), value: item.notes, size: "wide" },
        { label: t("Tags"), value: item.tags, size: "wide" },
      ],
    },
  ];

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Type")}</th>
            <th>{t("Type Detail")}</th>
            <th>{t("Scope")}</th>
            <th>{t("Segment")}</th>
            <th>{t("Marker Tick")}</th>
            <th>{t("Duration")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="table__row"
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
              </td>
              <td>{item.type ? t(item.type) : "-"}</td>
              <td>{item.typeDetail ? t(item.typeDetail) : "-"}</td>
              <td>{item.scope ? t(item.scope) : "-"}</td>
              <td>
                {item.segmentName ??
                  item.timelineName ??
                  item.segmentId ??
                  item.timelineId ??
                  "-"}
              </td>
              <td>{item.markerTick ?? item.timelineYear ?? "-"}</td>
              <td>
                {item.durationValue !== undefined
                  ? `${item.durationValue} ${
                      item.durationUnit ? t(item.durationUnit) : ""
                    }`.trim()
                  : "-"}
              </td>
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
          ))}
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
                <h3>{t("Event details")}</h3>
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
