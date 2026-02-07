import { ChangeEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type SelectOption = {
  label: string;
  value?: string;
};

export type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: SelectProps) => {
  const { t } = useI18n();
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="form-field">
      <label>
        {t(label)}
        {required && <span className="required">*</span>}
      </label>
      <select
        className="select"
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="">{t(placeholder ?? "Select")}</option>
        {options.map((option, index) => (
          <option
            key={`${option.value ?? option.label}-${index}`}
            value={option.value ?? ""}
          >
            {t(option.label)}
          </option>
        ))}
      </select>
    </div>
  );
};
