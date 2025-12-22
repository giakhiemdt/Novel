import { formatDateTime } from "../../utils/date";
import type { Timeline } from "./timeline.types";

export type TimelineListProps = {
  items: Timeline[];
};

export const TimelineList = ({ items }: TimelineListProps) => {
  if (items.length === 0) {
    return <p className="header__subtitle">No timelines yet.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Years</th>
          <th>Duration</th>
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
            <td>
              {item.startYear} - {item.endYear}
            </td>
            <td>{item.durationYears ?? item.endYear - item.startYear}</td>
            <td>{formatDateTime(item.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
