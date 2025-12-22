import { formatDateTime } from "../../utils/date";
import type { Character } from "./character.types";

export type CharacterListProps = {
  items: Character[];
};

export const CharacterList = ({ items }: CharacterListProps) => {
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
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <div className="header__subtitle">{item.id}</div>
            </td>
            <td>{item.isMainCharacter ? "Main" : "Supporting"}</td>
            <td>{item.status ?? "-"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
