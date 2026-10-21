"use client";

import { useContext } from "react";
import { FormStateContext } from "./form-context";
import { cn } from "@/lib/utils";

type Common = { label?: string; name: string; error?: string; hint?: React.ReactNode; required?: boolean; className?: string };

export function Field({ label, name, error, hint, required, className, children }: Common & { children: React.ReactNode }) {
  const ctx = useContext(FormStateContext);
  error = error ?? ctx?.fieldErrors?.[name];
  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="label">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  name,
  error,
  hint,
  required,
  className,
  ...input
}: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required} className={className}>
      <input id={name} name={name} required={required} aria-invalid={useFieldError(name, error) || undefined} className="input" {...input} />
    </Field>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  required,
  className,
  ...input
}: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required} className={className}>
      <textarea id={name} name={name} required={required} rows={3} aria-invalid={useFieldError(name, error) || undefined} className="input" {...input} />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  required,
  className,
  options,
  placeholder,
  ...input
}: Common &
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Field label={label} name={name} error={error} hint={hint} required={required} className={className}>
      <select id={name} name={name} required={required} aria-invalid={useFieldError(name, error) || undefined} className="input" {...input}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  className,
  ...rest
}: { name: string; label: React.ReactNode; defaultChecked?: boolean; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-sm select-none", className)}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4.5 w-4.5 rounded border-line accent-brand-600"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

function useFieldError(name: string, error?: string): boolean {
  const ctx = useContext(FormStateContext);
  return !!(error ?? ctx?.fieldErrors?.[name]);
}
