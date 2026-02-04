import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nProvider";
import { commandRegistry, normalizeCommand } from "./commandRegistry";

const FAVORITES_KEY = "novel-favorites";

const getFavorites = (): string[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const saveFavorites = (codes: string[]) => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(codes));
  window.dispatchEvent(new Event("novel-favorites-changed"));
};

export const CommandBar = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(getFavorites());
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshFavorites = useCallback(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCmdK) {
        event.preventDefault();
        setOpen(true);
      }
      if (open && event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      if (detail?.query !== undefined) {
        setQuery(detail.query);
      }
      setOpen(true);
    };
    window.addEventListener("novel-command-open", handler);
    return () => window.removeEventListener("novel-command-open", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setSelectedIndex(0);
      window.dispatchEvent(new Event("novel-command-close"));
    }
  }, [open]);

  useEffect(() => {
    const handler = () => refreshFavorites();
    window.addEventListener("novel-favorites-changed", handler);
    return () => window.removeEventListener("novel-favorites-changed", handler);
  }, [refreshFavorites]);

  const filtered = useMemo(() => {
    const normalized = normalizeCommand(query);
    if (!normalized) {
      return commandRegistry;
    }
    return commandRegistry.filter((command) => {
      const code = command.code.toUpperCase();
      const label = command.label.toUpperCase();
      return code.includes(normalized) || label.includes(normalized);
    });
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (index: number) => {
    const command = filtered[index];
    if (!command) {
      return;
    }
    navigate(command.route);
    setOpen(false);
  };

  const toggleFavorite = (code: string) => {
    const normalized = normalizeCommand(code);
    const next = favorites.includes(normalized)
      ? favorites.filter((item) => item !== normalized)
      : [...favorites, normalized];
    saveFavorites(next);
    setFavorites(next);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="modal__backdrop" onClick={() => setOpen(false)}>
      <div
        className="modal modal--command"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <div>
            <h3>{t("Command")}</h3>
            <p className="modal__subtitle">{t("Type a T-code or name.")}</p>
          </div>
          <button
            className="modal__close"
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("Close modal")}
          >
            ✕
          </button>
        </div>
        <div className="modal__body">
          <input
            ref={inputRef}
            className="input"
            placeholder={t("Type a T-code or name.")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelectedIndex((prev) =>
                  Math.min(prev + 1, Math.max(filtered.length - 1, 0))
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                handleSelect(selectedIndex);
              }
            }}
          />
          <div className="command-list">
            {filtered.length === 0 && (
              <p className="header__subtitle">{t("No matches")}</p>
            )}
            {filtered.map((command, index) => {
              const isActive = index === selectedIndex;
              const isFavorite = favorites.includes(command.code.toUpperCase());
              return (
                <div
                  key={command.code}
                  className={`command-item ${isActive ? "command-item--active" : ""}`}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div>
                    <strong>{command.code}</strong>
                    <span className="command-item__label">{t(command.label)}</span>
                  </div>
                  <button
                    type="button"
                    className="command-fav"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(command.code);
                    }}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
