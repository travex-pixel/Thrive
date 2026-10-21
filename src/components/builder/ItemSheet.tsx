"use client";

import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORIES, UNSORTED } from "@/lib/pack/categories";
import { formatDate, normaliseDateInput } from "@/lib/pack/dates";
import { formatBytes } from "@/lib/download";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";

type Precision = "day" | "month" | "year";

function precisionOf(date: string | null): Precision {
  if (!date) return "day";
  return date.length === 4 ? "year" : date.length === 7 ? "month" : "day";
}

const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-[var(--radius-control)] border border-separator bg-surface px-3 text-[1.0625rem] text-label placeholder:text-label-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

interface ItemSheetProps {
  item: EvidenceItem | null;
  onClose: () => void;
  onSave: (patch: Partial<EvidenceItem>) => void;
  onRemove: () => void;
}

/** Remounts the form per item so its fields always start from that item's values. */
export function ItemSheet(props: ItemSheetProps) {
  if (!props.item) return null;
  return <ItemForm key={props.item.id} {...props} item={props.item} />;
}

function ItemForm({ item, onClose, onSave, onRemove }: ItemSheetProps & { item: EvidenceItem }) {
  const ids = { title: useId(), date: useId(), group: useId() };
  const [title, setTitle] = useState(item.title);
  const [precision, setPrecision] = useState<Precision>(precisionOf(item.date));
  const [dateValue, setDateValue] = useState(item.date ?? "");
  const [category, setCategory] = useState<CategoryId>(item.category);
  const [dateError, setDateError] = useState<string | null>(null);

  const changePrecision = (next: Precision) => {
    setPrecision(next);
    const current = normaliseDateInput(dateValue);
    if (!current) return setDateValue("");
    const [y, m, d] = current.split("-");
    if (next === "year") setDateValue(y);
    else if (next === "month") setDateValue(m ? `${y}-${m}` : "");
    else setDateValue(m && d ? `${y}-${m}-${d}` : "");
  };

  const save = () => {
    const trimmed = title.trim() || item.title;
    const date = dateValue ? normaliseDateInput(dateValue) : null;
    if (dateValue && !date) {
      setDateError("That date doesn’t look right. Try the picker, or clear it.");
      return;
    }
    onSave({
      title: trimmed.slice(0, 120),
      date,
      dateSource: date === item.date ? item.dateSource : date ? "user" : null,
      category,
      suggested: category === item.category ? item.suggested : false,
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="File details"
      footer={
        <div className="flex gap-3">
          <Button variant="danger" onClick={onRemove} aria-label={`Remove ${item.title}`}>
            <Trash2 className="size-5" aria-hidden="true" />
            Remove
          </Button>
          <Button className="flex-1" onClick={save}>
            Save
          </Button>
        </div>
      }
    >
      <p className="truncate text-[0.875rem] text-label-3" title={item.fileName}>
        {item.fileName} · {formatBytes(item.size)}
        {item.pageCount ? ` · ${item.pageCount} ${item.pageCount === 1 ? "page" : "pages"}` : ""}
      </p>

      <label htmlFor={ids.title} className="mt-5 block text-[0.9375rem] font-medium">
        Title
      </label>
      <input
        id={ids.title}
        className={inputClass}
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoComplete="off"
      />
      <p className="mt-1 text-[0.8125rem] text-label-3">Shown on the contents page and in the index, e.g. “Joint account statement”.</p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <label htmlFor={ids.date} className="block text-[0.9375rem] font-medium">
          Date <span className="font-normal text-label-3">(optional)</span>
        </label>
        <SegmentedControl<Precision>
          label="Date precision"
          value={precision}
          onChange={changePrecision}
          options={[
            { value: "day", label: "Day" },
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>
      <div className="flex gap-2">
        {precision === "year" ? (
          <input
            id={ids.date}
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            placeholder="2024"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
        ) : (
          <input
            id={ids.date}
            className={inputClass}
            type={precision === "month" ? "month" : "date"}
            placeholder={precision === "month" ? "YYYY-MM" : "YYYY-MM-DD"}
            value={dateValue}
            onChange={(e) => {
              setDateValue(e.target.value);
              setDateError(null);
            }}
          />
        )}
        {dateValue ? (
          <Button variant="plain" className="mt-1.5" onClick={() => setDateValue("")}>
            Clear
          </Button>
        ) : null}
      </div>
      {dateError ? (
        <p className="mt-1 text-[0.875rem] text-danger" role="alert">
          {dateError}
        </p>
      ) : (
        <p className="mt-1 text-[0.8125rem] text-label-3">
          {item.date ? `Currently ${formatDate(item.date)}${item.dateSource === "exif" ? " (from the photo)" : item.dateSource === "filename" ? " (from the file name)" : ""}.` : "Used to put documents in date order."}
        </p>
      )}

      <label htmlFor={ids.group} className="mt-5 block text-[0.9375rem] font-medium">
        Group
      </label>
      <select id={ids.group} className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
        <option value="unsorted">{UNSORTED.label}</option>
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[0.8125rem] text-label-3">
        {category === "unsorted" ? UNSORTED.description : CATEGORIES.find((c) => c.id === category)?.description}
      </p>
    </Sheet>
  );
}
