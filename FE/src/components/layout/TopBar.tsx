import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { commandRegistry, normalizeCommand } from "../../features/command/commandRegistry";

export type TopBarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBack: () => void;
};

export const TopBar = ({ sidebarOpen, onToggleSidebar, onBack }: TopBarProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const commandMap = useMemo(
    () => new Map(commandRegistry.map((command) => [command.code, command])),
    []
  );

  const suggestions = useMemo(() => {
    const normalized = normalizeCommand(query);
    if (!normalized) {
      return [];
    }
    return commandRegistry
      .filter((command) => {
        const code = command.code.toUpperCase();
        const label = command.label.toUpperCase();
        return code.includes(normalized) || label.includes(normalized);
      })
      .slice(0, 5);
  }, [query]);

  const handleCommand = () => {
    const normalized = normalizeCommand(query);
    if (!normalized) {
      return;
    }
    const match = commandMap.get(normalized) ??
      commandRegistry.find((cmd) =>
        cmd.label.toUpperCase().includes(normalized)
      );
    if (match) {
      navigate(match.route);
      setQuery("");
    }
  };

  return (
    <div className="topbar">
      <div className="topbar__left">
        <Button
          variant="ghost"
          onClick={onBack}
          className="topbar__button topbar__button--icon"
          aria-label={t("Back")}
        >
          <svg
            className="topbar__icon topbar__icon--back"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M10.75 6.75a.75.75 0 0 1 0 1.06L8.56 10h8.69a.75.75 0 0 1 0 1.5H8.56l2.19 2.19a.75.75 0 1 1-1.06 1.06l-3.5-3.5a.75.75 0 0 1 0-1.06l3.5-3.5a.75.75 0 0 1 1.06 0Z" />
          </svg>
        </Button>
        <Button variant="ghost" onClick={onToggleSidebar} className="topbar__button">
          {sidebarOpen ? t("Hide sidebar") : t("Show sidebar")}
        </Button>
      </div>
      <div className="topbar__center">
        <div className="topbar__search">
          <input
            className="input topbar__input"
            placeholder={t("Type a T-code or name.")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCommand();
              }
            }}
          />
          {suggestions.length > 0 && (
            <div className="command-list topbar__suggestions">
              {suggestions.map((command) => (
                <div
                  key={command.code}
                  className="command-item"
                  onClick={() => {
                    navigate(command.route);
                    setQuery("");
                  }}
                >
                  <div>
                    <strong>{command.code}</strong>
                    <span className="command-item__label">{t(command.label)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="topbar__right">
        <Button
          variant="ghost"
          onClick={() => navigate("/node-docs")}
          className="topbar__button"
        >
          {t("Docs")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="topbar__button"
        >
          {t("Settings")}
        </Button>
      </div>
    </div>
  );
};
