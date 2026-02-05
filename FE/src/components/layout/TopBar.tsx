import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { commandRegistry, normalizeCommand } from "../../features/command/commandRegistry";
import backIcon from "../../assets/icons8-back-90.png";

export type TopBarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onBack: () => void;
};

export const TopBar = ({ sidebarOpen, onToggleSidebar, onBack }: TopBarProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const commandMap = useMemo(
    () => new Map(commandRegistry.map((command) => [command.code, command])),
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("novel-tcode-history");
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setHistory(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
  }, []);

  const saveHistory = (next: string[]) => {
    setHistory(next);
    localStorage.setItem("novel-tcode-history", JSON.stringify(next));
  };

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
      const nextHistory = [
        normalized,
        ...history.filter((item) => item !== normalized),
      ].slice(0, 5);
      saveHistory(nextHistory);
      setQuery("");
    }
  };

  return (
    <div className="topbar">
      <div className="topbar__left">
        <Button variant="ghost" onClick={onBack} className="topbar__button topbar__button--icon">
          <img src={backIcon} alt={t("Back")} className="topbar__icon" />
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
          list="tcode-history"
        />
        <datalist id="tcode-history">
          {history.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
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
