"use client";

import { CircleCheck, Download, FileText, Info, LoaderCircle, Lock, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice, ProgressBar, SegmentedControl, Switch } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import type { BuiltFile } from "@/lib/pack/build";
import { formatBytes } from "@/lib/download";
import { ATTACHMENT_LIMIT_PRESETS, FREE_ITEM_LIMIT, IMMI_MAX_BYTES, PRICE_LABEL } from "@/lib/pack/limits";
import type { PackPlan } from "@/lib/pack/types";
import type { BuildState, Settings } from "./state";

export type CheckoutState = { status: "idle" } | { status: "loading" } | { status: "error"; message: string };

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-[var(--radius-control)] border border-separator bg-surface px-3 text-[1.0625rem] text-label placeholder:text-label-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function BuildStep({
  plan,
  settings,
  build,
  stale,
  canDownload,
  usableCount,
  checkout,
  onSettings,
  onBuild,
  onCancel,
  onDownload,
  onDownloadAll,
  onUnlock,
  onRestore,
}: {
  plan: PackPlan;
  settings: Settings;
  build: BuildState;
  stale: boolean;
  canDownload: boolean;
  usableCount: number;
  checkout: CheckoutState;
  onSettings: (patch: Partial<Settings>) => void;
  onBuild: () => void;
  onCancel: () => void;
  onDownload: (file: BuiltFile) => void;
  onDownloadAll: () => void;
  onUnlock: () => void;
  onRestore: () => void;
}) {
  const namesId = useId();
  const limitId = useId();
  const isPreset = (ATTACHMENT_LIMIT_PRESETS as readonly number[]).includes(settings.attachmentLimit);
  const [customLimit, setCustomLimit] = useState(!isPreset);
  const limitChoice = customLimit ? "custom" : String(settings.attachmentLimit);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Build your pack</h1>
        <p className="mt-2 text-label-2">Check the settings, then build. You’ll see every file before you download.</p>
      </div>

      {/* Settings */}
      <section aria-labelledby="settings-title" className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
        <h2 id="settings-title" className="text-[1.0625rem] font-semibold">
          Settings
        </h2>
        <div className="mt-4">
          <p id={limitId} className="text-[0.9375rem] font-medium">
            Attachment limit per applicant
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Attachment limit per applicant"
              value={limitChoice}
              onChange={(v) => {
                if (v === "custom") return setCustomLimit(true);
                setCustomLimit(false);
                onSettings({ attachmentLimit: Number(v) });
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
                  if (Number.isFinite(n) && n >= 1 && n <= 500) onSettings({ attachmentLimit: n });
                }}
                className={cx(inputClass, "!mt-0 w-28")}
              />
            ) : null}
          </div>
          <p className="mt-2 text-[0.8125rem] text-label-3">
            Home Affairs says the limit depends on the application type. Many guides cite 60, or 100 for partner applications.
            Use what your ImmiAccount shows.
          </p>
        </div>
        <div className="mt-4 border-t border-separator pt-3">
          <Switch
            checked={settings.includeIndex}
            onChange={(includeIndex) => onSettings({ includeIndex })}
            label="Add an evidence index"
            description="A first file that lists every document in the pack"
          />
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
      </section>

      {/* Plan preview (before build) */}
      {build.status !== "done" ? (
        <section aria-labelledby="plan-title" className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="plan-title" className="text-[1.0625rem] font-semibold">
              What you’ll get
            </h2>
            <AttachmentMeter count={plan.attachmentCount} limit={plan.attachmentLimit} />
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
          <p className="mt-3 text-[0.8125rem] text-label-3">Sizes are estimates until you build. Every file is checked to stay under 5 MB.</p>
        </section>
      ) : null}

      {/* Running */}
      {build.status === "running" ? (
        <section aria-live="polite" className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
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
          <p className="mt-3 text-[0.8125rem] text-label-3">Working on your device. Keep this tab open.</p>
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

      {/* Results */}
      {build.status === "done" ? (
        <Results
          files={build.result.files}
          warnings={build.result.warnings}
          seconds={build.seconds}
          limit={settings.attachmentLimit}
          stale={stale}
          canDownload={canDownload}
          onDownload={onDownload}
          onDownloadAll={onDownloadAll}
          onRebuild={onBuild}
        />
      ) : null}

      {/* Paywall */}
      {!canDownload ? (
        <section aria-labelledby="unlock-title" className="rounded-[var(--radius-card)] bg-surface p-6 shadow-float ring-2 ring-accent">
          <div className="flex items-start gap-3">
            <Lock className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <h2 id="unlock-title" className="text-[1.25rem] font-semibold">
                Unlock your full pack: {PRICE_LABEL}, one-off
              </h2>
              <p className="mt-1 text-label-2">
                Your pack has {usableCount} files. Free packs can include up to {FREE_ITEM_LIMIT}. Unlock once for unlimited files and
                rebuilds on this device.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-1.5 pl-8 text-[0.9375rem] text-label-2">
            <li>• Pay once. No subscription, no account.</li>
            <li>• 30-day money-back guarantee.</li>
            <li>• Your files still never leave your device.</li>
          </ul>
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
          <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-label-3">
            <ShieldCheck className="size-4" aria-hidden="true" /> Secure checkout by Stripe. We never see your card details.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function AttachmentMeter({ count, limit }: { count: number; limit: number }) {
  const over = count > limit;
  return (
    <span className={cx("shrink-0 text-[0.875rem] font-medium tabular-nums", over ? "text-danger" : "text-label-2")}>
      {count} of {limit} attachments
    </span>
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

function Results({
  files,
  warnings,
  seconds,
  limit,
  stale,
  canDownload,
  onDownload,
  onDownloadAll,
  onRebuild,
}: {
  files: BuiltFile[];
  warnings: string[];
  seconds: number;
  limit: number;
  stale: boolean;
  canDownload: boolean;
  onDownload: (file: BuiltFile) => void;
  onDownloadAll: () => void;
  onRebuild: () => void;
}) {
  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  const largest = Math.max(...files.map((f) => f.bytes.length));
  return (
    <section aria-labelledby="results-title" className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="results-title" className="text-[1.25rem] font-semibold">
            Your pack is ready
          </h2>
          <p className="text-[0.9375rem] text-label-2">
            {files.length} {files.length === 1 ? "file" : "files"} · {formatBytes(total)} in total · largest {formatBytes(largest)} · built in{" "}
            {Math.max(1, Math.round(seconds))}s
          </p>
        </div>
        <AttachmentMeter count={files.length} limit={limit} />
      </div>

      {stale ? (
        <div className="mt-4">
          <Notice tone="warning" icon={<RotateCcw className="size-5 text-warning" aria-hidden="true" />}>
            You’ve changed your files or settings since this build.{" "}
            <button type="button" onClick={onRebuild} className="font-semibold text-accent underline underline-offset-2">
              Rebuild
            </button>{" "}
            to update the pack.
          </Notice>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-2">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-xl bg-warning-tint px-3 py-2 text-[0.875rem]">
              <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-4 divide-y divide-separator" data-testid="results">
        {files.map((f) => (
          <li key={f.key} className="flex items-center gap-3 py-2">
            <FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium">{f.fileName}</p>
              <p className="text-[0.8125rem] tabular-nums text-label-3">
                {formatBytes(f.bytes.length)}
                {f.pageCount ? ` · ${f.pageCount} ${f.pageCount === 1 ? "page" : "pages"}` : ""}
                {f.entries.length > 1 ? ` · ${f.entries.length} documents` : ""}
              </p>
            </div>
            <Button
              variant="plain"
              onClick={() => onDownload(f)}
              aria-label={canDownload ? `Download ${f.fileName}` : `Unlock to download ${f.fileName}`}
              className="shrink-0"
            >
              {canDownload ? <Download className="size-5" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
            </Button>
          </li>
        ))}
      </ul>

      {canDownload ? (
        <div className="mt-4 grid grid-cols-1 gap-3">
          <Button size="lg" onClick={onDownloadAll} className="w-full sm:w-auto">
            <Download className="size-5" aria-hidden="true" />
            Download all (.zip)
          </Button>
          <p className="text-[0.8125rem] text-label-3">
            ImmiAccount doesn’t accept .zip files, so unzip first and upload the PDFs in number order. Open the index to check
            everything is there before you submit.
          </p>
        </div>
      ) : null}
    </section>
  );
}
