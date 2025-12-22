import { formatDateTime } from "../../utils/date";
import type { Faction } from "./faction.types";

export type FactionListProps = {
  items: Faction[];
};

export const FactionList = ({ items }: FactionListProps) => {
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
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <div className="header__subtitle">{item.id}</div>
            </td>
            <td>{item.alignment ?? "-"}</td>
            <td>{item.powerLevel ?? "-"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
