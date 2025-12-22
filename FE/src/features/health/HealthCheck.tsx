import { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/common/Button";

export const HealthCheck = () => {
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setStatus("checking");
    setError(null);
    try {
      const data = await api.get<{ status: string }>("/health");
      setStatus(data.status);
    } catch (err) {
      setStatus("failed");
      setError((err as Error).message);
    }
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h3 className="section-title">Backend Status</h3>
      <p className="header__subtitle">
        Ping the service before creating any new entities.
      </p>
      <Button onClick={checkHealth} variant="primary">
        Check health
      </Button>
      {status !== "idle" && (
        <p style={{ marginTop: "12px" }}>
          Status: <strong>{status}</strong>
        </p>
      )}
      {error && <p className="notice notice--error">{error}</p>}
    </div>
  );
};
