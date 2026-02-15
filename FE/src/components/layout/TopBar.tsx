import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { commandRegistry, normalizeCommand } from "../../features/command/commandRegistry";
import backIcon from "../../assets/icons/arrow_back.svg";
import dockIcon from "../../assets/icons/dock.svg";
import docsIcon from "../../assets/icons/docs.svg";
import settingsIcon from "../../assets/icons/settings.svg";

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
          <img src={backIcon} alt="" className="topbar__icon topbar__icon--back" />
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleSidebar}
          className="topbar__button topbar__button--icon"
          aria-label={sidebarOpen ? t("Hide sidebar") : t("Show sidebar")}
          title={sidebarOpen ? t("Hide sidebar") : t("Show sidebar")}
        >
          <img src={dockIcon} alt="" className="topbar__icon topbar__icon--dock" />
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
          <img src={docsIcon} alt="" className="topbar__icon topbar__icon--nav" />
          {t("Docs")}
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="topbar__button"
        >
          <img src={settingsIcon} alt="" className="topbar__icon topbar__icon--nav" />
          {t("Settings")}
        </Button>
      </div>
    </div>
  );
};
