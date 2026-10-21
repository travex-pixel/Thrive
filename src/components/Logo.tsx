import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent-fill)" />
      <path d="M10 8.5h8.2L22 12.3V22a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 9 22V10a1.5 1.5 0 0 1 1-1.5Z" fill="#fff" opacity=".35" transform="translate(2 -1.5)" />
      <path d="M9.5 9h8.2l3.8 3.8V23a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 8 23V10.5A1.5 1.5 0 0 1 9.5 9Z" fill="#fff" />
      <path d="m11.6 17.4 2.6 2.6 5-5.2" fill="none" stroke="var(--accent-fill)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 font-semibold tracking-tight text-label">
      <LogoMark />
      <span className="text-[1.0625rem]">LodgeReady</span>
    </Link>
  );
}
