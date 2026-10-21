import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-4 py-24 text-center">
        <p className="text-[0.9375rem] font-semibold text-accent">404</p>
        <h1 className="mt-2 text-[2rem] font-semibold">This page doesn’t exist</h1>
        <p className="mt-3 text-label-2">The link may be old or mistyped.</p>
        <ButtonLink href="/" size="lg" className="mt-8">
          Go to the home page
        </ButtonLink>
      </main>
      <SiteFooter />
    </>
  );
}
