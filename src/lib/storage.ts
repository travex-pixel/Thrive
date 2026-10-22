"use client";

import { createStore, del, delMany, get, set, clear, keys, type UseStore } from "idb-keyval";
import { isCategoryId } from "./pack/categories";
import { DEFAULT_ATTACHMENT_LIMIT } from "./pack/limits";
import type { EvidenceItem, PackSettings } from "./pack/types";

/**
 * Everything is stored in this browser only (IndexedDB). Nothing is sent to a
 * server. If storage is unavailable (some private-browsing modes) the app
 * keeps working in memory and tells the user their work won't be saved.
 */
export interface Workspace {
  version: 1;
  items: EvidenceItem[];
  settings: PackSettings & { names: string; limitConfirmed: boolean };
}

const WORKSPACE_KEY = "workspace";
const fileKey = (id: string) => `file:${id}`;

let store: UseStore | null = null;
let available: boolean | null = null;
const memoryFiles = new Map<string, Blob>();

function getStore(): UseStore | null {
  if (available === false) return null;
  try {
    store ??= createStore("lodgeready", "workspace");
    return store;
  } catch {
    available = false;
    return null;
  }
}

export function defaultWorkspace(): Workspace {
  return {
    version: 1,
    items: [],
    settings: { attachmentLimit: DEFAULT_ATTACHMENT_LIMIT, includeIndex: true, compactPhotos: false, startNumber: 1, names: "", limitConfirmed: false },
  };
}

/**
 * Asks the browser not to clear our storage when space runs low. Browsers decide for themselves (Firefox may ask the
 * user); it never hurts. Safari can still clear data for sites not visited in 7 days.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Returns true if IndexedDB works in this browser session. */
export async function checkStorage(): Promise<boolean> {
  if (available !== null) return available;
  const s = getStore();
  if (!s) return (available = false);
  try {
    await set("__probe", 1, s);
    await del("__probe", s);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

function sanitiseWorkspace(value: unknown): Workspace {
  const fallback = defaultWorkspace();
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Partial<Workspace>;
  const items = Array.isArray(raw.items)
    ? raw.items.filter((i): i is EvidenceItem => Boolean(i && typeof i.id === "string" && typeof i.fileName === "string"))
        .map((i) => ({ ...i, category: isCategoryId(i.category) ? i.category : "unsorted" }))
    : [];
  const settings = { ...fallback.settings, ...(raw.settings ?? {}) };
  if (!Number.isFinite(settings.attachmentLimit) || settings.attachmentLimit < 1) {
    settings.attachmentLimit = DEFAULT_ATTACHMENT_LIMIT;
  }
  settings.includeIndex = settings.includeIndex !== false;
  settings.compactPhotos = settings.compactPhotos === true;
  settings.startNumber = Number.isInteger(settings.startNumber) && settings.startNumber >= 1 && settings.startNumber <= 999 ? settings.startNumber : 1;
  settings.names = typeof settings.names === "string" ? settings.names : "";
  settings.limitConfirmed = settings.limitConfirmed === true;
  return { version: 1, items, settings };
}

export async function loadWorkspace(): Promise<Workspace> {
  if (!(await checkStorage())) return defaultWorkspace();
  try {
    const workspace = sanitiseWorkspace(await get(WORKSPACE_KEY, getStore()!));
    // A file's data may not have finished saving if the tab closed mid-add: flag it clearly.
    const saved = new Set((await keys(getStore()!)).map(String));
    workspace.items = workspace.items.map((item) =>
      saved.has(fileKey(item.id)) || item.error
        ? item
        : { ...item, error: "This file wasn’t fully saved in this browser. Please remove it and add it again." },
    );
    // Delete file data nothing refers to any more (e.g. from a tab that closed before saving its list).
    const wanted = new Set(workspace.items.map((item) => fileKey(item.id)));
    const orphans = [...saved].filter((key) => key.startsWith("file:") && !wanted.has(key));
    if (orphans.length > 0) void delMany(orphans, getStore()!).catch(() => undefined);
    return workspace;
  } catch {
    return defaultWorkspace();
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  if (!(await checkStorage())) return;
  await set(WORKSPACE_KEY, workspace, getStore()!);
}

/** Returns false when the browser wouldn't store the file (usually storage full); it still works until the tab closes. */
export async function saveFile(id: string, file: Blob): Promise<boolean> {
  memoryFiles.set(id, file);
  if (!(await checkStorage())) return false;
  try {
    await set(fileKey(id), file, getStore()!);
    return true;
  } catch {
    // Quota exceeded: keep the in-memory copy so the current session still works.
    return false;
  }
}

export async function loadFile(id: string): Promise<Blob> {
  const cached = memoryFiles.get(id);
  if (cached) return cached;
  if (await checkStorage()) {
    const blob = await get<Blob>(fileKey(id), getStore()!);
    if (blob) {
      memoryFiles.set(id, blob);
      return blob;
    }
  }
  throw new Error("This file is no longer available. Please add it again.");
}

export async function removeFile(id: string): Promise<void> {
  memoryFiles.delete(id);
  if (!(await checkStorage())) return;
  await del(fileKey(id), getStore()!);
}

export async function clearEverything(): Promise<void> {
  memoryFiles.clear();
  if (!(await checkStorage())) return;
  await clear(getStore()!);
}
