import { Search } from "lucide-react";
import { buttonClass } from "./button";

/**
 * GET form for list pages. Pass extra filter <select>s as children; they submit with the form.
 */
export function SearchBar({
  placeholder = "ابحث...",
  defaultValue,
  children,
  label = "البحث",
}: {
  placeholder?: string;
  defaultValue?: string;
  children?: React.ReactNode;
  label?: string;
}) {
  return (
    <form className="card mb-5 flex flex-wrap items-end gap-3 p-4" role="search">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="q" className="label">
          {label}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input id="q" name="q" defaultValue={defaultValue} placeholder={placeholder} className="input pr-9" />
        </div>
      </div>
      {children}
      <button type="submit" className={buttonClass("primary", "md", "min-w-24")}>
        <Search className="h-4 w-4" /> بحث
      </button>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="min-w-[160px]">
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue} className="input">
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
