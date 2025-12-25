import { formatDateTime } from "../../utils/date";
import type { Location } from "./location.types";

export type LocationListProps = {
  items: Location[];
  selectedId?: string;
  onSelect?: (item: Location) => void;
};

export const LocationList = ({ items, selectedId, onSelect }: LocationListProps) => {
  if (items.length === 0) {
    return <p className="header__subtitle">No locations yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Habitable</th>
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
            <td>{item.type ?? "-"}</td>
            <td>{item.isHabitable ? "Yes" : "No"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        )})}
      </tbody>
    </table>
  );
};
