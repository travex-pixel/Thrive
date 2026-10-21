import type { BuildProgress, BuildResult } from "@/lib/pack/build";
import { DEFAULT_ATTACHMENT_LIMIT } from "@/lib/pack/limits";
import type { CategoryId, EvidenceItem } from "@/lib/pack/types";

export type Step = "add" | "sort" | "build";

export interface Settings {
  attachmentLimit: number;
  includeIndex: boolean;
  names: string;
}

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
}

export const initialState: State = {
  ready: false,
  storageOk: true,
  items: [],
  inspecting: [],
  settings: { attachmentLimit: DEFAULT_ATTACHMENT_LIMIT, includeIndex: true, names: "" },
  step: "add",
  selection: [],
  build: { status: "idle" },
  unlocked: false,
};

export type Action =
  | { type: "init"; items: EvidenceItem[]; settings: Settings; storageOk: boolean; unlocked: boolean }
  | { type: "add"; items: EvidenceItem[] }
  | { type: "inspected"; id: string; patch: Partial<EvidenceItem> }
  | { type: "update"; id: string; patch: Partial<EvidenceItem> }
  | { type: "remove"; ids: string[] }
  | { type: "move"; ids: string[]; category: CategoryId }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "step"; step: Step }
  | { type: "select"; ids: string[]; selected: boolean }
  | { type: "clearSelection" }
  | { type: "buildStart"; progress: BuildProgress }
  | { type: "buildProgress"; progress: BuildProgress }
  | { type: "buildDone"; result: BuildResult; signature: string; seconds: number }
  | { type: "buildError"; message: string }
  | { type: "buildReset" }
  | { type: "unlock" }
  | { type: "clearAll" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "init":
      return {
        ...state,
        ready: true,
        items: action.items,
        settings: action.settings,
        storageOk: action.storageOk,
        unlocked: action.unlocked,
        step: action.items.length > 0 ? "sort" : "add",
      };
    case "add":
      return {
        ...state,
        items: [...state.items, ...action.items],
        inspecting: [...state.inspecting, ...action.items.filter((i) => !i.error).map((i) => i.id)],
      };
    case "inspected":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
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
        items: state.items.map((i) => (ids.has(i.id) ? { ...i, category: action.category, suggested: false } : i)),
        selection: [],
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
      return { ...state, unlocked: true };
    case "clearAll":
      return { ...initialState, ready: true, storageOk: state.storageOk, unlocked: state.unlocked };
    default:
      return state;
  }
}

/** Changes to anything that affects the output invalidate a finished build. */
export function packSignature(items: EvidenceItem[], settings: Settings): string {
  return JSON.stringify([
    items.map((i) => [i.id, i.category, i.title, i.date, i.error ?? "", i.pageCount ?? 0, i.encrypted ?? false]),
    settings.includeIndex,
    settings.names.trim(),
  ]);
}
