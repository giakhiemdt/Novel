import { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/common/Button";
import { useToast } from "../../components/common/Toast";
import { useI18n } from "../../i18n/I18nProvider";

export const HealthCheck = () => {
  const { t } = useI18n();
  const { notify } = useToast();
  const [status, setStatus] = useState<string>("idle");

  const checkHealth = async () => {
    setStatus("checking");
    try {
      const data = await api.get<{ status: string }>("/health");
      setStatus(data.status);
    } catch (err) {
      setStatus("failed");
      notify((err as Error).message, "error");
    }
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h3 className="section-title">{t("Backend Status")}</h3>
      <p className="header__subtitle">
        {t("Ping the service before creating any new entities.")}
      </p>
      <Button onClick={checkHealth} variant="primary">
        {t("Check health")}
      </Button>
      {status !== "idle" && (
        <p style={{ marginTop: "12px" }}>
          {t("Status")}: <strong>{status}</strong>
        </p>
      )}
    </div>
  );
};
