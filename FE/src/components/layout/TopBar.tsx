import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";
import { commandRegistry, normalizeCommand } from "../../features/command/commandRegistry";
import backIcon from "../../assets/icons/arrow_back.svg";
import searchIcon from "../../assets/icons/search.svg";
import docsIcon from "../../assets/icons/docs.svg";
import settingsIcon from "../../assets/icons/settings.svg";

export type TopBarProps = {
  onBack: () => void;
};

export const TopBar = ({ onBack }: TopBarProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

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

  const handleSelectSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) {
      return;
    }
    navigate(suggestion.route);
    setQuery("");
    setActiveSuggestionIndex(-1);
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
      </div>
      <div className="topbar__center">
        <div className="topbar__search">
          <img src={searchIcon} alt="" className="topbar__search-icon" />
          <input
            className="input topbar__input"
            placeholder={t("Type a T-code or name.")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveSuggestionIndex(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!suggestions.length) {
                  return;
                }
                setActiveSuggestionIndex((prev) =>
                  prev < suggestions.length - 1 ? prev + 1 : 0
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                if (!suggestions.length) {
                  return;
                }
                setActiveSuggestionIndex((prev) =>
                  prev > 0 ? prev - 1 : suggestions.length - 1
                );
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                if (
                  activeSuggestionIndex >= 0 &&
                  activeSuggestionIndex < suggestions.length
                ) {
                  handleSelectSuggestion(activeSuggestionIndex);
                  return;
                }
                handleCommand();
              }
              if (event.key === "Escape") {
                setActiveSuggestionIndex(-1);
              }
            }}
          />
          {suggestions.length > 0 && (
            <div className="command-list topbar__suggestions">
              {suggestions.map((command, index) => (
                <div
                  key={command.code}
                  className={`command-item ${
                    index === activeSuggestionIndex ? "command-item--active" : ""
                  }`}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onClick={() => handleSelectSuggestion(index)}
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
