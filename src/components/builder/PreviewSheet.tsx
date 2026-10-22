"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import type { BuiltFile } from "@/lib/pack/build";

/** While locked, a preview shows the contents page and the first pages; the index is just a list, so it's shown in full. */
const LOCKED_PAGES = 3;
const UNLOCKED_PAGES = 8;
const INDEX_PAGES = 12;

interface PageImage {
  url: string;
  label: string;
}

export function PreviewSheet({ file, locked, onClose }: { file: BuiltFile | null; locked: boolean; onClose: () => void }) {
  if (!file) return null;
  return <PreviewBody key={file.key} file={file} locked={locked} onClose={onClose} />;
}

function PreviewBody({ file, locked, onClose }: { file: BuiltFile; locked: boolean; onClose: () => void }) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [failed, setFailed] = useState(false);
  const isPdf = file.fileName.toLowerCase().endsWith(".pdf");
  const total = file.pageCount ?? 0;
  const watermark = locked && file.kind !== "index";
  const limit = Math.min(total, file.kind === "index" ? INDEX_PAGES : locked ? LOCKED_PAGES : UNLOCKED_PAGES);

  useEffect(() => {
    if (!isPdf || limit === 0) return;
    let cancelled = false;
    const urls: string[] = [];
    void (async () => {
      const { closePdf, openWithPdfjs, rasterisePage } = await import("@/lib/pack/pdfjs");
      const pdf = await openWithPdfjs(new Uint8Array(await file.blob.arrayBuffer()));
      try {
        for (let n = 1; n <= limit && !cancelled; n++) {
          const page = await rasterisePage(pdf, n, 80, 0.7);
          const url = URL.createObjectURL(new Blob([page.jpeg as BlobPart], { type: "image/jpeg" }));
          urls.push(url);
          if (!cancelled) setPages((prev) => [...prev, { url, label: `Page ${n} of ${total}` }]);
        }
      } finally {
        await closePdf(pdf);
      }
    })().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [file, isPdf, limit, total]);

  const summary = !isPdf
    ? "Word, Excel and text files go into the pack exactly as you added them, so there’s nothing new to preview."
    : watermark
      ? `The first ${limit} of ${total} ${total === 1 ? "page" : "pages"}. Unlock to download the whole file.`
      : total > limit
        ? `The first ${limit} of ${total} pages. Download the file to see them all.`
        : `${total} ${total === 1 ? "page" : "pages"}.`;

  return (
    <Sheet open onClose={onClose} title="Preview">
      <p className="break-all text-[0.9375rem] font-medium">{file.fileName}</p>
      <p className="mt-1 text-[0.875rem] text-label-3">{summary}</p>
      {failed ? (
        <p className="mt-4 text-[0.9375rem] text-danger" role="alert">
          This preview couldn’t be shown on this device.
        </p>
      ) : isPdf ? (
        <ul className="mt-4 grid grid-cols-1 gap-3">
          {pages.map((page) => (
            <li key={page.url} className="relative overflow-hidden rounded-xl bg-white ring-1 ring-separator">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL of a rendered page */}
              <img src={page.url} alt={page.label} className="block w-full" />
              {watermark ? (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="select-none text-[3.5rem] font-bold text-black/10" style={{ transform: "rotate(-30deg)" }}>
                    PREVIEW
                  </span>
                </span>
              ) : null}
            </li>
          ))}
          {pages.length < limit ? (
            <li className="flex items-center gap-2 py-6 text-[0.9375rem] text-label-3" aria-live="polite">
              <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden="true" />
              Showing page {pages.length + 1} of {limit}…
            </li>
          ) : null}
        </ul>
      ) : null}
    </Sheet>
  );
}
