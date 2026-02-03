import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { CharacterRelation } from "./relationship.types";

export type RelationshipListProps = {
  items: CharacterRelation[];
  charactersById?: Record<string, string>;
  onSelect?: (item: CharacterRelation) => void;
  onEdit?: (item: CharacterRelation) => void;
  onDelete?: (item: CharacterRelation) => void;
};

export const RelationshipList = ({
  items,
  charactersById,
  onSelect,
  onEdit,
  onDelete,
}: RelationshipListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<CharacterRelation | null>(null);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No relationships yet.")}</p>;
  }

  const resolveName = (id?: string) => (id ? charactersById?.[id] ?? id : "-");

  const renderValue = (value: unknown) => {
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const detailSections = (item: CharacterRelation) => [
    {
      title: t("Relationship"),
      fields: [
        { label: t("From"), value: resolveName(item.fromId), size: "wide" },
        { label: t("To"), value: resolveName(item.toId), size: "wide" },
        { label: t("Type"), value: item.type ? t(item.type) : "-", size: "narrow" },
      ],
    },
    {
      title: t("Timeline"),
      fields: [
        { label: t("Start Year"), value: item.startYear, size: "narrow" },
        { label: t("End Year"), value: item.endYear, size: "narrow" },
      ],
    },
    {
      title: t("Notes"),
      fields: [{ label: t("Note"), value: item.note, size: "wide" }],
    },
  ];

  return (
    <>
      <table className="table table--clean">
        <thead>
          <tr>
            <th>{t("From")}</th>
            <th>{t("To")}</th>
            <th>{t("Type")}</th>
            <th>{t("Start Year")}</th>
            <th>{t("End Year")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={`${item.fromId}-${item.toId}-${item.type}`}
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
              <td>{resolveName(item.fromId)}</td>
              <td>{resolveName(item.toId)}</td>
              <td>{item.type ? t(item.type) : "-"}</td>
              <td>{item.startYear ?? "-"}</td>
              <td>{item.endYear ?? "-"}</td>
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
                <h3>{t("Relationship details")}</h3>
                <p className="modal__subtitle">
                  {resolveName(detailItem.fromId)}
                  {" -> "}
                  {resolveName(detailItem.toId)}
                </p>
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
