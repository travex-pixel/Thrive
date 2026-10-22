"use client";

import { ArrowRight, Lock, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/Controls";
import { Sheet } from "@/components/ui/Sheet";
import { analyticsHost, bucket, captureRef, track } from "@/lib/analytics";
import { downloadBlob, zipToBlob } from "@/lib/download";
import { hasLicense, onLicenseStored, storeLicense } from "@/lib/license-client";
import { buildPack, BuildError, type BuiltFile } from "@/lib/pack/build";
import { createItem, inspectItem } from "@/lib/pack/inspect";
import { FREE_ITEM_LIMIT, PRICE_LABEL } from "@/lib/pack/limits";
import { isUsable, planPack } from "@/lib/pack/plan";
import { isHeic } from "@/lib/pack/images";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";
import {
  checkStorage,
  clearEverything,
  loadFile,
  loadWorkspace,
  removeFile,
  requestPersistence,
  saveFile,
  saveWorkspace,
  type Workspace,
} from "@/lib/storage";
import { claimWorkspace, type WorkspaceClaim } from "@/lib/tabs";
import { makeThumbnail } from "@/lib/thumbnails";
import { AddStep } from "./AddStep";
import { BuildStep, type CheckoutState } from "./BuildStep";
import { ItemSheet } from "./ItemSheet";
import { SortStep } from "./SortStep";
import { initialState, packSignature, reducer, type Step } from "./state";

/** Loads the heavy code in the background so building also works offline once the page has loaded. */
function warmUp() {
  void import("pdf-lib");
  void import("@pdf-lib/fontkit");
  void import("exifr");
  void import("@/lib/pack/fonts").then((m) => m.loadFontBytes()).catch(() => undefined);
  void import("@/lib/pack/pdfjs").then((m) => m.warmPdfjs()).catch(() => undefined);
  // Safari opens iPhone photos itself; other browsers need the converter.
  const safari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  if (!safari) void import("heic2any").catch(() => undefined);
}

/** Decodes photo thumbnails a couple at a time: decoding is memory-hungry on phones. */
class ThumbnailQueue {
  private queue: { item: EvidenceItem; file?: Blob }[] = [];
  private seen = new Set<string>();
  private active = 0;

  constructor(private readonly onThumb: (id: string, url: string) => void) {}

  add(item: EvidenceItem, file?: Blob) {
    if (item.kind !== "image" || item.error || this.seen.has(item.id)) return;
    this.seen.add(item.id);
    this.queue.push({ item, file });
    this.pump();
  }

  clear() {
    this.queue = [];
    this.seen.clear();
  }

  private pump() {
    while (this.active < 2 && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.active++;
      void this.run(next).finally(() => {
        this.active--;
        this.pump();
      });
    }
  }

  private async run({ item, file }: { item: EvidenceItem; file?: Blob }) {
    const blob = file ?? (await loadFile(item.id).catch(() => null));
    const url = blob ? await makeThumbnail(blob, item.fileName) : null;
    if (url) this.onThumb(item.id, url);
  }
}

/** A background check that hangs (e.g. a decoder that can't load offline) must never block building. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

const POLL_MS = 5000;
const POLL_FOR_MS = 30 * 60_000;

export function BuilderApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [thumbs, setThumbs] = useState<Map<string, string>>(() => new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>({ status: "idle" });
  const [toast, setToast] = useState<string | null>(null);
  const [unsavedCount, setUnsavedCount] = useState(0);
  const [lost, setLost] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const queueRef = useRef<{ item: EvidenceItem; file?: Blob }[]>([]);
  const workingRef = useRef(false);
  const initRef = useRef(false);
  const lostRef = useRef(false);
  const claimRef = useRef<WorkspaceClaim | null>(null);
  const persistAskedRef = useRef(false);
  const pendingSessionRef = useRef<{ id: string; since: number } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 4000);
  }, []);

  /* ---------------------------------------------------------- thumbnails */
  const [thumbQueue] = useState(() => new ThumbnailQueue((id, url) => setThumbs((prev) => new Map(prev).set(id, url))));
  const addThumb = useCallback((item: EvidenceItem, file?: Blob) => thumbQueue.add(item, file), [thumbQueue]);

  /* -------------------------------------------- background inspect queue */
  const runQueue = useCallback(async () => {
    if (workingRef.current) return;
    workingRef.current = true;
    while (queueRef.current.length > 0) {
      const { item, file } = queueRef.current.shift()!;
      const blob = file ?? (await loadFile(item.id).catch(() => null));
      const patch: Partial<EvidenceItem> = blob
        ? await withTimeout(inspectItem(item, blob), 20_000, { inspected: true })
        : { inspected: true };
      dispatch({ type: "inspected", id: item.id, patch });
      if (blob) addThumb({ ...item, ...patch }, file);
    }
    workingRef.current = false;
  }, [addThumb]);

  /* --------------------------------------------------------- persistence */
  // Save on every change. Writes are serialised and coalesced, so a burst of
  // updates (e.g. background checks finishing) can never starve the last save.
  const saveRef = useRef<{ running: Promise<void> | null; pending: Workspace | null }>({ running: null, pending: null });
  const queueSave = useCallback((workspace: Workspace) => {
    if (lostRef.current) return; // another tab owns the saved workspace now
    const s = saveRef.current;
    s.pending = workspace;
    if (s.running) return;
    s.running = (async () => {
      while (s.pending) {
        const next = s.pending;
        s.pending = null;
        await saveWorkspace(next).catch(() => undefined);
      }
      s.running = null;
    })();
  }, []);
  const flushSaves = useCallback(async () => {
    while (saveRef.current.running) await saveRef.current.running;
  }, []);

  useEffect(() => {
    if (state.ready) queueSave({ version: 1, items: state.items, settings: state.settings });
  }, [state.ready, state.items, state.settings, queueSave]);

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    captureRef();
    (async () => {
      claimRef.current = await claimWorkspace(() => {
        // Another tab has opened LodgeReady: finish our last save, then step aside.
        lostRef.current = true;
        abortRef.current?.abort();
        void flushSaves().then(() => claimRef.current?.flushed());
        setLost(true);
      });
      const storageOk = await checkStorage();
      const workspace = await loadWorkspace();
      // Files whose background check never finished (e.g. the page closed) are checked again.
      const unchecked = workspace.items.filter((i) => !i.inspected && !i.error);
      dispatch({
        type: "init",
        items: workspace.items,
        settings: workspace.settings,
        storageOk,
        unlocked: hasLicense(),
        inspecting: unchecked.map((i) => i.id),
      });
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

      for (const item of workspace.items) addThumb(item);
      queueRef.current.push(...unchecked.map((item) => ({ item })));
      void runQueue();
    })();
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(warmUp);
    else window.setTimeout(warmUp, 1500);
  }, [addThumb, flushSaves, runQueue, showToast]);

  // Pick up an unlock made in another tab (checkout or restore), and whenever this page is shown again.
  useEffect(() => {
    const sync = () => {
      if (hasLicense()) dispatch({ type: "unlock" });
    };
    sync();
    const stop = onLicenseStored(sync);
    window.addEventListener("focus", sync);
    return () => {
      stop();
      window.removeEventListener("focus", sync);
    };
  }, []);

  // Thumbnail URLs are revoked on remove/clear. Not on effect cleanup: with Cache Components the
  // route is hidden (not unmounted) on navigation, and the browser frees object URLs on unload anyway.

  /* ------------------------------------------------------------- actions */
  const onFiles = useCallback(
    (files: File[]) => {
      const now = Date.now();
      const items = files.map((f, i) => createItem(f, now + i));
      dispatch({ type: "add", items });
      track("files_added", { count_bucket: bucket(files.length) });
      if (items.some((item) => isHeic(item.fileName, item.mimeType))) void import("heic2any").catch(() => undefined);
      if (!persistAskedRef.current) {
        persistAskedRef.current = true;
        void requestPersistence();
      }
      void Promise.all(items.map((item, i) => saveFile(item.id, files[i]))).then(async (results) => {
        const failed = results.filter((ok) => !ok).length;
        if (failed > 0 && (await checkStorage())) {
          setUnsavedCount((n) => n + failed);
          showToast(`${failed} ${failed === 1 ? "file" : "files"} couldn’t be saved in this browser. They work until you close this tab.`);
        }
      });
      items.forEach((item, i) => {
        if (!item.inspected) queueRef.current.push({ item, file: files[i] });
      });
      void runQueue();
    },
    [runQueue, showToast],
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
  const stale = state.build.status === "done" && state.build.signature !== signature;
  // Judged on the pack that was actually built, never on the current list.
  const canDownload = state.build.status === "done" && (state.unlocked || state.build.result.itemCount <= FREE_ITEM_LIMIT);

  const startBuild = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const current = () => abortRef.current === controller;
    const started = performance.now();
    let lastUpdate = 0;
    let wakeLock: WakeLockSentinel | null = null;
    try {
      wakeLock = await navigator.wakeLock?.request("screen");
    } catch {
      // Not supported or not allowed: the progress note asks people to keep the screen on.
    }
    dispatch({ type: "buildStart", progress: { done: 0, total: 1, label: "Getting started" } });
    try {
      const result = await buildPack(
        state.items,
        {
          attachmentLimit: state.settings.attachmentLimit,
          includeIndex: state.settings.includeIndex,
          compactPhotos: state.settings.compactPhotos,
          startNumber: state.settings.startNumber,
          names: state.settings.names.trim() || undefined,
        },
        {
          getFile: loadFile,
          signal: controller.signal,
          onProgress: (progress) => {
            const now = performance.now();
            if (current() && (now - lastUpdate > 80 || progress.done >= progress.total)) {
              lastUpdate = now;
              dispatch({ type: "buildProgress", progress });
            }
          },
        },
      );
      if (!current()) return;
      const seconds = (performance.now() - started) / 1000;
      dispatch({ type: "buildDone", result, signature, seconds });
      track("pack_built", { files_bucket: bucket(result.itemCount), docs: bucket(result.files.length), seconds_bucket: bucket(Math.round(seconds)) });
      if (!(state.unlocked || result.itemCount <= FREE_ITEM_LIMIT)) track("paywall_shown", { files_bucket: bucket(result.itemCount) });
    } catch (error) {
      if (!current()) return; // a newer build (or Clear everything) has taken over
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
    } finally {
      void wakeLock?.release().catch(() => undefined);
    }
  }, [signature, state.items, state.settings, state.unlocked]);

  /* ------------------------------------------------------------ checkout */
  const unlockWith = useCallback(
    (token: string, sessionId: string) => {
      storeLicense(token, `${window.location.origin}/unlock?session_id=${encodeURIComponent(sessionId)}`);
      pendingSessionRef.current = null;
      dispatch({ type: "unlock" });
      setCheckout({ status: "idle" });
      showToast("Unlocked. Thank you! Your downloads are ready.");
    },
    [showToast],
  );

  const checkPayment = useCallback(async () => {
    const pending = pendingSessionRef.current;
    if (!pending) return;
    setCheckout({ status: "waiting", checking: true });
    try {
      const res = await fetch(`/api/verify?session_id=${encodeURIComponent(pending.id)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (res.ok && data.token) return unlockWith(data.token, pending.id);
    } catch {
      // offline: try again later
    }
    if (pendingSessionRef.current) setCheckout({ status: "waiting", checking: false });
  }, [unlockWith]);

  // While checkout is open in another tab, check for the payment whenever this tab is visible.
  // An unlock that arrives another way (the checkout tab, a restore) ends the wait.
  const checkoutState: CheckoutState = state.unlocked && checkout.status === "waiting" ? { status: "idle" } : checkout;
  const waiting = checkoutState.status === "waiting";
  useEffect(() => {
    if (!waiting) return;
    const tick = () => {
      const pending = pendingSessionRef.current;
      if (!pending || Date.now() - pending.since > POLL_FOR_MS) return;
      if (document.visibilityState === "visible") void checkPayment();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [waiting, checkPayment]);

  const startCheckout = useCallback(async () => {
    track("checkout_started", { files_bucket: bucket(usable.length) });
    // Open the tab straight away (inside the tap) so pop-up blockers allow it. Paying in another tab keeps
    // this one, and the built pack, exactly as it is.
    const tab = window.open("", "_blank");
    if (tab) {
      try {
        tab.opener = null;
        tab.document.title = "Opening secure checkout…";
        tab.document.body.textContent = "Opening secure checkout…";
      } catch {
        // cosmetic only
      }
    }
    setCheckout({ status: "loading" });
    try {
      await flushSaves();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: tab ? "tab" : "redirect" }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; id?: string; message?: string };
      if (response.ok && data.url && data.id) {
        if (tab && !tab.closed) {
          tab.location.href = data.url;
          pendingSessionRef.current = { id: data.id, since: Date.now() };
          setCheckout({ status: "waiting", checking: false });
          return;
        }
        // Pop-ups blocked: pay in this tab. Files are saved in this browser, so the pack can be rebuilt after.
        window.location.assign(data.url);
        return;
      }
      tab?.close();
      if (response.status === 503 || response.status === 403) track("checkout_unavailable", { result: String(response.status) });
      setCheckout({ status: "error", message: data.message ?? "We couldn’t open checkout. Please try again." });
    } catch {
      tab?.close();
      setCheckout({ status: "error", message: "You seem to be offline. Connect to the internet to pay, then try again." });
    }
  }, [flushSaves, usable.length]);

  /* ------------------------------------------------------------ downloads */
  const download = useCallback(
    (file: BuiltFile) => {
      if (!canDownload || stale) return;
      downloadBlob(file.blob, file.fileName);
      track("download_clicked", { kind: "single" });
    },
    [canDownload, stale],
  );

  const downloadAll = useCallback(async () => {
    if (state.build.status !== "done" || !canDownload || stale) return;
    try {
      const zip = await zipToBlob(state.build.result.files);
      downloadBlob(zip, "LodgeReady_evidence_pack.zip");
      track("download_clicked", { kind: "zip" });
    } catch {
      showToast("The .zip couldn’t be made on this device. Download the files one by one instead.");
    }
  }, [canDownload, showToast, stale, state.build]);

  const goTo = (step: Step) => {
    dispatch({ type: "step", step });
    window.scrollTo({ top: 0 });
  };

  const editing = state.items.find((i) => i.id === editingId) ?? null;
  const unsortedCount = usable.filter((i) => i.category === "unsorted").length;
  const inspectingCount = state.inspecting.length;

  /* ---------------------------------------------------------- bottom bar */
  type PrimaryAction = "toSort" | "toBuild" | "build" | "downloadAll" | "checkout" | "checkPayment" | "none";
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
    hint = unsortedCount ? `${unsortedCount} not in a group` : "All in groups";
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
    if (canDownload) {
      action = "downloadAll";
      actionLabel = "Download all";
    } else if (checkoutState.status === "waiting") {
      action = "checkPayment";
      actionLabel = checkoutState.checking ? "Checking…" : "I’ve paid";
      actionDisabled = checkoutState.checking;
    } else {
      action = "checkout";
      actionLabel = `Unlock for ${PRICE_LABEL}`;
      actionDisabled = checkoutState.status === "loading";
    }
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
    else if (action === "checkPayment") void checkPayment();
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
            unsavedCount={unsavedCount}
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
            onConfirmDates={(ids) => dispatch({ type: "confirmDates", ids })}
            datesOpen={datesOpen}
            onDatesOpen={setDatesOpen}
          />
        ) : (
          <BuildStep
            plan={plan}
            settings={state.settings}
            build={state.build}
            stale={stale}
            canDownload={canDownload}
            checkout={checkoutState}
            onSettings={(patch) => dispatch({ type: "settings", patch })}
            onBuild={() => void startBuild()}
            onCancel={() => abortRef.current?.abort()}
            onDownload={download}
            onDownloadAll={() => void downloadAll()}
            onUnlock={() => void startCheckout()}
            onCheckPayment={() => void checkPayment()}
            onRestore={() => setRestoreOpen(true)}
            onCheckDates={() => {
              goTo("sort");
              setDatesOpen(true);
            }}
          />
        )}
        <p className="mt-10 text-[0.8125rem] leading-relaxed text-label-3">
          LodgeReady is a document tool. It doesn’t give immigration advice, doesn’t check whether your evidence is enough, and
          isn’t affiliated with the Department of Home Affairs.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms and refunds
          </Link>
        </p>
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
          <p>LodgeReady works inside this browser. Your files are never uploaded, and never sent to us.</p>
          <p>
            The page can only connect to this site{analyticsHost ? " and our anonymous statistics service, which never receives file names or contents" : ""}.
            Check it yourself: once this page has loaded, turn on Airplane mode. Building still works.
          </p>
          <p>
            So you can come back later, your files are saved in this browser on this device until you clear them. Safari may
            clear a site’s saved files if you don’t visit for 7 days, so keep your originals. On a shared computer, clear
            everything when you’re done.
          </p>
          <p>Paying goes through Stripe’s secure checkout. We never see your card details.</p>
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
                    abortRef.current = null;
                    queueRef.current = [];
                    thumbQueue.clear();
                    await clearEverything().catch(() => undefined);
                    thumbs.forEach((url) => URL.revokeObjectURL(url));
                    setThumbs(new Map());
                    setUnsavedCount(0);
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

      {lost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-grouped/95 p-6 backdrop-blur" role="alertdialog" aria-labelledby="lost-title">
          <div className="max-w-md rounded-[var(--radius-card)] bg-surface p-6 text-center shadow-float">
            <h2 id="lost-title" className="text-[1.25rem] font-semibold">
              LodgeReady is open in another tab
            </h2>
            <p className="mt-2 text-[0.9375rem] text-label-2">
              To keep your files safe, only one tab can make changes at a time. Carry on in the other tab, or use this one
              instead.
            </p>
            <Button size="lg" className="mt-5 w-full" onClick={() => window.location.reload()}>
              Use this tab instead
            </Button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
        {toast ? (
          <p className="animate-sheet-in pointer-events-auto rounded-full bg-label px-5 py-3 text-[0.9375rem] font-medium text-bg shadow-float">{toast}</p>
        ) : null}
      </div>
    </div>
  );
}

function RestoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const submit = () => {
    const match = /session_id=(cs_(?:test|live)_[A-Za-z0-9]+)/.exec(value) ?? /^(cs_(?:test|live)_[A-Za-z0-9]+)$/.exec(value.trim());
    if (!match) {
      setError("That doesn’t look like an unlock link. It should contain “session_id=cs_…”.");
      return;
    }
    onClose();
    // A full page load on purpose: a client-side navigation would keep this builder alive in the background (Cache
    // Components), so it would never re-read the unlock. The unlock page sends you back to a freshly loaded builder.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/unlock?session_id=${encodeURIComponent(match[1])}&restore=1`;
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
