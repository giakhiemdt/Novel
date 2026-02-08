import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { RankSystem } from "./rank-system.types";

export type RankSystemListProps = {
  items: RankSystem[];
  onSelect?: (item: RankSystem) => void;
  onEdit?: (item: RankSystem) => void;
  onDelete?: (item: RankSystem) => void;
};

export const RankSystemList = ({
  items,
  onSelect,
  onEdit,
  onDelete,
}: RankSystemListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<RankSystem | null>(null);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No rank systems yet.")}</p>;
  }

  const renderValue = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="header__subtitle">-</span>;
      }
      return (
        <div className="pill-list">
          {value.map((item) => (
            <span className="pill" key={String(item)}>
              {String(item)}
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

  const detailSections = (item: RankSystem) => [
    {
      title: t("Rank System Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Code"), value: item.code, size: "narrow" },
        { label: t("Domain"), value: item.domain, size: "narrow" },
        { label: t("Priority"), value: item.priority, size: "narrow" },
        { label: t("Primary"), value: item.isPrimary, size: "narrow" },
      ],
    },
    {
      title: t("Description"),
      fields: [{ label: t("Description"), value: item.description, size: "wide" }],
    },
    {
      title: t("Notes & Tags"),
      fields: [{ label: t("Tags"), value: item.tags, size: "wide" }],
    },
  ];

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Code")}</th>
            <th>{t("Domain")}</th>
            <th>{t("Priority")}</th>
            <th>{t("Primary")}</th>
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
              <td>{item.code ?? "-"}</td>
              <td>{item.domain ?? "-"}</td>
              <td>{item.priority ?? "-"}</td>
              <td>{item.isPrimary ? t("Yes") : t("No")}</td>
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
                <h3>{t("Rank system details")}</h3>
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
                        <div className="detail-item__value">{renderValue(field.value)}</div>
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
