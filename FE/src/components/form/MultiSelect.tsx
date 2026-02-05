import { KeyboardEvent, useState } from "react";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";

export type MultiSelectProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  required?: boolean;
  showAddButton?: boolean;
};

export const MultiSelect = ({
  label,
  values,
  onChange,
  placeholder,
  required,
  showAddButton = false,
}: MultiSelectProps) => {
  const [inputValue, setInputValue] = useState("");
  const { t } = useI18n();

  const addValue = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || values.includes(trimmed)) {
      setInputValue("");
      return;
    }
    onChange([...values, trimmed]);
    setInputValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      event.preventDefault();
      addValue();
    }
  };

  const handleBlur = () => {
    addValue();
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className="form-field">
      <label>
        {t(label)}
        {required && <span className="required">*</span>}
      </label>
      <div className="multi-select">
        <div className="multi-select__control">
          {values.map((value) => (
            <button
              type="button"
              key={value}
              className="pill"
              onClick={() => removeValue(value)}
            >
              {value} ✕
            </button>
          ))}
          <input
            className="multi-select__input"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={t(placeholder ?? "Type and press Enter")}
          />
        </div>
        {showAddButton && (
          <Button type="button" variant="ghost" onClick={addValue}>
            {t("Add")}
          </Button>
        )}
      </div>
    </div>
  );
};
