import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Item } from "./item.types";

export type ItemListProps = {
  items: Item[];
  charactersById?: Record<string, string>;
  factionsById?: Record<string, string>;
  onSelect?: (item: Item) => void;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
};

export const ItemList = ({
  items,
  charactersById,
  factionsById,
  onSelect,
  onEdit,
  onDelete,
}: ItemListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Item | null>(null);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No items yet.")}</p>;
  }

  const renderOwner = (item: Item) => {
    if (!item.ownerId || !item.ownerType) {
      return "-";
    }
    if (item.ownerType === "character") {
      return charactersById?.[item.ownerId] ?? item.ownerId;
    }
    return factionsById?.[item.ownerId] ?? item.ownerId;
  };

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

  const detailSections = (item: Item) => [
    {
      title: t("Item Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Status"), value: item.status ? t(item.status) : "-", size: "narrow" },
        { label: t("Owner"), value: renderOwner(item), size: "wide" },
        { label: t("Origin"), value: item.origin, size: "wide" },
      ],
    },
    {
      title: t("Power"),
      fields: [
        { label: t("Power Level"), value: item.powerLevel, size: "narrow" },
        { label: t("Power Description"), value: item.powerDescription, size: "wide" },
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

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Owner")}</th>
            <th>{t("Status")}</th>
            <th>{t("Power Level")}</th>
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
              <td>{renderOwner(item)}</td>
              <td>{item.status ? t(item.status) : "-"}</td>
              <td>{item.powerLevel ?? "-"}</td>
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
                <h3>{t("Item details")}</h3>
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
