"use client";

import type { ReactNode } from "react";
import { cx } from "./cx";

/** iOS-style switch with a full 44pt hit area and the ARIA switch role. */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span>
        <span className="block text-[1.0625rem]">{label}</span>
        {description ? <span className="block text-[0.875rem] text-label-3">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="inline-flex min-h-11 shrink-0 items-center rounded-full"
      >
        <span className="sr-only">{label}</span>
        {/* Visual track is iOS-sized (51×31); the button around it is the full 44pt hit area. */}
        <span
          aria-hidden="true"
          className={cx(
            "relative inline-flex h-[1.9375rem] w-[3.1875rem] items-center rounded-full transition-colors",
            checked ? "bg-success" : "bg-separator-strong",
          )}
        >
          <span
            className={cx(
              "inline-block size-[1.6875rem] rounded-full bg-white shadow-md transition-transform",
              checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    </label>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full rounded-[0.6875rem] bg-surface-2 p-0.5 sm:w-auto">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cx(
              "min-h-11 flex-1 rounded-[0.5625rem] px-3 text-[0.9375rem] font-medium transition-[background-color,box-shadow] sm:min-w-24",
              selected ? "bg-raised text-label shadow-sm" : "text-label-2 hover:text-label",
              o.disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  icon,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  children: ReactNode;
  icon?: ReactNode;
}) {
  const tones = {
    info: "bg-accent-tint text-label",
    warning: "bg-warning-tint text-label",
    danger: "bg-danger-tint text-label",
    success: "bg-success-tint text-label",
  } as const;
  return (
    <div className={cx("flex gap-3 rounded-2xl px-4 py-3 text-[0.9375rem]", tones[tone])} role={tone === "danger" ? "alert" : undefined}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
