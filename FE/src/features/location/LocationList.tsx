import { formatDateTime } from "../../utils/date";
import type { Location } from "./location.types";

export type LocationListProps = {
  items: Location[];
};

export const LocationList = ({ items }: LocationListProps) => {
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
        {items.map((item) => (
          <tr key={item.id}>
            <td>
              <strong>{item.name}</strong>
              <div className="header__subtitle">{item.id}</div>
            </td>
            <td>{item.type ?? "-"}</td>
            <td>{item.isHabitable ? "Yes" : "No"}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
