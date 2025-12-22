import { ChangeEvent } from "react";

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
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <textarea
        className="textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
};
