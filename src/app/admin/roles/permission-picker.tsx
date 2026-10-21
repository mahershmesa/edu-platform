"use client";

import { useState } from "react";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Permission checkboxes grouped by section, with a per-group "select all". Submits as `permissions` entries. */
export function PermissionPicker({ defaultSelected = [], disabled = false }: { defaultSelected?: string[]; disabled?: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));
  const total = PERMISSION_GROUPS.reduce((n, g) => n + g.perms.length, 0);

  const toggle = (perm: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(perm)) n.delete(perm);
      else n.add(perm);
      return n;
    });
  const toggleGroup = (perms: readonly (readonly [string, string])[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const [p] of perms) {
        if (on) n.add(p);
        else n.delete(p);
      }
      return n;
    });

  return (
    <div>
      <p className="label">
        الصلاحيات ({selected.size}/{total})
      </p>
      {[...selected].map((p) => (
        <input key={p} type="hidden" name="permissions" value={p} />
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => {
          const all = g.perms.every(([p]) => selected.has(p));
          const some = !all && g.perms.some(([p]) => selected.has(p));
          return (
            <fieldset key={g.key} className={cn("rounded-xl border p-3", all ? "border-brand-300 bg-brand-50/40" : "border-line")}>
              <label className="flex cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={all}
                  ref={(el) => {
                    if (el) el.indeterminate = some;
                  }}
                  disabled={disabled}
                  onChange={(e) => toggleGroup(g.perms, e.target.checked)}
                />
                {g.label}
              </label>
              <div className="mt-2 space-y-1.5 pr-6">
                {g.perms.map(([p, label]) => (
                  <label key={p} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={selected.has(p)}
                      disabled={disabled}
                      onChange={() => toggle(p)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
