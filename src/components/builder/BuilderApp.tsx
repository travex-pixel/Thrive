"use client";

import { ArrowRight, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { bucket, captureRef, track } from "@/lib/analytics";
import { downloadBytes, mimeTypeFor, zipFiles } from "@/lib/download";
import { hasLicense } from "@/lib/license-client";
import { buildPack, BuildError, type BuiltFile } from "@/lib/pack/build";
import { createItem, inspectItem } from "@/lib/pack/inspect";
import { FREE_ITEM_LIMIT, PRICE_LABEL } from "@/lib/pack/limits";
import { isUsable, planPack } from "@/lib/pack/plan";
import { isHeic } from "@/lib/pack/images";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";
import { checkStorage, clearEverything, loadFile, loadWorkspace, removeFile, saveFile, saveWorkspace, type Workspace } from "@/lib/storage";
import { makeThumbnail } from "@/lib/thumbnails";
import { AddStep } from "./AddStep";
import { BuildStep, type CheckoutState } from "./BuildStep";
import { ItemSheet } from "./ItemSheet";
import { SortStep } from "./SortStep";
import { initialState, packSignature, reducer, type Step } from "./state";

/** Loads the heavy libraries in the background so building also works offline. */
function warmUp() {
  void import("pdf-lib");
  void import("@pdf-lib/fontkit");
  void import("fflate");
  void import("@/lib/pack/fonts").then((m) => m.loadFontBytes()).catch(() => undefined);
  void import("@/lib/pack/pdfjs").then((m) => m.loadPdfjs()).catch(() => undefined);
  void fetch("/vendor/pdfjs/pdf.worker.min.mjs").catch(() => undefined);
}

export function BuilderApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [thumbs, setThumbs] = useState<Map<string, string>>(() => new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const [toast, setToast] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<{ item: EvidenceItem; file: Blob }[]>([]);
  const workingRef = useRef(false);
  const initRef = useRef(false);
  const thumbsRef = useRef(thumbs);
  useEffect(() => {
    thumbsRef.current = thumbs;
  }, [thumbs]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 4000);
  }, []);

  /* ---------------------------------------------------------- thumbnails */
  const addThumb = useCallback(async (item: EvidenceItem, file?: Blob) => {
    if (item.kind !== "image" || item.error || thumbsRef.current.has(item.id)) return;
    const blob = file ?? (await loadFile(item.id).catch(() => null));
    if (!blob) return;
    const url = await makeThumbnail(blob, item.fileName);
    if (url) setThumbs((prev) => new Map(prev).set(item.id, url));
  }, []);

  /* -------------------------------------------- background inspect queue */
  const runQueue = useCallback(async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    while (queueRef.current.length > 0) {
      const { item, file } = queueRef.current.shift()!;
      const patch = await inspectItem(item, file).catch(() => ({}) as Partial<EvidenceItem>);
      dispatch({ type: "inspected", id: item.id, patch });
      await addThumb({ ...item, ...patch }, file);
    }
    workingRef.current = false;
  }, [addThumb]);

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    captureRef();
    (async () => {
      const storageOk = await checkStorage();
      const workspace = await loadWorkspace();
      dispatch({ type: "init", items: workspace.items, settings: workspace.settings, storageOk, unlocked: hasLicense() });
      track("builder_opened", { files_bucket: bucket(workspace.items.length), unlocked: hasLicense() });

      const params = new URLSearchParams(window.location.search);
      if (params.get("unlocked") === "1") {
        dispatch({ type: "step", step: "build" });
        showToast("Unlocked. Thank you! Build your pack to download it.");
      } else if (params.get("checkout") === "cancelled") {
        if (workspace.items.length) dispatch({ type: "step", step: "build" });
        showToast("Checkout cancelled. You haven’t been charged.");
      }
      if (params.has("unlocked") || params.has("checkout")) window.history.replaceState(null, "", "/build");

      for (const item of workspace.items) void addThumb(item);
    })();
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(warmUp);
    else window.setTimeout(warmUp, 1500);
  }, [addThumb, showToast]);

  // Thumbnail URLs are revoked on remove/clear. Not on effect cleanup: with Cache Components the
  // route is hidden (not unmounted) on navigation, and the browser frees object URLs on unload anyway.

  /* --------------------------------------------------------- persistence */
  // Save on every change. Writes are serialised and coalesced, so a burst of
  // updates (e.g. background checks finishing) can never starve the last save.
  const saveRef = useRef<{ running: boolean; pending: Workspace | null }>({ running: false, pending: null });
  const queueSave = useCallback((workspace: Workspace) => {
    const s = saveRef.current;
    s.pending = workspace;
    if (s.running) return;
    s.running = true;
    void (async () => {
      while (s.pending) {
        const next = s.pending;
        s.pending = null;
        await saveWorkspace(next).catch(() => undefined);
      }
      s.running = false;
    })();
  }, []);

  useEffect(() => {
    if (state.ready) queueSave({ version: 1, items: state.items, settings: state.settings });
  }, [state.ready, state.items, state.settings, queueSave]);

  /* ------------------------------------------------------------- actions */
  const onFiles = useCallback(
    (files: File[]) => {
      const now = Date.now();
      const items = files.map((f, i) => createItem(f, now + i));
      dispatch({ type: "add", items });
      track("files_added", { count_bucket: bucket(files.length) });
      if (items.some((item) => isHeic(item.fileName, item.mimeType))) void import("heic2any").catch(() => undefined);
      items.forEach((item, i) => {
        void saveFile(item.id, files[i]);
        if (!item.error) queueRef.current.push({ item, file: files[i] });
      });
      void runQueue();
    },
    [runQueue],
  );

  const removeItems = useCallback((ids: string[]) => {
    dispatch({ type: "remove", ids });
    setThumbs((prev) => {
      const next = new Map(prev);
      for (const id of ids) {
        const url = next.get(id);
        if (url) URL.revokeObjectURL(url);
        next.delete(id);
      }
      return next;
    });
    queueRef.current = queueRef.current.filter((q) => !ids.includes(q.item.id));
    ids.forEach((id) => void removeFile(id).catch(() => undefined));
  }, []);

  const usable = useMemo(() => state.items.filter(isUsable), [state.items]);
  const plan = useMemo(() => planPack(state.items, state.settings), [state.items, state.settings]);
  const signature = useMemo(() => packSignature(state.items, state.settings), [state.items, state.settings]);
  const canDownload = state.unlocked || usable.length <= FREE_ITEM_LIMIT;
  const stale = state.build.status === "done" && state.build.signature !== signature;

  const startBuild = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const started = performance.now();
    let lastUpdate = 0;
    dispatch({ type: "buildStart", progress: { done: 0, total: 1, label: "Getting started" } });
    try {
      const result = await buildPack(
        state.items,
        { attachmentLimit: state.settings.attachmentLimit, includeIndex: state.settings.includeIndex, names: state.settings.names.trim() || undefined },
        {
          getFile: loadFile,
          signal: controller.signal,
          onProgress: (progress) => {
            const now = performance.now();
            if (now - lastUpdate > 80 || progress.done >= progress.total) {
              lastUpdate = now;
              dispatch({ type: "buildProgress", progress });
            }
          },
        },
      );
      const seconds = (performance.now() - started) / 1000;
      dispatch({ type: "buildDone", result, signature, seconds });
      track("pack_built", { files_bucket: bucket(usable.length), docs: result.files.length, seconds_bucket: bucket(Math.round(seconds)) });
      if (!(state.unlocked || usable.length <= FREE_ITEM_LIMIT)) track("paywall_shown", { files_bucket: bucket(usable.length) });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        dispatch({ type: "buildReset" });
        return;
      }
      const message =
        error instanceof BuildError
          ? error.message
          : "Something went wrong while building. Your files are safe. Try again, or remove the last files you added.";
      dispatch({ type: "buildError", message });
      track("build_failed");
    }
  }, [signature, state.items, state.settings, state.unlocked, usable.length]);

  const startCheckout = useCallback(async () => {
    setCheckout({ status: "loading" });
    track("checkout_started", { files_bucket: bucket(usable.length) });
    try {
      await saveWorkspace({ version: 1, items: state.items, settings: state.settings }).catch(() => undefined);
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (response.status === 503) track("checkout_unavailable");
      setCheckout({ status: "error", message: data.message ?? "We couldn’t open checkout. Please try again." });
    } catch {
      setCheckout({ status: "error", message: "You seem to be offline. Connect to the internet to pay, then try again." });
    }
  }, [state.items, state.settings, usable.length]);

  const download = useCallback(
    (file: BuiltFile) => {
      if (!canDownload) {
        document.getElementById("unlock-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      downloadBytes(file.bytes, file.fileName, mimeTypeFor(file.fileName));
      track("download_clicked", { kind: "single" });
    },
    [canDownload],
  );

  const downloadAll = useCallback(async () => {
    if (state.build.status !== "done" || !canDownload) return;
    const zip = await zipFiles(state.build.result.files);
    downloadBytes(zip, "LodgeReady evidence pack.zip", "application/zip");
    track("download_clicked", { kind: "zip" });
  }, [canDownload, state.build]);

  const goTo = (step: Step) => {
    dispatch({ type: "step", step });
    window.scrollTo({ top: 0 });
  };

  const editing = state.items.find((i) => i.id === editingId) ?? null;
  const unsortedCount = usable.filter((i) => i.category === "unsorted").length;
  const inspectingCount = state.inspecting.length;

  /* ---------------------------------------------------------- bottom bar */
  type PrimaryAction = "toSort" | "toBuild" | "build" | "downloadAll" | "checkout" | "none";
  let action: PrimaryAction = "none";
  let actionLabel = "";
  let actionDisabled = false;
  let hint = "";
  if (state.step === "add") {
    hint = state.items.length ? `${state.items.length} ${state.items.length === 1 ? "file" : "files"}${inspectingCount ? `, checking ${inspectingCount}…` : ""}` : "No files yet";
    action = "toSort";
    actionLabel = "Continue";
    actionDisabled = usable.length === 0 && inspectingCount === 0;
  } else if (state.step === "sort") {
    hint = unsortedCount ? `${unsortedCount} unsorted` : "All sorted";
    action = "toBuild";
    actionLabel = "Continue";
    actionDisabled = usable.length === 0;
  } else if (state.build.status === "running") {
    hint = "Building on your device…";
    action = "none";
    actionLabel = "Building…";
    actionDisabled = true;
  } else if (state.build.status === "done" && !stale) {
    hint = `${state.build.result.files.length} files ready to upload`;
    action = canDownload ? "downloadAll" : "checkout";
    actionLabel = canDownload ? "Download all" : `Unlock for ${PRICE_LABEL}`;
    actionDisabled = !canDownload && checkout.status === "loading";
  } else {
    hint = inspectingCount > 0 ? `Checking ${inspectingCount} ${inspectingCount === 1 ? "file" : "files"}…` : `${plan.attachmentCount} ${plan.attachmentCount === 1 ? "file" : "files"} to build`;
    action = "build";
    actionLabel = state.build.status === "done" ? "Rebuild pack" : "Build pack";
    actionDisabled = usable.length === 0 || inspectingCount > 0;
  }

  const runPrimary = () => {
    if (action === "toSort") goTo("sort");
    else if (action === "toBuild") goTo("build");
    else if (action === "build") void startBuild();
    else if (action === "downloadAll") void downloadAll();
    else if (action === "checkout") void startCheckout();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-grouped">
      <header className="sticky top-0 z-30 border-b border-separator/70 bg-bg/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <button
            type="button"
            onClick={() => setPrivacyOpen(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-success hover:bg-success-tint"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            On this device
          </button>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-3">
          <SegmentedControl<Step>
            label="Steps"
            value={state.step}
            onChange={goTo}
            options={[
              { value: "add", label: "1  Add" },
              { value: "sort", label: "2  Sort", disabled: state.items.length === 0 },
              { value: "build", label: "3  Build", disabled: usable.length === 0 },
            ]}
          />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-36 pt-6">
        {!state.ready ? (
          <p className="py-20 text-center text-label-3" aria-live="polite">
            Loading your files…
          </p>
        ) : state.step === "add" ? (
          <AddStep
            items={state.items}
            inspecting={state.inspecting}
            thumbs={thumbs}
            storageOk={state.storageOk}
            onFiles={onFiles}
            onRemove={(id) => removeItems([id])}
            onOpenItem={setEditingId}
          />
        ) : state.step === "sort" ? (
          <SortStep
            items={state.items}
            selection={state.selection}
            thumbs={thumbs}
            onMove={(ids, category: CategoryId) => dispatch({ type: "move", ids, category })}
            onSelect={(ids, selected) => dispatch({ type: "select", ids, selected })}
            onClearSelection={() => dispatch({ type: "clearSelection" })}
            onRemove={removeItems}
            onOpenItem={setEditingId}
            onConfirmSuggestions={() =>
              state.items.filter((i) => i.suggested).forEach((i) => dispatch({ type: "update", id: i.id, patch: { suggested: false } }))
            }
          />
        ) : (
          <BuildStep
            plan={plan}
            settings={state.settings}
            build={state.build}
            stale={stale}
            canDownload={canDownload}
            usableCount={usable.length}
            checkout={checkout}
            onSettings={(patch) => dispatch({ type: "settings", patch })}
            onBuild={() => void startBuild()}
            onCancel={() => abortRef.current?.abort()}
            onDownload={download}
            onDownloadAll={() => void downloadAll()}
            onUnlock={() => void startCheckout()}
            onRestore={() => setRestoreOpen(true)}
          />
        )}
      </main>

      {/* Bottom action bar: primary action within thumb reach. */}
      {state.ready && actionLabel ? (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-separator/70 bg-bg/85 pt-3 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4">
            <p className="min-w-0 truncate text-[0.9375rem] text-label-2" aria-live="polite">
              {hint}
            </p>
            <Button size="lg" onClick={runPrimary} disabled={actionDisabled} className="shrink-0">
              {action === "checkout" ? <Lock className="size-5" aria-hidden="true" /> : null}
              {actionLabel}
              {(action === "toSort" || action === "toBuild") && !actionDisabled ? <ArrowRight className="size-5" aria-hidden="true" /> : null}
            </Button>
          </div>
        </div>
      ) : null}

      <ItemSheet
        item={editing}
        onClose={() => setEditingId(null)}
        onSave={(patch) => {
          if (editing) dispatch({ type: "update", id: editing.id, patch });
          setEditingId(null);
        }}
        onRemove={() => {
          if (editing) removeItems([editing.id]);
          setEditingId(null);
        }}
      />

      <Sheet open={privacyOpen} onClose={() => { setPrivacyOpen(false); setConfirmClear(false); }} title="Your files stay on this device">
        <div className="grid grid-cols-1 gap-3 text-[0.9375rem] leading-relaxed text-label-2">
          <p>
            LodgeReady works entirely inside this browser. Your files are never uploaded to us or anyone else. The page’s security
            policy blocks it from sending them anywhere.
          </p>
          <p>
            So you can come back later, your files and labels are saved in this browser’s storage on this device. They’re cleared
            if you tap below, or if you clear your browser data.
          </p>
          <p>The only thing that ever leaves your device is a payment, if you choose to unlock. That goes directly to Stripe.</p>
        </div>
        <div className="mt-5 rounded-2xl bg-surface-2 p-4">
          {confirmClear ? (
            <div className="grid grid-cols-1 gap-3">
              <p className="font-medium">Remove all {state.items.length} files from this browser? This can’t be undone.</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={async () => {
                    abortRef.current?.abort();
                    queueRef.current = [];
                    await clearEverything().catch(() => undefined);
                    thumbs.forEach((url) => URL.revokeObjectURL(url));
                    setThumbs(new Map());
                    dispatch({ type: "clearAll" });
                    setConfirmClear(false);
                    setPrivacyOpen(false);
                    showToast("Everything has been cleared from this browser.");
                  }}
                >
                  <Trash2 className="size-5" aria-hidden="true" /> Yes, clear everything
                </Button>
                <Button variant="plain" onClick={() => setConfirmClear(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmClear(true)} disabled={state.items.length === 0}>
              <Trash2 className="size-5" aria-hidden="true" /> Clear everything from this browser
            </Button>
          )}
        </div>
      </Sheet>

      <RestoreSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} />

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
        {toast ? (
          <p className="animate-sheet-in pointer-events-auto rounded-full bg-label px-5 py-3 text-[0.9375rem] font-medium text-bg shadow-float">{toast}</p>
        ) : null}
      </div>
    </div>
  );
}

function RestoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const submit = () => {
    const match = /session_id=(cs_(?:test|live)_[A-Za-z0-9]+)/.exec(value) ?? /^(cs_(?:test|live)_[A-Za-z0-9]+)$/.exec(value.trim());
    if (!match) {
      setError("That doesn’t look like an unlock link. It should contain “session_id=cs_…”.");
      return;
    }
    router.push(`/unlock?session_id=${encodeURIComponent(match[1])}`);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Restore a purchase">
      <p className="text-[0.9375rem] text-label-2">
        After paying, you were given an unlock link. Paste it here to unlock this browser.
      </p>
      <label htmlFor="restore-link" className="mt-4 block text-[0.9375rem] font-medium">
        Unlock link
      </label>
      <input
        id="restore-link"
        className="mt-1.5 block min-h-11 w-full rounded-[var(--radius-control)] border border-separator bg-surface px-3 text-[1rem] text-label focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        placeholder="https://…/unlock?session_id=cs_…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        autoComplete="off"
        inputMode="url"
      />
      {error ? (
        <p className="mt-1 text-[0.875rem] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button className="mt-4 w-full" size="lg" onClick={submit}>
        Restore
      </Button>
      <p className="mt-4 text-[0.8125rem] text-label-3">
        Lost your link?{" "}
        {supportEmail ? (
          <>
            Email <a className="text-accent underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> with your Stripe receipt and we’ll send a new one.
          </>
        ) : (
          <>Reply to your Stripe receipt email and we’ll send a new one.</>
        )}
      </p>
    </Sheet>
  );
}
