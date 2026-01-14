import type { AnyFieldApi } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FieldProps {
  field: AnyFieldApi;
  label: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

function TextField({
  field,
  label,
  type = "text",
  placeholder,
  disabled,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <Input
        id={field.name}
        type={type}
        value={field.state.value}
        onChange={(e) =>
          field.handleChange(
            type === "number" ? e.target.valueAsNumber : e.target.value,
          )
        }
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="text-xs text-red-500">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </div>
  );
}

function SelectField({
  field,
  label,
  disabled,
}: Omit<FieldProps, "type" | "placeholder">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <select
        id={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        className="w-full p-2 border border-gray-300 rounded-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="text-xs text-red-500">
          {field.state.meta.errors.join(", ")}
        </p>
      )}
    </div>
  );
}

export { TextField, SelectField };
