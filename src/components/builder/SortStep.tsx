"use client";

import { Check, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Controls";
import { cx } from "@/components/ui/cx";
import { CATEGORIES, UNSORTED, type CategoryDef } from "@/lib/pack/categories";
import { formatDate } from "@/lib/pack/dates";
import { sortItems } from "@/lib/pack/plan";
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

export function SortStep({
  items,
  selection,
  thumbs,
  onMove,
  onSelect,
  onClearSelection,
  onRemove,
  onOpenItem,
  onConfirmSuggestions,
}: {
  items: EvidenceItem[];
  selection: string[];
  thumbs: Map<string, string>;
  onMove: (ids: string[], category: CategoryId) => void;
  onSelect: (ids: string[], selected: boolean) => void;
  onClearSelection: () => void;
  onRemove: (ids: string[]) => void;
  onOpenItem: (id: string) => void;
  onConfirmSuggestions: () => void;
}) {
  const selected = new Set(selection);
  const usable = items.filter((i) => !i.error);
  const suggestedCount = usable.filter((i) => i.suggested).length;
  const groups: { def: CategoryDef; items: EvidenceItem[] }[] = [UNSORTED, ...CATEGORIES]
    .map((def) => ({ def, items: sortItems(usable.filter((i) => i.category === def.id)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">Sort your files</h1>
        <p className="mt-2 text-label-2">
          Choose a group for each file. Each group becomes one date-ordered PDF. Identity documents and forms stay as separate
          files.
        </p>
      </div>

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

      {suggestedCount > 0 ? (
        <Notice tone="info" icon={<Sparkles className="size-5 text-accent" aria-hidden="true" />}>
          <p>
            We suggested groups for {suggestedCount} {suggestedCount === 1 ? "file" : "files"} based on {suggestedCount === 1 ? "its name" : "their names"}.
            They’re marked <strong className="font-semibold">Suggested</strong>, so check them.
          </p>
          <Button variant="plain" className="-ml-4 mt-1" onClick={onConfirmSuggestions}>
            <Check className="size-5" aria-hidden="true" />
            They look right
          </Button>
        </Notice>
      ) : null}

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
                            <span>{item.date ? formatDate(item.date) : "No date"}</span>
                            {item.pageCount ? <span>· {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}</span> : null}
                            {item.kind === "passthrough" ? <span>· kept as its own file</span> : null}
                            {item.suggested ? (
                              <span className="rounded-full bg-accent-tint px-2 text-[0.75rem] font-semibold text-accent">Suggested</span>
                            ) : null}
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
          <Button variant="danger" onClick={() => onRemove(selection)} aria-label="Remove selected files">
            <Trash2 className="size-5" aria-hidden="true" />
          </Button>
          <Button variant="plain" onClick={onClearSelection}>
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}
