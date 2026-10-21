import Link from "next/link";
import { LogoMark } from "./Logo";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-separator bg-grouped">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2 font-semibold">
              <LogoMark className="size-6" />
              LodgeReady
            </div>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-label-3">
              LodgeReady is an independent tool. It isn’t affiliated with the Department of Home Affairs and doesn’t
              give immigration advice. It only organises, converts and compresses the files you choose. For advice, speak
              with a{" "}
              <a
                className="text-accent underline underline-offset-2"
                href="https://www.mara.gov.au/"
                target="_blank"
                rel="noopener noreferrer"
              >
                registered migration agent
              </a>{" "}
              or lawyer.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-1 text-[0.9375rem] sm:flex sm:gap-6">
            <Link className="inline-flex min-h-11 items-center text-label-2 hover:text-label" href="/build">
              Build a pack
            </Link>
            <Link className="inline-flex min-h-11 items-center text-label-2 hover:text-label" href="/fix">
              Fix one file (free)
            </Link>
            <Link className="inline-flex min-h-11 items-center text-label-2 hover:text-label" href="/privacy">
              Privacy
            </Link>
            <Link className="inline-flex min-h-11 items-center text-label-2 hover:text-label" href="/terms">
              Terms &amp; refunds
            </Link>
            {supportEmail ? (
              <a className="inline-flex min-h-11 items-center text-label-2 hover:text-label" href={`mailto:${supportEmail}`}>
                Contact
              </a>
            ) : null}
          </nav>
        </div>
        <p className="mt-8 text-[0.8125rem] text-label-3">Made in Australia. Your files never leave your device.</p>
      </div>
    </footer>
  );
}
