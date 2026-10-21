"use client";

import { FolderOpen, HardDrive, LoaderCircle, Lock, Plus, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import { formatBytes } from "@/lib/download";
import { formatDate } from "@/lib/pack/dates";
import { ACCEPT_ATTRIBUTE } from "@/lib/pack/limits";
import type { EvidenceItem } from "@/lib/pack/types";
import { FileThumb } from "./FileThumb";

const IGNORED = /^(\.ds_store|thumbs\.db|desktop\.ini)$|^\._/i;

export function AddStep({
  items,
  inspecting,
  thumbs,
  storageOk,
  onFiles,
  onRemove,
  onOpenItem,
}: {
  items: EvidenceItem[];
  inspecting: string[];
  thumbs: Map<string, string>;
  storageOk: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onOpenItem: (id: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // Not in React's typings; set directly. Supported by all modern desktop browsers.
    folderInput.current?.setAttribute("webkitdirectory", "");
  }, []);

  const accept = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list).filter((f) => !IGNORED.test(f.name));
    if (files.length) onFiles(files);
  };

  const inspectingSet = new Set(inspecting);
  const errors = items.filter((i) => i.error).length;
  const totalBytes = items.reduce((n, i) => n + i.size, 0);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Add your evidence</h1>
        <p className="mt-2 text-label-2">
          Add everything at once: statements, leases, bills, photos, screenshots, forms. You’ll sort them next.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={cx(
          "rounded-[var(--radius-card)] border-2 border-dashed p-6 text-center transition-colors sm:p-10",
          dragging ? "border-accent bg-accent-tint" : "border-separator-strong bg-surface",
        )}
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent-tint text-accent">
          <Plus className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-4 text-[1.1875rem] font-semibold">Drop files here</p>
        <p className="mt-1 text-[0.9375rem] text-label-3">PDF, JPG, PNG, HEIC, WEBP, Word and more. Add as many as you like.</p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent-fill px-6 text-[1.0625rem] font-semibold text-on-accent transition-transform hover:bg-accent-fill-hover active:scale-[0.98]"
          >
            <Plus className="size-5" aria-hidden="true" />
            Choose files
          </button>
          <button
            type="button"
            onClick={() => folderInput.current?.click()}
            className="hidden min-h-[3.25rem] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent-tint px-6 text-[1.0625rem] font-semibold text-accent transition-transform active:scale-[0.98] sm:inline-flex"
          >
            <FolderOpen className="size-5" aria-hidden="true" />
            Choose a folder
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          data-testid="file-input"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            accept(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {storageOk ? (
        <p className="flex items-start gap-2 text-[0.875rem] text-label-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          Files stay on this device. They’re saved in this browser so you can come back later, and are never uploaded.
        </p>
      ) : (
        <Notice tone="warning" icon={<HardDrive className="size-5 text-warning" aria-hidden="true" />}>
          This browser isn’t letting LodgeReady save files (private browsing can do this). Everything still works, but your
          files will be cleared if you close this tab.
        </Notice>
      )}

      {items.length > 0 ? (
        <section aria-labelledby="added-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="added-title" className="text-[1.25rem] font-semibold">
              {items.length} {items.length === 1 ? "file" : "files"} added
            </h2>
            <span className="text-[0.875rem] tabular-nums text-label-3">{formatBytes(totalBytes)}</span>
          </div>
          {errors > 0 ? (
            <p className="mt-1 text-[0.875rem] text-danger">
              {errors} {errors === 1 ? "file needs" : "files need"} attention. {errors === 1 ? "It" : "They"} won’t be included.
            </p>
          ) : null}
          <ul className="mt-3 divide-y divide-separator overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card" aria-live="polite">
            {[...items].reverse().map((item) => {
              const checking = inspectingSet.has(item.id);
              return (
                <li key={item.id} className="flex items-center gap-3 py-2 pl-3 pr-1">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item.id)}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left"
                  >
                    <FileThumb item={item} url={thumbs.get(item.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className={cx("block truncate text-[0.875rem]", item.error ? "text-danger" : "text-label-3")}>
                        {item.error ??
                          [
                            formatBytes(item.size),
                            item.pageCount ? `${item.pageCount} ${item.pageCount === 1 ? "page" : "pages"}` : null,
                            item.date ? formatDate(item.date) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                      </span>
                    </span>
                  </button>
                  {checking ? (
                    <span className="inline-flex items-center gap-1 text-[0.8125rem] text-label-3" aria-label="Checking file">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    </span>
                  ) : item.encrypted ? (
                    <span title="Locked PDF: will be re-rendered as a clean copy" className="text-label-3">
                      <Lock className="size-4" aria-label="Locked PDF" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.title}`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-label-3 hover:bg-surface-2 hover:text-label"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
