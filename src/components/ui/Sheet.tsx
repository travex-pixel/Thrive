"use client";

import { X } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A native <dialog> presented as a bottom sheet on phones and a centred card
 * on larger screens. Native dialogs give us focus trapping, Escape to close
 * and an accessible modal role for free.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    // If this screen is hidden (e.g. kept in the background after navigating) or unmounted, never leave a modal
    // dialog open: it would make the page the user is now looking at inert.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Tap on the backdrop closes the sheet.
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-label backdrop:animate-fade-in sm:m-auto sm:max-w-lg"
    >
      {open ? (
        <div className="animate-sheet-in max-h-[88dvh] overflow-y-auto rounded-t-[1.5rem] bg-surface shadow-float sm:rounded-[var(--radius-card)]">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface/95 px-5 pb-2 pt-4 backdrop-blur">
            <h2 id={titleId} className="text-[1.25rem] font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-11 items-center justify-center rounded-full text-label-2 hover:bg-surface-2"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="px-5 pb-5">{children}</div>
          {footer ? <div className="pb-safe sticky bottom-0 border-t border-separator bg-surface/95 px-5 pt-3 backdrop-blur">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
