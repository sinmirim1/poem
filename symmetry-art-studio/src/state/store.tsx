/**
 * 앱 전체 상태 저장소 (useReducer + Context)
 *  - doc: 작품 자료. 바뀔 때마다 past에 쌓아 두어 되돌리기/다시 하기를 지원한다.
 *  - 나머지: 화면, 단계, 도구, 설정, 작품 설명 등
 */
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type {
  ArtStyleId,
  Description,
  Doc,
  DrawStyle,
  Screen,
  Settings,
  Step,
  ToolId,
} from '../types';
import { ART_STYLES, DEFAULT_BG } from '../data/artStyles';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'warn';
}

export interface AppState {
  screen: Screen;
  step: Step;
  style: ArtStyleId | null;
  doc: Doc;
  past: Doc[];
  future: Doc[];
  desc: Description;
  settings: Settings;
  drawStyle: DrawStyle;
  tool: ToolId;
  selection: string[];
  multi: boolean;
  activeAxisId: string | null;
  activeCenterId: string | null;
  guideSel: { kind: 'axis' | 'center'; id: string } | null;
  popPreview: boolean;
  toast: Toast | null;
  savedAt: number | null;
  rightOpen: boolean;
}

export const emptyDoc = (): Doc => ({
  shapes: [],
  figures: [],
  axes: [],
  centers: [],
  background: { ...DEFAULT_BG },
  popGrid: 1,
});

export const emptyDesc = (): Description => ({
  name: '',
  klass: '',
  title: '',
  style: '',
  feature: '',
  lineCount: '',
  pointCount: '',
  axisRole: '',
  centerRole: '',
  favorite: '',
});

export const defaultSettings = (): Settings => ({
  grid: true,
  gridSize: 40,
  snapGrid: true,
  snapPoints: true,
  snapAngle: true,
  showCoords: false,
  showAngles: false,
  showAxes: true,
  showCenters: true,
});

export const initialState = (): AppState => ({
  screen: 'home',
  step: 1,
  style: null,
  doc: emptyDoc(),
  past: [],
  future: [],
  desc: emptyDesc(),
  settings: defaultSettings(),
  drawStyle: { stroke: '#222222', fill: '#FFD400', strokeWidth: 4, opacity: 1, lineStyle: 'solid' },
  tool: 'select',
  selection: [],
  multi: false,
  activeAxisId: null,
  activeCenterId: null,
  guideSel: null,
  popPreview: false,
  toast: null,
  savedAt: null,
  rightOpen: false,
});

export type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'step'; step: Step }
  | { type: 'style'; style: ArtStyleId }
  | { type: 'doc'; doc: Doc; record?: boolean; select?: string[] }
  | { type: 'checkpoint' }
  | { type: 'revert' }
  | { type: 'discard' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'select'; ids: string[] }
  | { type: 'tool'; tool: ToolId }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'drawStyle'; patch: Partial<DrawStyle> }
  | { type: 'desc'; patch: Partial<Description> }
  | { type: 'ui'; patch: Partial<Pick<AppState, 'multi' | 'activeAxisId' | 'activeCenterId' | 'guideSel' | 'popPreview' | 'rightOpen'>> }
  | { type: 'toast'; text: string; tone?: Toast['tone'] }
  | { type: 'clearToast'; id: number }
  | { type: 'saved'; at: number }
  | { type: 'load'; state: Partial<AppState> }
  | { type: 'resetWork' };

const HISTORY_LIMIT = 100;
let toastSeq = 0;

const SCREEN_OF_STEP: Record<Step, Screen> = { 1: 'style', 2: 'studio', 3: 'studio', 4: 'describe', 5: 'submit' };

/** 작품이 바뀐 뒤, 없어진 도형·대칭축을 고른 상태로 남지 않게 정리 */
function tidy(state: AppState): AppState {
  const alive = new Set(state.doc.shapes.map((s) => s.id));
  const axisIds = new Set(state.doc.axes.map((a) => a.id));
  const centerIds = new Set(state.doc.centers.map((c) => c.id));
  const selection = state.selection.filter((id) => alive.has(id));
  return {
    ...state,
    selection: selection.length === state.selection.length ? state.selection : selection,
    activeAxisId: state.activeAxisId && axisIds.has(state.activeAxisId) ? state.activeAxisId : null,
    activeCenterId: state.activeCenterId && centerIds.has(state.activeCenterId) ? state.activeCenterId : null,
    guideSel:
      state.guideSel && (state.guideSel.kind === 'axis' ? axisIds : centerIds).has(state.guideSel.id) ? state.guideSel : null,
  };
}

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'go':
      return { ...state, screen: a.screen };
    case 'step': {
      return { ...state, step: a.step, screen: SCREEN_OF_STEP[a.step], popPreview: false };
    }
    case 'style': {
      // 같은 사조를 다시 누르면 학생이 고른 배경을 그대로 둔다.
      if (a.style === state.style) return state;
      // 사조를 바꾸면 배경과 그리기 색을 새 사조의 것으로 바꾼다 (팔레트는 state.style을 따라 바뀐다).
      // 팝아트의 반복 배치는 다른 사조에서는 고칠 곳이 없으므로 한 장으로 되돌린다.
      // 바꾸기 전 배경은 되돌리기로 되살릴 수 있다.
      const st = ART_STYLES[a.style];
      const doc: Doc = {
        ...state.doc,
        background: { ...st.backgrounds[0].bg },
        popGrid: a.style === 'pop' ? state.doc.popGrid : 1,
      };
      return {
        ...state,
        style: a.style,
        drawStyle: { ...st.defaults },
        doc,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
        popPreview: false,
      };
    }
    case 'doc': {
      const next: AppState = {
        ...state,
        doc: a.doc,
        past: a.record ? [...state.past, state.doc].slice(-HISTORY_LIMIT) : state.past,
        future: a.record ? [] : state.future,
        selection: a.select ?? state.selection,
      };
      return tidy(next);
    }
    case 'checkpoint':
      return { ...state, past: [...state.past, state.doc].slice(-HISTORY_LIMIT), future: [] };
    case 'revert': {
      if (!state.past.length) return state;
      return tidy({ ...state, doc: state.past[state.past.length - 1], past: state.past.slice(0, -1) });
    }
    case 'discard':
      return state.past.length ? { ...state, past: state.past.slice(0, -1) } : state;
    case 'undo': {
      if (!state.past.length) return state;
      return tidy({
        ...state,
        doc: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.doc, ...state.future],
      });
    }
    case 'redo': {
      if (!state.future.length) return state;
      return tidy({ ...state, doc: state.future[0], future: state.future.slice(1), past: [...state.past, state.doc] });
    }
    case 'select':
      return { ...state, selection: a.ids, guideSel: a.ids.length ? null : state.guideSel };
    case 'tool':
      return { ...state, tool: a.tool };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'drawStyle':
      return { ...state, drawStyle: { ...state.drawStyle, ...a.patch } };
    case 'desc':
      return { ...state, desc: { ...state.desc, ...a.patch } };
    case 'ui':
      return { ...state, ...a.patch };
    case 'toast':
      return { ...state, toast: { id: ++toastSeq, text: a.text, tone: a.tone ?? 'info' } };
    case 'clearToast':
      return state.toast?.id === a.id ? { ...state, toast: null } : state;
    case 'saved':
      return { ...state, savedAt: a.at };
    case 'load':
      return tidy({ ...state, ...a.state });
    case 'resetWork':
      return {
        ...initialState(),
        screen: 'style',
        settings: state.settings,
        toast: { id: ++toastSeq, text: '작품을 처음 상태로 비웠어요.', tone: 'info' },
      };
  }
}

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children, init }: { children: ReactNode; init: () => AppState }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider 안에서만 쓸 수 있어요');
  return v;
}
