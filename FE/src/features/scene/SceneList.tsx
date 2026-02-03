import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Scene } from "./scene.types";

export type SceneListProps = {
  items: Scene[];
  chaptersById?: Record<string, string>;
  eventsById?: Record<string, string>;
  locationsById?: Record<string, string>;
  charactersById?: Record<string, string>;
  onSelect?: (item: Scene) => void;
  onEdit?: (item: Scene) => void;
  onDelete?: (item: Scene) => void;
};

export const SceneList = ({
  items,
  chaptersById,
  eventsById,
  locationsById,
  charactersById,
  onSelect,
  onEdit,
  onDelete,
}: SceneListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Scene | null>(null);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No scenes yet.")}</p>;
  }

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
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const detailSections = (item: Scene) => {
    const characterNames = (item.characterIds ?? []).map(
      (id) => charactersById?.[id] ?? id
    );
    return [
      {
        title: t("Scene Identity"),
        fields: [
          { label: t("Name"), value: item.name, size: "wide" },
          { label: t("Order"), value: item.order, size: "narrow" },
          {
            label: t("Chapter"),
            value: item.chapterId
              ? chaptersById?.[item.chapterId] ?? item.chapterId
              : "-",
            size: "wide",
          },
          {
            label: t("Event"),
            value: item.eventId
              ? eventsById?.[item.eventId] ?? item.eventId
              : "-",
            size: "wide",
          },
          {
            label: t("Location"),
            value: item.locationId
              ? locationsById?.[item.locationId] ?? item.locationId
              : "-",
            size: "wide",
          },
        ],
      },
      {
        title: t("Narrative"),
        fields: [
          { label: t("Summary"), value: item.summary, size: "wide" },
          { label: t("Content"), value: item.content, size: "wide" },
        ],
      },
      {
        title: t("Notes & Tags"),
        fields: [
          { label: t("Characters"), value: characterNames, size: "wide" },
          { label: t("Notes"), value: item.notes, size: "wide" },
          { label: t("Tags"), value: item.tags, size: "wide" },
        ],
      },
    ];
  };

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Chapter")}</th>
            <th>{t("Event")}</th>
            <th>{t("Location")}</th>
            <th>{t("Characters")}</th>
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
              <td>
                {item.chapterId
                  ? chaptersById?.[item.chapterId] ?? item.chapterId
                  : "-"}
              </td>
              <td>
                {item.eventId
                  ? eventsById?.[item.eventId] ?? item.eventId
                  : "-"}
              </td>
              <td>
                {item.locationId
                  ? locationsById?.[item.locationId] ?? item.locationId
                  : "-"}
              </td>
              <td>{item.characterIds?.length ?? 0}</td>
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
                <h3>{t("Scene details")}</h3>
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
