import { formatDateTime } from "../../utils/date";
import type { Character } from "./character.types";

export type CharacterListProps = {
  items: Character[];
  selectedId?: string;
  onSelect?: (item: Character) => void;
};

export const CharacterList = ({ items, selectedId, onSelect }: CharacterListProps) => {
  if (items.length === 0) {
    return <p className="header__subtitle">No characters yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
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
            <td>{item.isMainCharacter ? "Main" : "Supporting"}</td>
            <td>{item.status ?? "-"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        )})}
      </tbody>
    </table>
  );
};
