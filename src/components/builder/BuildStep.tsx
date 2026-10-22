"use client";

import {
  CalendarCheck,
  CircleCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Info,
  LoaderCircle,
  Lock,
  RotateCcw,
  Settings2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice, ProgressBar, SegmentedControl, Switch } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import { Sheet } from "@/components/ui/Sheet";
import { UnlockLinkCard } from "@/components/UnlockLinkCard";
import type { BuiltFile, SkippedItem } from "@/lib/pack/build";
import { alreadyUploadedCount } from "@/lib/pack/plan";
import { formatBytes } from "@/lib/download";
import { ADDITIONAL_DOCS_URL, ATTACH_HELP_URL, ATTACHMENT_LIMIT_PRESETS, FREE_ITEM_LIMIT, IMMI_MAX_BYTES, PRICE_LABEL } from "@/lib/pack/limits";
import type { PackPlan } from "@/lib/pack/types";
import type { BuildState, Settings } from "./state";

export type CheckoutState =
  | { status: "idle" }
  | { status: "loading" }
  /** Checkout is open in another tab; this page unlocks itself once payment is confirmed. */
  | { status: "waiting"; checking: boolean }
  | { status: "error"; message: string };

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-[var(--radius-control)] border border-separator bg-surface px-3 text-[1.0625rem] text-label placeholder:text-label-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

const card = "rounded-[var(--radius-card)] bg-surface p-5 shadow-card";

export function BuildStep({
  plan,
  settings,
  build,
  stale,
  canDownload,
  checkout,
  onSettings,
  onBuild,
  onCancel,
  onDownload,
  onDownloadAll,
  onUnlock,
  onCheckPayment,
  onCancelCheckout,
  onRestore,
  onPreview,
  onCheckDates,
  unlockLink,
}: {
  plan: PackPlan;
  settings: Settings;
  build: BuildState;
  stale: boolean;
  canDownload: boolean;
  checkout: CheckoutState;
  onSettings: (patch: Partial<Settings>) => void;
  onBuild: () => void;
  onCancel: () => void;
  onDownload: (file: BuiltFile) => void;
  onDownloadAll: () => void;
  onUnlock: () => void;
  onCheckPayment: () => void;
  onCancelCheckout: () => void;
  onRestore: () => void;
  onPreview: (file: BuiltFile) => void;
  onCheckDates: () => void;
  /** Shown once unlocked, so the buyer can keep it. */
  unlockLink: string | null;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const done = build.status === "done";
  const uploaded = alreadyUploadedCount(settings.startNumber);
  // A pack over the limit is not "ready": attachments can't be removed once added.
  const overLimit =
    build.status === "done" && settings.limitConfirmed && build.result.files.length + uploaded > settings.attachmentLimit;

  // Bring the result into view (and focus) the moment a build finishes.
  useEffect(() => {
    if (done) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      resultsRef.current?.focus({ preventScroll: true });
    }
  }, [done]);

  const limitCheck = plan.needsLimitCheck ? (
    <LimitCheck count={plan.attachmentCount} onSettings={onSettings} />
  ) : null;
  const datesNotice =
    plan.uncheckedDateCount > 0 ? (
      <Notice tone="warning" icon={<CalendarCheck className="size-5 text-warning" aria-hidden="true" />}>
        <p>
          {plan.uncheckedDateCount} {plan.uncheckedDateCount === 1 ? "date hasn’t" : "dates haven’t"} been checked, so{" "}
          {plan.uncheckedDateCount === 1 ? "it isn’t" : "they aren’t"} printed on your PDFs.
        </p>
        <Button variant="plain" className="-ml-4 mt-1" onClick={onCheckDates}>
          Check dates
        </Button>
      </Notice>
    ) : null;

  return (
    <div className="grid grid-cols-1 gap-5">
      {build.status === "done" ? (
        <>
          <section aria-labelledby="results-title" className={card}>
            <div className="flex items-start gap-3">
              {overLimit ? (
                <TriangleAlert className="mt-0.5 size-7 shrink-0 text-danger" aria-hidden="true" />
              ) : build.result.skipped.length > 0 ? (
                <TriangleAlert className="mt-0.5 size-7 shrink-0 text-warning" aria-hidden="true" />
              ) : (
                <CircleCheck className="mt-0.5 size-7 shrink-0 text-success" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <h1 id="results-title" ref={resultsRef} tabIndex={-1} className="text-[1.5rem] font-semibold leading-tight outline-none">
                  {overLimit
                    ? "Over your attachment limit"
                    : build.result.skipped.length > 0
                      ? `Your pack is ready, but ${build.result.skipped.length} ${build.result.skipped.length === 1 ? "file was" : "files were"} left out`
                      : "Your pack is ready"}
                </h1>
                <ResultSummary files={build.result.files} seconds={build.seconds} />
                <div className="mt-1">
                  <AttachmentMeter
                    count={build.result.files.length + uploaded}
                    limit={settings.limitConfirmed ? settings.attachmentLimit : null}
                    uploaded={uploaded}
                  />
                </div>
              </div>
            </div>
            {overLimit ? (
              <OverLimit
                count={build.result.files.length}
                uploaded={uploaded}
                settings={settings}
                onSettings={onSettings}
                onEditSettings={() => setSettingsOpen(true)}
              />
            ) : null}
            {build.result.skipped.length > 0 ? <SkippedList skipped={build.result.skipped} /> : null}
            {stale ? (
              <div className="mt-4">
                <Notice tone="warning" icon={<RotateCcw className="size-5 text-warning" aria-hidden="true" />}>
                  You’ve changed your files or settings since this build, so downloads are paused.{" "}
                  <button type="button" onClick={onBuild} className="font-semibold text-accent underline underline-offset-2">
                    Rebuild
                  </button>{" "}
                  to update the pack.
                </Notice>
              </div>
            ) : null}
          </section>
          {limitCheck}
          {!canDownload ? (
            <Paywall
              itemCount={build.result.itemCount}
              checkout={checkout}
              onUnlock={onUnlock}
              onCheckPayment={onCheckPayment}
              onCancelCheckout={onCancelCheckout}
              onRestore={onRestore}
            />
          ) : null}
          <FileList
            files={build.result.files}
            warnings={build.result.warnings}
            canDownload={canDownload}
            stale={stale}
            onDownload={onDownload}
            onDownloadAll={onDownloadAll}
            onPreview={onPreview}
          />
          {datesNotice}
          {unlockLink ? <UnlockLinkCard link={unlockLink} /> : null}
        </>
      ) : (
        <>
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Build your pack</h1>
            <p className="mt-2 text-label-2">Here’s what you’ll get. Building happens on this device; nothing is uploaded.</p>
          </div>

          {build.status === "running" ? (
            <section aria-live="polite" className={card}>
              <div className="flex items-center gap-3">
                <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden="true" />
                <p className="min-w-0 flex-1 truncate font-medium">{build.progress.label}</p>
                <Button variant="plain" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
              <div className="mt-3">
                <ProgressBar value={build.progress.total ? build.progress.done / build.progress.total : 0} label="Building your pack" />
              </div>
              <p className="mt-3 text-[0.8125rem] text-label-3">
                Working on your device. Keep this tab open and your screen on; big packs can take a few minutes.
              </p>
            </section>
          ) : null}

          {build.status === "error" ? (
            <Notice tone="danger" icon={<TriangleAlert className="size-5 text-danger" aria-hidden="true" />}>
              <p className="font-medium">The pack couldn’t be built.</p>
              <p className="mt-1">{build.message}</p>
              <Button variant="plain" className="-ml-4 mt-1" onClick={onBuild}>
                <RotateCcw className="size-5" aria-hidden="true" />
                Try again
              </Button>
            </Notice>
          ) : null}

          {limitCheck}
          {datesNotice}

          <section aria-labelledby="plan-title" className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 id="plan-title" className="text-[1.0625rem] font-semibold">
                What you’ll get
              </h2>
              <AttachmentMeter count={plan.attachmentCount} limit={settings.limitConfirmed ? plan.attachmentLimit : null} />
            </div>
            <PlanWarnings warnings={plan.warnings} />
            <ul className="mt-3 divide-y divide-separator">
              {plan.docs.map((d) => (
                <li key={d.key} className="flex items-center gap-3 py-2.5">
                  <FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{d.fileName}</span>
                  <span className="shrink-0 text-[0.8125rem] tabular-nums text-label-3">
                    {d.kind === "index" ? "index" : `≈ ${formatBytes(Math.min(d.estimatedBytes, IMMI_MAX_BYTES))}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.8125rem] text-label-3">
              Sizes are estimates until you build. Every file is checked to stay under 5&nbsp;MB.
            </p>
          </section>
        </>
      )}

      <SettingsSummary settings={settings} onEdit={() => setSettingsOpen(true)} />
      <SettingsSheet open={settingsOpen} settings={settings} onSettings={onSettings} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function ResultSummary({ files, seconds }: { files: BuiltFile[]; seconds: number }) {
  const total = files.reduce((n, f) => n + f.size, 0);
  const largest = Math.max(...files.map((f) => f.size));
  return (
    <p className="mt-1 text-[0.9375rem] text-label-2">
      {files.length} {files.length === 1 ? "attachment" : "attachments"}, all under 5&nbsp;MB (largest {formatBytes(largest)}) ·{" "}
      {formatBytes(total)} in total · built in {Math.max(1, Math.round(seconds))}s
    </p>
  );
}

function AttachmentMeter({ count, limit, uploaded = 0 }: { count: number; limit: number | null; uploaded?: number }) {
  const including = uploaded > 0 ? `, including ${uploaded} already uploaded` : "";
  if (limit === null) {
    return (
      <span className="text-[0.875rem] font-medium tabular-nums text-label-3">
        {count} {count === 1 ? "attachment" : "attachments"}
        {including}
      </span>
    );
  }
  const over = count > limit;
  return (
    <span className={cx("text-[0.875rem] font-medium tabular-nums", over ? "text-danger" : "text-label-3")}>
      {count} of {limit} attachments{including}
      {over ? ": over your limit" : ""}
    </span>
  );
}

/** One-tap ways to fit the limit. Mechanical only: which documents to provide is the applicant's call. */
function OverLimit({
  count,
  uploaded,
  settings,
  onSettings,
  onEditSettings,
}: {
  count: number;
  uploaded: number;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onEditSettings: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl bg-danger-tint px-4 py-3" role="alert">
      <p className="text-[0.9375rem]">
        This pack has {count} attachments{uploaded > 0 ? `, plus ${uploaded} you’ve already uploaded,` : ""} and your limit is{" "}
        {settings.attachmentLimit}. Attachments can’t be removed once added, so fix this before you upload.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!settings.compactPhotos ? (
          <Button variant="secondary" onClick={() => onSettings({ compactPhotos: true })}>
            Use smaller photos
          </Button>
        ) : null}
        {settings.includeIndex ? (
          <Button variant="secondary" onClick={() => onSettings({ includeIndex: false })}>
            Leave out the index
          </Button>
        ) : null}
        <Button variant="plain" onClick={onEditSettings}>
          Change the limit
        </Button>
      </div>
      <p className="mt-2 text-[0.8125rem] text-label-2">
        Then rebuild. Home Affairs also has a{" "}
        <a href={ADDITIONAL_DOCS_URL} target="_blank" rel="noreferrer" className="text-accent underline">
          form for documents that don’t fit
        </a>
        .
      </p>
    </div>
  );
}

function SkippedList({ skipped }: { skipped: SkippedItem[] }) {
  return (
    <div className="mt-4 rounded-xl bg-warning-tint px-4 py-3">
      <p className="text-[0.9375rem] font-medium">Not in the pack:</p>
      <ul className="mt-1 grid grid-cols-1 gap-1 text-[0.875rem]" data-testid="skipped">
        {skipped.map((s) => (
          <li key={s.itemId}>
            <span className="font-medium">{s.title}</span>: {s.reason}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.8125rem] text-label-2">Fix these files and add them again, then rebuild.</p>
    </div>
  );
}

/** Asks for the user's own limit instead of assuming one: uploads can't be removed once added. */
function LimitCheck({ count, onSettings }: { count: number; onSettings: (patch: Partial<Settings>) => void }) {
  const [custom, setCustom] = useState("");
  return (
    <section aria-labelledby="limit-check-title" className="rounded-[var(--radius-card)] bg-warning-tint p-5">
      <h2 id="limit-check-title" className="text-[1.0625rem] font-semibold">
        Check your attachment limit
      </h2>
      <p className="mt-1 text-[0.9375rem] text-label-2">
        This pack has {count} attachments. There’s a limit on how many files you can attach for each applicant, and Home
        Affairs’ help says it depends on the application type. Attachments can’t be removed once added, so check yours
        first.{" "}
        <a href={ATTACH_HELP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent underline underline-offset-2">
          Home Affairs: attach documents
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </p>
      <p className="mt-3 text-[0.9375rem] font-medium">My limit is</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {ATTACHMENT_LIMIT_PRESETS.map((n) => (
          <Button key={n} variant="secondary" onClick={() => onSettings({ attachmentLimit: n, limitConfirmed: true })}>
            {n}
          </Button>
        ))}
        <input
          aria-label="Another limit"
          type="number"
          inputMode="numeric"
          min={1}
          max={500}
          placeholder="Other"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className={cx(inputClass, "!mt-0 w-28")}
        />
        <Button
          variant="plain"
          disabled={!(Number(custom) >= 1 && Number(custom) <= 500)}
          onClick={() => onSettings({ attachmentLimit: Math.round(Number(custom)), limitConfirmed: true })}
        >
          Set
        </Button>
      </div>
    </section>
  );
}

function PlanWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="mt-3 grid grid-cols-1 gap-2">
      {warnings.map((w) => (
        <li key={w} className="flex gap-2 rounded-xl bg-warning-tint px-3 py-2 text-[0.875rem]">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          {w}
        </li>
      ))}
    </ul>
  );
}

function Paywall({
  itemCount,
  checkout,
  onUnlock,
  onCheckPayment,
  onCancelCheckout,
  onRestore,
}: {
  itemCount: number;
  checkout: CheckoutState;
  onUnlock: () => void;
  onCheckPayment: () => void;
  onCancelCheckout: () => void;
  onRestore: () => void;
}) {
  return (
    <section aria-labelledby="unlock-title" className="rounded-[var(--radius-card)] bg-surface p-5 shadow-float ring-2 ring-accent sm:p-6">
      <div className="flex items-start gap-3">
        <Lock className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="unlock-title" className="text-[1.25rem] font-semibold leading-snug">
            Download your full pack: {PRICE_LABEL}, one-off
          </h2>
          <p className="mt-1 text-label-2">
            This pack is made from {itemCount} of your documents. Free packs can use up to {FREE_ITEM_LIMIT} documents (any
            number of pages). Unlock once for unlimited documents and rebuilds in this browser.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-1.5 pl-8 text-[0.9375rem] text-label-2">
        <li>• Pay once. No subscription, no account.</li>
        <li>• Changed your mind? Full refund within 30 days, for any reason.</li>
        <li>• Your files still never leave your device.</li>
      </ul>

      {checkout.status === "waiting" ? (
        <div className="mt-5 rounded-xl bg-accent-tint px-4 py-3" role="status">
          <p className="flex items-center gap-2 font-medium">
            <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden="true" />
            Waiting for your payment…
          </p>
          <p className="mt-1 text-[0.9375rem] text-label-2">
            Finish paying in the Stripe tab. This page unlocks by itself, so you won’t need to rebuild.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onCheckPayment} disabled={checkout.checking}>
              {checkout.checking ? "Checking…" : "I’ve paid"}
            </Button>
            <Button variant="plain" onClick={onUnlock}>
              Open checkout again
            </Button>
            <Button variant="plain" onClick={onCancelCheckout}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {checkout.status === "error" ? (
            <p className="mt-4 text-[0.9375rem] text-danger" role="alert">
              {checkout.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={onUnlock} disabled={checkout.status === "loading"} className="sm:flex-1">
              {checkout.status === "loading" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
              {checkout.status === "loading" ? "Opening secure checkout…" : `Unlock for ${PRICE_LABEL}`}
            </Button>
            <Button size="lg" variant="plain" onClick={onRestore}>
              Restore a purchase
            </Button>
          </div>
        </>
      )}
      <p className="mt-3 flex items-start gap-1.5 text-[0.8125rem] text-label-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Secure checkout by Stripe, in a new tab. We never see your card details. By paying you agree to the{" "}
          <Link href="/terms" target="_blank" className="text-accent underline">
            terms
          </Link>
          . LodgeReady is a document tool: it doesn’t check whether your evidence is enough, and isn’t affiliated with Home
          Affairs.
        </span>
      </p>
    </section>
  );
}

function FileList({
  files,
  warnings,
  canDownload,
  stale,
  onDownload,
  onDownloadAll,
  onPreview,
}: {
  files: BuiltFile[];
  warnings: string[];
  canDownload: boolean;
  stale: boolean;
  onDownload: (file: BuiltFile) => void;
  onDownloadAll: () => void;
  onPreview: (file: BuiltFile) => void;
}) {
  const usable = canDownload && !stale;
  return (
    <section aria-labelledby="files-title" className={card}>
      <h2 id="files-title" className="text-[1.0625rem] font-semibold">
        Attachments to upload, in this order
      </h2>
      {!usable ? <p className="mt-1 text-[0.875rem] text-label-3">Tap the eye to preview any of them.</p> : null}
      {warnings.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-xl bg-warning-tint px-3 py-2 text-[0.875rem]">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="mt-2 divide-y divide-separator" data-testid="results">
        {files.map((f) => (
          <li key={f.key} className="flex items-center gap-3 py-2">
            <FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium">{f.fileName}</p>
              <p className="text-[0.8125rem] tabular-nums text-label-3">
                {formatBytes(f.size)}
                {f.pageCount ? ` · ${f.pageCount} ${f.pageCount === 1 ? "page" : "pages"}` : ""}
                {f.entries.length > 1 ? ` · ${f.entries.length} documents` : ""}
                {f.rasterised ? " · some pages re-rendered as images" : ""}
              </p>
            </div>
            {f.fileName.toLowerCase().endsWith(".pdf") ? (
              <Button variant="plain" onClick={() => onPreview(f)} aria-label={`Preview ${f.fileName}`} className="shrink-0">
                <Eye className="size-5" aria-hidden="true" />
              </Button>
            ) : null}
            {usable ? (
              <Button variant="plain" onClick={() => onDownload(f)} aria-label={`Download ${f.fileName}`} className="shrink-0">
                <Download className="size-5" aria-hidden="true" />
              </Button>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-label-3">
                {stale ? <RotateCcw className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                {stale ? "Rebuild" : "Locked"}
              </span>
            )}
          </li>
        ))}
      </ul>
      {usable ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          <Button size="lg" onClick={onDownloadAll} className="w-full sm:w-auto sm:justify-self-start">
            <Download className="size-5" aria-hidden="true" />
            Download all (.zip)
          </Button>
          <p className="text-[0.8125rem] text-label-3">
            ImmiAccount doesn’t accept .zip files, so unzip first and upload the files in number order. Open the index to check
            everything is there before you submit. Already uploaded some files? Don’t upload them again: next time, build only
            the new files and set “First file number” in settings.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SettingsSummary({ settings, onEdit }: { settings: Settings; onEdit: () => void }) {
  const parts = [
    settings.limitConfirmed ? `limit ${settings.attachmentLimit}` : "limit not set",
    settings.includeIndex ? "index on" : "no index",
    settings.compactPhotos ? "smaller photos" : null,
    settings.startNumber > 1 ? `numbering from ${settings.startNumber}` : null,
    settings.names.trim() ? `names: ${settings.names.trim()}` : null,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-separator px-4 py-2">
      <Settings2 className="size-5 shrink-0 text-label-3" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[0.9375rem] text-label-2">
        <span className="font-medium text-label">Settings</span> · {parts.join(" · ")}
      </p>
      <Button variant="plain" onClick={onEdit} className="shrink-0">
        Edit
      </Button>
    </div>
  );
}

function SettingsSheet({
  open,
  settings,
  onSettings,
  onClose,
}: {
  open: boolean;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const namesId = useId();
  const limitId = useId();
  const startId = useId();
  const isPreset = (ATTACHMENT_LIMIT_PRESETS as readonly number[]).includes(settings.attachmentLimit);
  const [customLimit, setCustomLimit] = useState(settings.limitConfirmed && !isPreset);
  const limitChoice = !settings.limitConfirmed ? "unset" : customLimit ? "custom" : String(settings.attachmentLimit);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pack settings"
      footer={
        <Button className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      <p id={limitId} className="text-[0.9375rem] font-medium">
        Attachment limit per applicant
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Attachment limit per applicant"
          value={limitChoice}
          onChange={(v) => {
            if (v === "custom") {
              setCustomLimit(true);
              return onSettings({ limitConfirmed: true });
            }
            setCustomLimit(false);
            onSettings({ attachmentLimit: Number(v), limitConfirmed: true });
          }}
          options={[
            ...ATTACHMENT_LIMIT_PRESETS.map((n) => ({ value: String(n), label: String(n) })),
            { value: "custom", label: "Other" },
          ]}
        />
        {limitChoice === "custom" ? (
          <input
            aria-labelledby={limitId}
            type="number"
            inputMode="numeric"
            min={1}
            max={500}
            value={settings.attachmentLimit}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              if (Number.isFinite(n) && n >= 1 && n <= 500) onSettings({ attachmentLimit: n, limitConfirmed: true });
            }}
            className={cx(inputClass, "!mt-0 w-28")}
          />
        ) : null}
      </div>
      <p className="mt-2 text-[0.8125rem] text-label-3">
        Home Affairs’ help says the limit depends on the application type. Check yours in ImmiAccount before you upload.{" "}
        <a href={ATTACH_HELP_URL} target="_blank" rel="noreferrer" className="text-accent underline">
          Home Affairs: attach documents
        </a>
      </p>
      <div className="mt-4 border-t border-separator pt-3">
        <Switch
          checked={settings.includeIndex}
          onChange={(includeIndex) => onSettings({ includeIndex })}
          label="Add an evidence index"
          description="A first file that lists every document in the pack"
        />
      </div>
      <div className="mt-1 border-t border-separator pt-3">
        <Switch
          checked={settings.compactPhotos}
          onChange={(compactPhotos) => onSettings({ compactPhotos })}
          label="Smaller photos"
          description="Fits about twice as many photos in each file, so the pack needs fewer attachments"
        />
      </div>
      <div className="mt-1 border-t border-separator pt-4">
        <label htmlFor={startId} className="block text-[0.9375rem] font-medium">
          First file number
        </label>
        <input
          id={startId}
          className={cx(inputClass, "w-28")}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={settings.startNumber}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (Number.isFinite(n) && n >= 1 && n <= 999) onSettings({ startNumber: n });
          }}
        />
        <p className="mt-1 text-[0.8125rem] text-label-3">
          Leave at 1 for a new pack. Adding to files you’ve already uploaded (say 00 to 23)? Build only the new files and
          enter 24, so the numbers carry on.
        </p>
      </div>
      <div className="mt-3 border-t border-separator pt-4">
        <label htmlFor={namesId} className="block text-[0.9375rem] font-medium">
          Names on contents pages <span className="font-normal text-label-3">(optional)</span>
        </label>
        <input
          id={namesId}
          className={inputClass}
          placeholder="e.g. Alex Citizen and Sam Lee"
          value={settings.names}
          maxLength={120}
          onChange={(e) => onSettings({ names: e.target.value })}
          autoComplete="off"
        />
      </div>
    </Sheet>
  );
}
