import { ChangeEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  required?: boolean;
};

export const TextInput = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: TextInputProps) => {
  const { t } = useI18n();
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="form-field">
      <label>
        {t(label)}
        {required && <span className="required">*</span>}
      </label>
      <input
        className="input"
        value={value}
        onChange={handleChange}
        type={type}
        placeholder={placeholder ? t(placeholder) : undefined}
      />
    </div>
  );
};
