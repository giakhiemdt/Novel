export type SchemaFieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "multiselect"
  | "boolean"
  | "date";

export type SchemaField = {
  key: string;
  label: string;
  type: SchemaFieldType;
  required?: boolean;
  options?: string[];
  group?: string;
  order?: number;
  placeholder?: string;
  help?: string;
};

export type EntitySchema = {
  id?: string;
  entity: string;
  title?: string;
  fields: SchemaField[];
  createdAt?: string;
  updatedAt?: string;
};
