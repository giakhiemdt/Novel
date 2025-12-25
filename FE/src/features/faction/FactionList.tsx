import { formatDateTime } from "../../utils/date";
import type { Faction } from "./faction.types";

export type FactionListProps = {
  items: Faction[];
  selectedId?: string;
  onSelect?: (item: Faction) => void;
};

export const FactionList = ({ items, selectedId, onSelect }: FactionListProps) => {
  if (items.length === 0) {
    return <p className="header__subtitle">No factions yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Alignment</th>
          <th>Power</th>
          <th>Created</th>
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
            <td>{item.alignment ?? "-"}</td>
            <td>{item.powerLevel ?? "-"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        )})}
      </tbody>
    </table>
  );
};
