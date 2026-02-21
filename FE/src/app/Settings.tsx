import { useState } from "react";
import { Select } from "../components/form/Select";
import { HealthCheck } from "../features/health/HealthCheck";
import { useI18n } from "../i18n/I18nProvider";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "../utils/theme";

export const Settings = () => {
  const { language, setLanguage, t } = useI18n();
  const [themePreference, setThemePreferenceState] = useState(
    () => getThemePreference()
  );

  const handleLanguageChange = (value: string) => {
    if (value === "vn") {
      setLanguage("vi");
      return;
    }
    if (value === "en" || value === "vi") {
      setLanguage(value);
    }
  };

  const handleThemeChange = (value: string) => {
    if (value === "dark" || value === "light" || value === "system") {
      setThemePreference(value as ThemePreference);
      setThemePreferenceState(value as ThemePreference);
    }
  };

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
            onChange={handleLanguageChange}
            options={[
              { label: "English", value: "en" },
              { label: "Tiếng Việt", value: "vi" },
            ]}
          />
          <Select
            label="Theme"
            value={themePreference}
            onChange={handleThemeChange}
            options={[
              { label: "System", value: "system" },
              { label: "Dark", value: "dark" },
              { label: "Light", value: "light" },
            ]}
          />
        </div>
      </section>

      <HealthCheck />
    </div>
  );
};
