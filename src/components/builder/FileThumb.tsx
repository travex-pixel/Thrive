import { File, FileText, FileWarning, Image as ImageIcon } from "lucide-react";
import type { EvidenceItem } from "@/lib/pack/types";

export function FileThumb({ item, url }: { item: EvidenceItem; url?: string | null }) {
  if (item.error) {
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-danger-tint text-danger">
        <FileWarning className="size-6" aria-hidden="true" />
      </span>
    );
  }
  if (item.kind === "image" && url) {
    // eslint-disable-next-line @next/next/no-img-element -- local object URL thumbnails, not remote images
    return <img src={url} alt="" className="size-14 shrink-0 rounded-xl bg-surface-2 object-cover" decoding="async" />;
  }
  const Icon = item.kind === "image" ? ImageIcon : item.kind === "pdf" ? FileText : File;
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-label-3">
      <Icon className="size-6" aria-hidden="true" />
      {item.kind === "pdf" && item.pageCount ? (
        <span className="absolute -bottom-1 -right-1 rounded-full bg-surface px-1.5 text-[0.6875rem] font-semibold tabular-nums text-label-2 ring-1 ring-separator">
          {item.pageCount}p
        </span>
      ) : null}
    </span>
  );
}
