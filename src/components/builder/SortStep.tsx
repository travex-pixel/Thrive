"use client";

import { CalendarCheck, ExternalLink, Layers, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { cx } from "@/components/ui/cx";
import { CATEGORIES, UNSORTED, type CategoryDef } from "@/lib/pack/categories";
import { formatDate, isUncheckedDate } from "@/lib/pack/dates";
import { PARTNER_VISA_URL } from "@/lib/pack/limits";
import { sortItems } from "@/lib/pack/plan";
import { DOC_TYPE_ORDER, DOC_TYPES, type DocType } from "@/lib/pack/suggest";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";
import { FileThumb } from "./FileThumb";

const selectClass =
  "min-h-11 w-full rounded-[0.625rem] border border-separator bg-surface px-2.5 text-[0.9375rem] text-label focus:border-accent focus:outline-none sm:w-44";

function GroupSelect({ value, onChange, label }: { value: CategoryId; onChange: (c: CategoryId) => void; label: string }) {
  return (
    <select aria-label={label} className={selectClass} value={value} onChange={(e) => onChange(e.target.value as CategoryId)}>
      <option value="unsorted">Choose a group…</option>
      {CATEGORIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function dateSourceLabel(item: EvidenceItem): string {
  return item.dateSource === "exif" ? "from photo data" : "from file name";
}

/** "15 Mar 2024 · Not checked" for automatic dates; the plain date once the user has confirmed it. */
function DateLine({ item }: { item: EvidenceItem }) {
  if (!item.date) return <span>No date</span>;
  if (!isUncheckedDate(item)) return <span>{formatDate(item.date)}</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span>{formatDate(item.date)}</span>
      <span className="rounded-full bg-warning-tint px-2 text-[0.75rem] font-semibold text-label" title={`Filled in ${dateSourceLabel(item)}`}>
        Not checked
      </span>
    </span>
  );
}

export function SortStep({
  items,
  selection,
  thumbs,
  onMove,
  onSelect,
  onClearSelection,
  onRemove,
  onOpenItem,
  onConfirmDates,
  datesOpen,
  onDatesOpen,
}: {
  items: EvidenceItem[];
  selection: string[];
  thumbs: Map<string, string>;
  onMove: (ids: string[], category: CategoryId) => void;
  onSelect: (ids: string[], selected: boolean) => void;
  onClearSelection: () => void;
  onRemove: (ids: string[]) => void;
  onOpenItem: (id: string) => void;
  onConfirmDates: (ids: string[]) => void;
  /** The "Check dates" sheet; owned by the parent so the Build step can open it too. */
  datesOpen: boolean;
  onDatesOpen: (open: boolean) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const checkingDates = datesOpen;
  const setCheckingDates = onDatesOpen;
  const selected = new Set(selection);
  const usable = items.filter((i) => !i.error);
  const unchecked = sortItems(usable.filter(isUncheckedDate));
  const groups: { def: CategoryDef; items: EvidenceItem[] }[] = [UNSORTED, ...CATEGORIES]
    .map((def) => ({ def, items: sortItems(usable.filter((i) => i.category === def.id)) }))
    .filter((g) => g.items.length > 0);

  // Quick sort: unsorted files, bunched by what their names say they are.
  const unsorted = usable.filter((i) => i.category === "unsorted");
  const byType: { type: DocType | null; items: EvidenceItem[] }[] = [
    ...DOC_TYPE_ORDER.map((type) => ({ type, items: unsorted.filter((i) => i.docType === type) })),
    { type: null, items: unsorted.filter((i) => !i.docType) },
  ].filter((t) => t.items.length > 0);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Sort your files</h1>
        <p className="mt-2 text-label-2">
          Put each file in a group. Each merged group becomes one date-ordered PDF; Identity and Forms keep every file
          separate. You decide what goes where. For what to provide, see{" "}
          <a href={PARTNER_VISA_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-accent underline underline-offset-2">
            Home Affairs’ partner visa guidance
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          .
        </p>
      </div>

      {byType.length > 0 ? (
        <section aria-labelledby="quick-sort-title" className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card sm:p-5">
          <div className="flex items-start gap-3">
            <Layers className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id="quick-sort-title" className="text-[1.0625rem] font-semibold">
                Sort by type
              </h2>
              <p className="text-[0.875rem] text-label-3">
                Grouped by what their file names look like. Choose a group for each type, then check the files below.
              </p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-separator">
            {byType.map(({ type, items: typeItems }) => {
              const label = type ? DOC_TYPES[type].plural : "Couldn’t tell from the name";
              return (
                <li key={type ?? "unknown"} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <p className="min-w-0 flex-1 text-[0.9375rem]">
                    <span className="font-medium">{label}</span>{" "}
                    <span className="tabular-nums text-label-3">{typeItems.length}</span>
                  </p>
                  <select
                    aria-label={`Group for ${label}`}
                    className={selectClass}
                    value=""
                    onChange={(e) => e.target.value && onMove(typeItems.map((i) => i.id), e.target.value as CategoryId)}
                  >
                    <option value="">Move {typeItems.length === 1 ? "it" : `all ${typeItems.length}`} to…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {unchecked.length > 0 ? (
        <Notice tone="warning" icon={<CalendarCheck className="size-5 text-warning" aria-hidden="true" />}>
          <p>
            <strong className="font-semibold">
              {unchecked.length} {unchecked.length === 1 ? "date was" : "dates were"} filled in for you
            </strong>{" "}
            from photo data and file names. They put your files in order, but a date is only printed on your PDFs once
            you’ve checked it.
          </p>
          <Button variant="plain" className="-ml-4 mt-1" onClick={() => setCheckingDates(true)}>
            Check dates
          </Button>
        </Notice>
      ) : null}

      <nav aria-label="Groups" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2 pb-1">
          {groups.map(({ def, items: g }) => (
            <li key={def.id}>
              <a
                href={`#group-${def.id}`}
                className={cx(
                  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium",
                  def.id === "unsorted" ? "bg-warning-tint text-label" : "bg-surface-2 text-label",
                )}
              >
                {def.label}
                <span className="tabular-nums text-label-3">{g.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map(({ def, items: groupItems }) => {
        const allSelected = groupItems.every((i) => selected.has(i.id));
        return (
          <section key={def.id} id={`group-${def.id}`} aria-labelledby={`title-${def.id}`} className="scroll-mt-24">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h2 id={`title-${def.id}`} className="text-[1.25rem] font-semibold">
                  {def.label} <span className="font-normal tabular-nums text-label-3">{groupItems.length}</span>
                </h2>
                <p className="text-[0.875rem] text-label-3">{def.description}</p>
              </div>
              <Button
                variant="plain"
                className="shrink-0 text-[0.9375rem]"
                onClick={() => onSelect(groupItems.map((i) => i.id), !allSelected)}
              >
                {allSelected ? "Deselect" : "Select all"}
              </Button>
            </div>
            <ul className="mt-2 divide-y divide-separator overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card">
              {groupItems.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <li key={item.id} className={cx("flex items-start gap-1 py-2 pr-3 sm:items-center", isSelected && "bg-accent-tint")}>
                    <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center self-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect([item.id], e.target.checked)}
                        className="size-5 accent-[var(--accent-fill)]"
                        aria-label={`Select ${item.title}`}
                      />
                    </label>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <button type="button" onClick={() => onOpenItem(item.id)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl text-left">
                        <FileThumb item={item} url={thumbs.get(item.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-medium">{item.title}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.875rem] text-label-3">
                            <DateLine item={item} />
                            {item.pageCount ? <span>· {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}</span> : null}
                            {item.kind === "passthrough" ? <span>· kept as its own file</span> : null}
                            {item.docType ? <span>· {DOC_TYPES[item.docType].label}</span> : null}
                          </span>
                        </span>
                      </button>
                      <div className="pl-[4.25rem] sm:pl-0">
                        <GroupSelect value={item.category} label={`Group for ${item.title}`} onChange={(c) => onMove([item.id], c)} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {selection.length > 0 ? (
        <div className="sticky bottom-24 z-20 mx-auto flex w-full max-w-xl flex-wrap items-center gap-2 rounded-2xl bg-raised p-2 pl-4 shadow-float ring-1 ring-separator sm:bottom-28">
          <span className="text-[0.9375rem] font-medium tabular-nums">{selection.length} selected</span>
          <select
            aria-label="Move selected files to group"
            className={cx(selectClass, "ml-auto !w-auto")}
            value=""
            onChange={(e) => e.target.value && onMove(selection, e.target.value as CategoryId)}
          >
            <option value="">Move to…</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Button variant="danger" onClick={() => setConfirmRemove(true)} aria-label="Remove selected files">
            <Trash2 className="size-5" aria-hidden="true" />
          </Button>
          <Button variant="plain" onClick={onClearSelection}>
            Done
          </Button>
        </div>
      ) : null}

      {/* HIG: destructive actions on several items need explicit confirmation. */}
      <Sheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove ${selection.length} ${selection.length === 1 ? "file" : "files"}?`}
        footer={
          <div className="flex gap-3">
            <Button variant="plain" className="flex-1" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1 bg-danger-tint"
              onClick={() => {
                onRemove(selection);
                setConfirmRemove(false);
              }}
            >
              <Trash2 className="size-5" aria-hidden="true" />
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-[0.9375rem] text-label-2">
          They’ll be removed from this browser. Your original files on your device aren’t affected, so you can add them again
          any time.
        </p>
      </Sheet>

      <Sheet
        open={checkingDates && unchecked.length > 0}
        onClose={() => setCheckingDates(false)}
        title="Check dates"
        footer={
          <div className="flex gap-3">
            <Button variant="plain" onClick={() => setCheckingDates(false)}>
              Not now
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                onConfirmDates(unchecked.map((i) => i.id));
                setCheckingDates(false);
              }}
            >
              <CalendarCheck className="size-5" aria-hidden="true" />
              {unchecked.length === 1 ? "This date is right" : `All ${unchecked.length} dates are right`}
            </Button>
          </div>
        }
      >
        <p className="text-[0.9375rem] text-label-2">
          These dates come from photo data and file names, and they can be wrong. For example, a photo shared by message often
          carries the day it was saved, not the day it was taken. Dates you confirm are printed on your PDFs. Tap a file to
          change its date.
        </p>
        <ul className="mt-3 divide-y divide-separator">
          {unchecked.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setCheckingDates(false);
                  onOpenItem(item.id);
                }}
                className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
              >
                <FileThumb item={item} url={thumbs.get(item.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className="block text-[0.875rem] text-label-3">
                    <span className="font-medium text-label">{formatDate(item.date)}</span> · {dateSourceLabel(item)}
                  </span>
                </span>
                <span className="shrink-0 text-[0.9375rem] font-medium text-accent">Change</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
