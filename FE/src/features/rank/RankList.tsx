import { useI18n } from "../../i18n/I18nProvider";
import type { Rank, RankCondition } from "./rank.types";
import { useState } from "react";

export type RankListProps = {
  items: Rank[];
  rankSystemNameById?: Record<string, string>;
  onSelect?: (item: Rank) => void;
  onEdit?: (item: Rank) => void;
  onDelete?: (item: Rank) => void;
};

export const RankList = ({
  items,
  rankSystemNameById,
  onSelect,
  onEdit,
  onDelete,
}: RankListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Rank | null>(null);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No ranks yet.")}</p>;
  }

  const isRankCondition = (value: unknown): value is RankCondition =>
    Boolean(value) &&
    typeof value === "object" &&
    "name" in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>).name === "string";

  const renderValue = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="header__subtitle">-</span>;
      }
      const isConditionArray = value.every(isRankCondition);
      return (
        <div className="pill-list">
          {value.map((item, index) => (
            <span
              className="pill"
              key={`${String(isConditionArray ? (item as RankCondition).name : item)}-${index + 1}`}
              title={
                isConditionArray
                  ? (item as RankCondition).description || undefined
                  : undefined
              }
            >
              {isConditionArray ? (item as RankCondition).name : String(item)}
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

  const detailSections = (item: Rank) => [
    {
      title: t("Rank Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Alias"), value: item.alias, size: "wide" },
        { label: t("Tier"), value: item.tier, size: "narrow" },
        {
          label: t("Rank System"),
          value: item.systemId
            ? rankSystemNameById?.[item.systemId] ?? item.systemId
            : "-",
          size: "narrow",
        },
        { label: t("System"), value: item.system, size: "narrow" },
      ],
    },
    {
      title: t("Notes & Tags"),
      fields: [
        { label: t("Description"), value: item.description, size: "wide" },
        { label: t("Traits"), value: item.traits, size: "wide" },
        { label: t("Notes"), value: item.notes, size: "wide" },
        { label: t("Tags"), value: item.tags, size: "wide" },
        { label: t("Promotion Conditions"), value: item.conditions, size: "wide" },
      ],
    },
  ];

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Tier")}</th>
            <th>{t("Rank System")}</th>
            <th>{t("System")}</th>
            <th>{t("Tags")}</th>
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
              <td>{item.tier ?? "-"}</td>
              <td>
                {item.systemId
                  ? rankSystemNameById?.[item.systemId] ?? item.systemId
                  : "-"}
              </td>
              <td>{item.system ?? "-"}</td>
              <td>
                {item.tags && item.tags.length > 0 ? item.tags.join(", ") : "-"}
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
                <h3>{t("Rank details")}</h3>
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
