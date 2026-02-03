import { ChangeEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
};

export const TextArea = ({
  label,
  value,
  onChange,
  placeholder,
  required,
}: TextAreaProps) => {
  const { t } = useI18n();
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="form-field">
      <label>
        {t(label)}
        {required && <span className="required">*</span>}
      </label>
      <textarea
        className="textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ? t(placeholder) : undefined}
      />
    </div>
  );
};
