import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { Button } from "../../components/common/Button";
import { commandRegistry } from "./commandRegistry";

const shortcuts = [
  { key: "Ctrl + K", action: "Open command bar" },
  { key: "Ctrl + Shift + M", action: "Toggle sidebar" },
];

export const CommandDocs = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const filteredCommands = useMemo(() => {
    if (!normalized) {
      return commandRegistry;
    }
    return commandRegistry.filter((cmd) => {
      const haystack = `${cmd.code} ${cmd.label} ${cmd.route}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalized]);

  const filteredShortcuts = useMemo(() => {
    if (!normalized) {
      return shortcuts;
    }
    return shortcuts.filter((item) => {
      const haystack = `${item.key} ${item.action}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalized]);

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="section-title">{t("T-code Documentation")}</h3>
            <p className="header__subtitle">
              {t("Search T-codes, functions, and shortcuts.")}
            </p>
          </div>
        </div>
        <div className="form-field--wide">
          <input
            className="input"
            placeholder={t("Search...")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <h4 className="section-title">{t("Node Documentation")}</h4>
            <p className="header__subtitle">
              {t("Browse nodes and open detailed data contracts.")}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/node-docs")}>
            {t("Open node docs")}
          </Button>
        </div>
      </div>

      <div className="card">
        <h4 className="section-title">{t("T-code list")}</h4>
        {filteredCommands.length === 0 ? (
          <p className="header__subtitle">{t("No matches")}</p>
        ) : (
          <table className="table table--clean">
            <thead>
              <tr>
                <th>{t("T-code")}</th>
                <th>{t("Function")}</th>
                <th>{t("Route")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommands.map((cmd) => (
                <tr key={cmd.code} className="table__row">
                  <td>{cmd.code}</td>
                  <td>{t(cmd.label)}</td>
                  <td>{cmd.route}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h4 className="section-title">{t("Keyboard shortcuts")}</h4>
        {filteredShortcuts.length === 0 ? (
          <p className="header__subtitle">{t("No matches")}</p>
        ) : (
          <table className="table table--clean">
            <thead>
              <tr>
                <th>{t("Shortcut")}</th>
                <th>{t("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredShortcuts.map((item) => (
                <tr key={item.key} className="table__row">
                  <td>{item.key}</td>
                  <td>{t(item.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
