import { ChangeEvent } from "react";

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
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        className="input"
        value={value}
        onChange={handleChange}
        type={type}
        placeholder={placeholder}
      />
    </div>
  );
};
