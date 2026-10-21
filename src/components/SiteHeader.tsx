import Link from "next/link";
import { Logo } from "./Logo";
import { ButtonLink } from "./ui/Button";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-separator/70 bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-[0.9375rem] text-label-2 hover:text-label"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <ButtonLink href="/build" size="md" className="px-4 text-[0.9375rem]">
          Build my pack
        </ButtonLink>
      </div>
    </header>
  );
}
