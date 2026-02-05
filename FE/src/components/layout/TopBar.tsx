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
        <Button variant="ghost" onClick={onBack} className="topbar__button topbar__button--icon">
          <img src="/icons8-back.apng" alt={t("Back")} className="topbar__icon" />
        </Button>
        <Button variant="ghost" onClick={onToggleSidebar} className="topbar__button">
          {sidebarOpen ? t("Hide sidebar") : t("Show sidebar")}
        </Button>
      </div>
      <div className="topbar__center">
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
      </div>
      <div className="topbar__right">
        <Button
          variant="ghost"
          onClick={() => navigate("/tcode-docs")}
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
