import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "plain" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold select-none " +
  "transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] " +
  "disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  // HIG: never smaller than 44×44pt.
  md: "min-h-11 min-w-11 px-4 text-[1.0625rem]",
  lg: "min-h-[3.25rem] px-6 text-[1.0625rem]",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent-fill text-on-accent hover:bg-accent-fill-hover",
  secondary: "bg-accent-tint text-accent hover:brightness-95",
  plain: "text-accent hover:bg-accent-tint",
  danger: "text-danger hover:bg-danger-tint",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(base, sizes[size], variants[variant], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
