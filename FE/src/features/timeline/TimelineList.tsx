import { formatDateTime } from "../../utils/date";
import { useI18n } from "../../i18n/I18nProvider";
import type { Timeline } from "./timeline.types";

export type TimelineListProps = {
  items: Timeline[];
  selectedId?: string;
  onSelect?: (item: Timeline) => void;
};

export const TimelineList = ({ items, selectedId, onSelect }: TimelineListProps) => {
  const { t } = useI18n();
  if (items.length === 0) {
    return <p className="header__subtitle">{t("No timelines yet.")}</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t("Name")}</th>
          <th>{t("Years")}</th>
          <th>{t("Duration")}</th>
          <th>{t("Created")}</th>
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
            <td>
              0 - {item.durationYears ?? 0}
            </td>
            <td>{item.durationYears ?? 0}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        )})}
      </tbody>
    </table>
  );
};
