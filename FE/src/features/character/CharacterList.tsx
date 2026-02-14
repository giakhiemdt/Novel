import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Character } from "./character.types";

export type CharacterListProps = {
  items: Character[];
  onSelect?: (item: Character) => void;
  onEdit?: (item: Character) => void;
  onDelete?: (item: Character) => void;
};

export const CharacterList = ({
  items,
  onSelect,
  onEdit,
  onDelete,
}: CharacterListProps) => {
  const { t } = useI18n();
  const [detailItem, setDetailItem] = useState<Character | null>(null);
  if (items.length === 0) {
    return <p className="header__subtitle">{t("No characters yet.")}</p>;
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
    if (typeof value === "boolean") {
      return value ? t("Yes") : t("No");
    }
    if (value === undefined || value === null || value === "") {
      return <span className="header__subtitle">-</span>;
    }
    return value as string | number;
  };

  const getImportance = (item: Character): string =>
    item.importance ?? (item.isMainCharacter ? "Protagonist" : "Supporting");

  const detailSections = (item: Character) => [
    {
      title: t("Core Identity"),
      fields: [
        { label: t("Name"), value: item.name, size: "wide" },
        { label: t("Alias"), value: item.alias, size: "wide" },
        { label: t("Level"), value: item.level ? t(item.level) : "-", size: "narrow" },
        { label: t("Status"), value: item.status ? t(item.status) : "-", size: "narrow" },
        { label: t("Gender"), value: item.gender ? t(item.gender) : "-", size: "narrow" },
        { label: t("Age"), value: item.age, size: "narrow" },
        { label: t("Race"), value: item.race ? t(item.race) : "-", size: "narrow" },
        { label: t("Importance"), value: t(getImportance(item)), size: "narrow" },
        {
          label: t("Special Ability"),
          value: item.specialAbilities ?? [],
          size: "wide",
        },
      ],
    },
    {
      title: t("Traits"),
      fields: [
        { label: t("Appearance"), value: item.appearance, size: "wide" },
        { label: t("Height"), value: item.height, size: "narrow" },
        { label: t("Distinctive Traits"), value: item.distinctiveTraits, size: "wide" },
        { label: t("Personality Traits"), value: item.personalityTraits, size: "wide" },
        { label: t("Beliefs"), value: item.beliefs, size: "wide" },
        { label: t("Fears"), value: item.fears, size: "wide" },
        { label: t("Desires"), value: item.desires, size: "wide" },
        { label: t("Weaknesses"), value: item.weaknesses, size: "wide" },
      ],
    },
    {
      title: t("Background"),
      fields: [
        { label: t("Origin"), value: item.origin, size: "wide" },
        { label: t("Background"), value: item.background, size: "wide" },
        { label: t("Trauma"), value: item.trauma, size: "wide" },
        { label: t("Secret"), value: item.secret, size: "wide" },
        { label: t("Current Location"), value: item.currentLocation, size: "wide" },
        { label: t("Current Goal"), value: item.currentGoal, size: "wide" },
        { label: t("Current Affiliation"), value: item.currentAffiliation, size: "wide" },
        { label: t("Power State"), value: item.powerState, size: "wide" },
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
            <th>{t("Level")}</th>
            <th>{t("Gender")}</th>
            <th>{t("Race")}</th>
            <th>{t("Alias")}</th>
            <th>{t("Age")}</th>
            <th>{t("Importance")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const aliasText = item.alias?.length ? item.alias.join(", ") : "-";
            const importance = getImportance(item);
            const rowClassName = [
              "table__row",
              importance === "Protagonist"
                ? "table__row--main"
                : "table__row--supporting",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <tr
                key={item.id}
                className={rowClassName}
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
                  <strong className="character-name">{item.name}</strong>
                </td>
                <td>{item.level ?? "-"}</td>
                <td>{item.gender ? t(item.gender) : "-"}</td>
                <td>{item.race ? t(item.race) : "-"}</td>
                <td>{aliasText}</td>
                <td>{item.age ?? "-"}</td>
                <td>{t(importance)}</td>
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
        <div
          className="modal__backdrop"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="modal modal--details modal--wide"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <div>
                <h3>{t("Character details")}</h3>
                <p className="modal__subtitle">{detailItem.name}</p>
              </div>
              <button
                className="modal__close"
                type="button"
                onClick={() => setDetailItem(null)}
                aria-label="Close modal"
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
