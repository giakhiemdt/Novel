import { HealthCheck } from "../features/health/HealthCheck";

export const Dashboard = () => {
  return (
    <div className="card">
      <h2 className="section-title">Welcome to Novel World Studio</h2>
      <p className="header__subtitle">
        Create timelines, characters, factions, and locations from a single
        workspace.
      </p>
      <HealthCheck />
    </div>
  );
};
