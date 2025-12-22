import { KeyboardEvent, useState } from "react";
import { Button } from "../common/Button";

export type MultiSelectProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  required?: boolean;
};

export const MultiSelect = ({
  label,
  values,
  onChange,
  placeholder,
  required,
}: MultiSelectProps) => {
  const [inputValue, setInputValue] = useState("");

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
    if (event.key === "Enter") {
      event.preventDefault();
      addValue();
    }
  };

  const removeValue = (value: string) => {
    onChange(values.filter((item) => item !== value));
  };

  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          className="input"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <Button type="button" variant="ghost" onClick={addValue}>
          Add
        </Button>
      </div>
      <div className="pill-list">
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
      </div>
    </div>
  );
};
