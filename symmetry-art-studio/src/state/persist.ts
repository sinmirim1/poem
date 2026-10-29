/**
 * 브라우저 Local Storage 자동 저장
 * 새로고침하거나 브라우저를 다시 열어도 마지막 작업이 그대로 돌아온다.
 */
import type { AppState } from './store';
import { initialState } from './store';
import { ART_STYLES } from '../data/artStyles';

const KEY = 'symmetry-art-studio:v1';

type Saved = Pick<AppState, 'screen' | 'step' | 'style' | 'doc' | 'desc' | 'settings' | 'drawStyle'>;

export function saveState(s: AppState): boolean {
  const data: Saved = {
    screen: s.screen,
    step: s.step,
    style: s.style,
    doc: s.doc,
    desc: s.desc,
    settings: s.settings,
    drawStyle: s.drawStyle,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false; // 저장 공간이 꽉 찼거나 막혀 있으면 조용히 넘어간다
  }
}

export function loadState(): AppState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const d = JSON.parse(raw) as Partial<Saved>;
    if (!d.doc || !Array.isArray(d.doc.shapes)) return base;
    return {
      ...base,
      screen: d.screen ?? base.screen,
      step: d.step ?? base.step,
      // 없어진 사조(예: 예전의 표현주의)로 저장된 작품은 사조를 다시 고르게 한다
      style: d.style && d.style in ART_STYLES ? d.style : null,
      doc: { ...base.doc, ...d.doc },
      desc: { ...base.desc, ...d.desc },
      settings: { ...base.settings, ...d.settings },
      drawStyle: { ...base.drawStyle, ...d.drawStyle },
    };
  } catch {
    return base;
  }
}

export function hasSavedWork(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as Partial<Saved>;
    return !!d.doc && d.doc.shapes.length > 0;
  } catch {
    return false;
  }
}
