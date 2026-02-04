import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

const emitOpen = (query: string) => {
  window.dispatchEvent(
    new CustomEvent("novel-command-open", {
      detail: { query },
    })
  );
};

export const CommandDock = () => {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  useEffect(() => {
    const handler = () => setValue("");
    window.addEventListener("novel-command-close", handler);
    return () => window.removeEventListener("novel-command-close", handler);
  }, []);

  return (
    <div className="command-dock">
      <input
        className="input command-dock__input"
        placeholder={t("Type a T-code or name.")}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          emitOpen(next);
        }}
        onFocus={() => emitOpen(value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            emitOpen(value);
          }
        }}
      />
    </div>
  );
};
