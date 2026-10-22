import type { BuildProgress, BuildResult } from "@/lib/pack/build";
import { DEFAULT_ATTACHMENT_LIMIT } from "@/lib/pack/limits";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";

export type Step = "add" | "sort" | "build";

export interface Settings {
  attachmentLimit: number;
  includeIndex: boolean;
  compactPhotos: boolean;
  startNumber: number;
  names: string;
  /** The user has set their own attachment limit (we never assume one). */
  limitConfirmed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  attachmentLimit: DEFAULT_ATTACHMENT_LIMIT,
  includeIndex: true,
  compactPhotos: false,
  startNumber: 1,
  names: "",
  limitConfirmed: false,
};

export type BuildState =
  | { status: "idle" }
  | { status: "running"; progress: BuildProgress }
  | { status: "done"; result: BuildResult; signature: string; seconds: number }
  | { status: "error"; message: string };

export interface State {
  ready: boolean;
  storageOk: boolean;
  items: EvidenceItem[];
  inspecting: string[];
  settings: Settings;
  step: Step;
  selection: string[];
  build: BuildState;
  unlocked: boolean;
  /** The buyer's unlock link, so they can save it (it restores the unlock in any browser). */
  unlockLink: string | null;
}

export const initialState: State = {
  ready: false,
  storageOk: true,
  items: [],
  inspecting: [],
  settings: DEFAULT_SETTINGS,
  step: "add",
  selection: [],
  build: { status: "idle" },
  unlocked: false,
  unlockLink: null,
};

export type Action =
  | { type: "init"; items: EvidenceItem[]; settings: Settings; storageOk: boolean; unlocked: boolean; inspecting: string[] }
  | { type: "add"; items: EvidenceItem[] }
  | { type: "inspected"; id: string; patch: Partial<EvidenceItem> }
  | { type: "update"; id: string; patch: Partial<EvidenceItem> }
  | { type: "remove"; ids: string[] }
  | { type: "move"; ids: string[]; category: CategoryId }
  | { type: "confirmDates"; ids: string[] }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "step"; step: Step }
  | { type: "select"; ids: string[]; selected: boolean }
  | { type: "clearSelection" }
  | { type: "buildStart"; progress: BuildProgress }
  | { type: "buildProgress"; progress: BuildProgress }
  | { type: "buildDone"; result: BuildResult; signature: string; seconds: number }
  | { type: "buildError"; message: string }
  | { type: "buildReset" }
  | { type: "unlock"; link: string | null }
  | { type: "clearAll" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init":
      return {
        ...state,
        ready: true,
        items: action.items,
        inspecting: action.inspecting,
        settings: action.settings,
        storageOk: action.storageOk,
        unlocked: state.unlocked || action.unlocked,
        step: action.items.length > 0 ? "sort" : "add",
      };
    case "add":
      return {
        ...state,
        items: [...state.items, ...action.items],
        inspecting: [...state.inspecting, ...action.items.filter((i) => !i.inspected).map((i) => i.id)],
      };
    case "inspected":
      return {
        ...state,
        items: state.items.map((i) => {
          if (i.id !== action.id) return i;
          // A date the user set while the file was waiting to be checked always wins over a photo's own date.
          const patch = { ...action.patch };
          if (i.dateSource === "user") {
            delete patch.date;
            delete patch.dateSource;
          }
          return { ...i, ...patch };
        }),
        inspecting: state.inspecting.filter((id) => id !== action.id),
      };
    case "update":
      return { ...state, items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)) };
    case "remove": {
      const ids = new Set(action.ids);
      return {
        ...state,
        items: state.items.filter((i) => !ids.has(i.id)),
        inspecting: state.inspecting.filter((id) => !ids.has(id)),
        selection: state.selection.filter((id) => !ids.has(id)),
      };
    }
    case "move": {
      const ids = new Set(action.ids);
      return {
        ...state,
        items: state.items.map((i) => (ids.has(i.id) ? { ...i, category: action.category } : i)),
        selection: [],
      };
    }
    case "confirmDates": {
      const ids = new Set(action.ids);
      return {
        ...state,
        items: state.items.map((i) => (ids.has(i.id) && i.date ? { ...i, dateSource: "user" } : i)),
      };
    }
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "step":
      return { ...state, step: action.step, selection: [] };
    case "select": {
      const set = new Set(state.selection);
      for (const id of action.ids) {
        if (action.selected) set.add(id);
        else set.delete(id);
      }
      return { ...state, selection: [...set] };
    }
    case "clearSelection":
      return { ...state, selection: [] };
    case "buildStart":
      return { ...state, build: { status: "running", progress: action.progress } };
    case "buildProgress":
      return state.build.status === "running" ? { ...state, build: { status: "running", progress: action.progress } } : state;
    case "buildDone":
      return { ...state, build: { status: "done", result: action.result, signature: action.signature, seconds: action.seconds } };
    case "buildError":
      return { ...state, build: { status: "error", message: action.message } };
    case "buildReset":
      return { ...state, build: { status: "idle" } };
    case "unlock":
      return state.unlocked && state.unlockLink === (action.link ?? state.unlockLink)
        ? state
        : { ...state, unlocked: true, unlockLink: action.link ?? state.unlockLink };
    case "clearAll":
      return { ...initialState, ready: true, storageOk: state.storageOk, unlocked: state.unlocked, unlockLink: state.unlockLink };
    default:
      return state;
  }
}

/** Changes to anything that affects the output invalidate a finished build. */
export function packSignature(items: EvidenceItem[], settings: Settings): string {
  return JSON.stringify([
    items.map((i) => [i.id, i.category, i.title, i.date, i.dateSource, i.error ?? ""]),
    settings.includeIndex,
    settings.compactPhotos,
    settings.startNumber,
    settings.names.trim(),
  ]);
}
