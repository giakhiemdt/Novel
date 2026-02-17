import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { WorldRule } from "./worldrule.types";

export type WorldRuleListProps = {
  items: WorldRule[];
  locationNameById: Record<string, string>;
  timelineNameById: Record<string, string>;
  onSelect?: (item: WorldRule) => void;
  onEdit?: (item: WorldRule) => void;
  onDelete?: (item: WorldRule) => void;
};

const normalizeStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [];
};

export const WorldRuleList = ({
  items,
  locationNameById,
  timelineNameById,
  onSelect,
  onEdit,
  onDelete,
}: WorldRuleListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<WorldRule | null>(null);

  const mapScopeLocations = (scope: unknown) =>
    normalizeStringList(scope).map((locationId) => locationNameById[locationId] ?? locationId);
  const mapTimelines = (timelineIds: unknown) =>
    normalizeStringList(timelineIds).map(
      (timelineId) => timelineNameById[timelineId] ?? timelineId
    );

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No world rules yet.")}</p>;
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

  const detailSections = (item: WorldRule) => [
    {
      title: t("World Rule"),
      fields: [
        { label: t("Rule Code"), value: item.ruleCode, size: "narrow" },
        { label: t("Title"), value: item.title, size: "wide" },
        { label: t("TLDR"), value: item.tldr, size: "wide" },
        { label: t("Status"), value: item.status ? t(item.status) : "-", size: "narrow" },
        { label: t("Category"), value: item.category, size: "wide" },
        { label: t("Scope"), value: mapScopeLocations(item.scope), size: "wide" },
        { label: t("Version"), value: item.version, size: "narrow" },
      ],
    },
    {
      title: t("Details"),
      fields: [
        { label: t("Description"), value: item.description, size: "wide" },
        {
          label: t("Trigger Conditions"),
          value: normalizeStringList(item.triggerConditions),
          size: "wide",
        },
        { label: t("Core Rules"), value: normalizeStringList(item.coreRules), size: "wide" },
        {
          label: t("Consequences"),
          value: normalizeStringList(item.consequences),
          size: "wide",
        },
        { label: t("Examples"), value: normalizeStringList(item.examples), size: "wide" },
        {
          label: t("Related Rule Codes"),
          value: normalizeStringList(item.relatedRuleCodes),
          size: "wide",
        },
        { label: t("Constraints"), value: item.constraints, size: "wide" },
        { label: t("Exceptions"), value: item.exceptions, size: "wide" },
      ],
    },
    {
      title: t("Timeline"),
      fields: [
        { label: t("Timeline"), value: mapTimelines(item.timelineIds), size: "wide" },
        { label: t("Valid From"), value: item.validFrom, size: "narrow" },
        { label: t("Valid To"), value: item.validTo, size: "narrow" },
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
            <th>{t("Rule Code")}</th>
            <th>{t("Title")}</th>
            <th>{t("Category")}</th>
            <th>{t("Status")}</th>
            <th>{t("Scope")}</th>
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
              <td>{item.ruleCode ?? "-"}</td>
              <td>
                <strong>{item.title}</strong>
                {item.tldr ? <p className="header__subtitle">{item.tldr}</p> : null}
              </td>
              <td>{item.category ?? "-"}</td>
              <td>{item.status ? t(item.status) : "-"}</td>
              <td>{renderValue(mapScopeLocations(item.scope))}</td>
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
                <h3>{t("World rule details")}</h3>
                <p className="modal__subtitle">{detailItem.title}</p>
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
