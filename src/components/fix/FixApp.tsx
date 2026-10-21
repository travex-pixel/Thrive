"use client";

import { ArrowRight, CircleCheck, Download, FileText, LoaderCircle, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Notice, ProgressBar } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import { captureRef, track } from "@/lib/analytics";
import { downloadBytes, formatBytes } from "@/lib/download";
import { BuildError, fixSingleFile, type FixedFile } from "@/lib/pack/build";
import { isHeic } from "@/lib/pack/images";
import { createItem, inspectItem } from "@/lib/pack/inspect";
import { IMMI_MAX_BYTES } from "@/lib/pack/limits";

type Status =
  | { state: "idle" }
  | { state: "working"; label: string; fileName: string }
  | { state: "done"; original: { name: string; size: number }; outputs: FixedFile[]; notes: string[] }
  | { state: "error"; message: string };

export function FixApp() {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [dragging, setDragging] = useState(false);

  useEffect(() => captureRef(), []);

  const run = async (file: File) => {
    setStatus({ state: "working", label: "Checking your file", fileName: file.name });
    try {
      let item = createItem(file, Date.now());
      if (item.error) throw new BuildError(item.error);
      if (item.kind === "passthrough") {
        if (file.size <= IMMI_MAX_BYTES) {
          setStatus({ state: "done", original: { name: file.name, size: file.size }, outputs: [], notes: ["This file type is accepted by ImmiAccount and it’s already under 5 MB, so no changes are needed."] });
          return;
        }
        throw new BuildError("Office files over 5 MB can’t be shrunk here. Save it as a PDF and drop the PDF in instead.");
      }
      item = { ...item, ...(await inspectItem(item, file)) };
      if (item.error) throw new BuildError(item.error);
      const outputs = await fixSingleFile(item, file, {
        onProgress: (p) => setStatus({ state: "working", label: p.label, fileName: file.name }),
      });
      const notes: string[] = [];
      if (isHeic(file.name, file.type)) notes.push("Converted the iPhone HEIC photo to JPG, a format ImmiAccount accepts.");
      if (item.kind === "image" && !isHeic(file.name, file.type)) notes.push("Optimised the photo and fixed its rotation.");
      if (item.encrypted) notes.push("This PDF was locked or unusual, so it was re-rendered as a clean copy. It looks the same, but the text can’t be selected.");
      if (outputs.length > 1) notes.push(`It was too big for one upload, so it’s been split into ${outputs.length} parts, each under 5 MB.`);
      if (item.kind === "pdf" && !item.encrypted && outputs.length === 1 && outputs[0].bytes.length === file.size) {
        notes.push("This PDF was already under 5 MB and unlocked. It’s ready to upload as it is.");
      }
      setStatus({ state: "done", original: { name: file.name, size: file.size }, outputs, notes });
      track("fixer_used", { kind: item.kind, result: "ok" });
    } catch (error) {
      const message = error instanceof BuildError ? error.message : "That file couldn’t be processed. Try saving it again as a PDF or JPG.";
      setStatus({ state: "error", message });
      track("fixer_used", { result: "error" });
    }
  };

  const onFiles = (list: FileList | null) => {
    const file = list?.[0];
    if (file) void run(file);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={cx(
          "rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-accent bg-accent-tint" : "border-separator-strong bg-surface",
        )}
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-tint text-accent">
          <Plus className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[1.1875rem] font-semibold">Drop one file here</p>
        <p className="mt-1 text-[0.9375rem] text-label-3">A PDF or a photo (JPG, PNG, HEIC, WEBP). It never leaves your device.</p>
        <Button size="lg" className="mt-6" onClick={() => input.current?.click()} disabled={status.state === "working"}>
          Choose a file
        </Button>
        <input
          ref={input}
          type="file"
          accept=".pdf,application/pdf,image/*,.heic,.heif"
          className="hidden"
          data-testid="fix-input"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div aria-live="polite">
        {status.state === "working" ? (
          <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate font-medium">{status.label}</p>
            </div>
            <div className="mt-3">
              <ProgressBar value={0.5} label="Fixing your file" />
            </div>
          </div>
        ) : null}

        {status.state === "error" ? (
          <Notice tone="danger" icon={<TriangleAlert className="size-5 text-danger" aria-hidden="true" />}>
            {status.message}
          </Notice>
        ) : null}

        {status.state === "done" ? (
          <div className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
              <CircleCheck className="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-[1.25rem] font-semibold">Ready for ImmiAccount</h2>
                <p className="truncate text-[0.9375rem] text-label-3">
                  {status.original.name} · was {formatBytes(status.original.size)}
                </p>
              </div>
            </div>
            {status.notes.length ? (
              <ul className="mt-3 grid grid-cols-1 gap-1.5 text-[0.9375rem] text-label-2">
                {status.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            ) : null}
            {status.outputs.length ? (
              <ul className="mt-4 divide-y divide-separator" data-testid="fix-results">
                {status.outputs.map((o) => (
                  <li key={o.fileName} className="flex items-center gap-3 py-2">
                    <FileText className="size-5 shrink-0 text-accent" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium">{o.fileName}</p>
                      <p className="text-[0.8125rem] tabular-nums text-label-3">{formatBytes(o.bytes.length)}</p>
                    </div>
                    <Button variant="secondary" onClick={() => downloadBytes(o.bytes, o.fileName, o.mimeType)} aria-label={`Download ${o.fileName}`}>
                      <Download className="size-5" aria-hidden="true" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-[var(--radius-card)] bg-accent-tint p-5">
        <p className="font-semibold">Got dozens of files?</p>
        <p className="mt-1 text-[0.9375rem] text-label-2">
          The pack builder sorts everything into date-ordered PDFs with contents pages and an index, all under 5 MB.
        </p>
        <ButtonLink href="/build" className="mt-4" variant="primary">
          Build a whole pack
          <ArrowRight className="size-5" aria-hidden="true" />
        </ButtonLink>
      </div>
      <p className="flex items-center gap-2 text-[0.875rem] text-label-3">
        <ShieldCheck className="size-4 text-success" aria-hidden="true" />
        Processed in your browser. Nothing is uploaded.
      </p>
    </div>
  );
}
