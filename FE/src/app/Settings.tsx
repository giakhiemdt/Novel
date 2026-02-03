import { Select } from "../components/form/Select";
import { HealthCheck } from "../features/health/HealthCheck";
import { useI18n } from "../i18n/I18nProvider";

export const Settings = () => {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="settings-page">
      <section className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("Settings")}</h3>
            <p className="header__subtitle">{t("Display language")}</p>
          </div>
        </div>
        <div className="form-grid">
          <Select
            label="Display language"
            value={language}
            onChange={(value) => setLanguage(value as "en" | "vi")}
            options={[
              { label: "English", value: "en" },
              { label: "Vietnamese", value: "vi" },
            ]}
          />
        </div>
      </section>

      <HealthCheck />
    </div>
  );
};
