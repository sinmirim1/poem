/**
 * 도구 모음·속성 패널·단축키가 함께 쓰는 동작들
 */
import { useMemo } from 'react';
import type { Shape, Vec } from '../../types';
import { useStore } from '../../state/store';
import {
  addShapes,
  deleteShapes,
  duplicateShapes,
  editShapes,
  groupCenter,
  linkedGroup,
  makeSymmetric,
  moveGroup,
  reorder,
  rotateGroup,
  scaleGroup,
  styleShapes,
} from '../../state/ops';
import { PAPER, PAPER_CENTER, shapeCenter, translateShape } from '../../geometry/shapes';
import { add, centroid, sub, vec } from '../../geometry/vec';
import { checkFigure, countFigures, figTitle } from '../../geometry/symmetry';
import { uid } from '../../utils/id';

export function useActions() {
  const { state, dispatch } = useStore();

  return useMemo(() => {
    const { doc, selection, settings } = state;
    const toast = (text: string, tone: 'info' | 'good' | 'warn' = 'info') => dispatch({ type: 'toast', text, tone });
    const setDoc = (d: typeof doc, select?: string[]) => dispatch({ type: 'doc', doc: d, record: true, select });
    const needSelection = (what: string) => {
      if (selection.length) return true;
      toast(`${what} 도형을 먼저 눌러서 골라 주세요.`, 'info');
      return false;
    };

    /** 대칭 도형을 만든 뒤 진행 상황을 알려 준다 */
    const announce = (nextDoc: typeof doc, title: string) => {
      const c = countFigures(nextDoc, settings.gridSize);
      const more: string[] = [];
      if (c.line < 3) more.push(`선대칭 ${3 - c.line}개`);
      if (c.point < 3) more.push(`점대칭 ${3 - c.point}개`);
      toast(`${title}를 만들었어요! ${more.length ? `앞으로 ${more.join(', ')} 더 만들면 돼요.` : '대칭 도형 조건을 모두 채웠어요! 🎉'}`, 'good');
    };

    const mirror = (type: 'line' | 'point') => {
      if (!needSelection(type === 'line' ? '선대칭 복사할' : '점대칭 복사할')) return;
      let ref: { axis?: [Vec, Vec]; center?: Vec } = {};
      if (type === 'line') {
        const ax = doc.axes.find((a) => a.id === state.activeAxisId) ?? (doc.axes.length === 1 ? doc.axes[0] : null);
        if (!ax) {
          toast(doc.axes.length ? '사용할 대칭축을 한 번 눌러서 골라 주세요.' : '먼저 대칭축을 놓아 주세요. "세로 대칭축"이나 "가로 대칭축" 버튼을 눌러 보세요.', 'warn');
          return;
        }
        ref = { axis: [ax.p1, ax.p2] };
      } else {
        const c = doc.centers.find((x) => x.id === state.activeCenterId) ?? (doc.centers.length === 1 ? doc.centers[0] : null);
        if (!c) {
          toast(doc.centers.length ? '사용할 대칭의 중심을 한 번 눌러서 골라 주세요.' : '먼저 "중심점 찍기"로 대칭의 중심을 찍어 주세요.', 'warn');
          return;
        }
        ref = { center: c.p };
      }
      const r = makeSymmetric(doc, selection, type, ref);
      if (!r.ok) {
        if (r.reason === 'overlap')
          toast(
            type === 'line'
              ? '복사한 도형이 원래 도형과 똑같은 자리에 겹쳤어요. 도형을 대칭축 한쪽으로 옮긴 뒤 다시 해 보세요.'
              : '복사한 도형이 원래 도형과 똑같은 자리에 겹쳤어요. 대칭의 중심을 도형 밖으로 옮긴 뒤 다시 해 보세요.',
            'warn',
          );
        else toast('글자와 말풍선은 대칭 복사를 할 수 없어요. 도형을 골라 주세요.', 'warn');
        return;
      }
      setDoc(r.doc, [...selection, ...r.figure.pairs.map((p) => p.copy)]);
      announce(r.doc, figTitle(r.figure));
      if (r.skipped) toast('글자·말풍선은 빼고 복사했어요.', 'info');
    };

    const addAxis = (dir: 'v' | 'h') => {
      // 같은 자리에 겹치지 않게, 이미 있으면 격자 2칸씩 비켜서 놓는다.
      const g = settings.gridSize;
      let k = 0;
      const exists = (p: number) => doc.axes.some((a) => (dir === 'v' ? a.p1.x === p && a.p2.x === p : a.p1.y === p && a.p2.y === p));
      const base = dir === 'v' ? PAPER_CENTER.x : PAPER_CENTER.y;
      while (exists(base + k * 2 * g) && k < 20) k = k <= 0 ? -k + 1 : -k;
      const pos = base + k * 2 * g;
      const id = uid('a');
      const axis = dir === 'v' ? { id, p1: vec(pos, 0), p2: vec(pos, PAPER.h) } : { id, p1: vec(0, pos), p2: vec(PAPER.w, pos) };
      setDoc({ ...doc, axes: [...doc.axes, axis] });
      dispatch({ type: 'ui', patch: { activeAxisId: id, guideSel: null } });
      dispatch({ type: 'settings', patch: { showAxes: true } });
      toast(`${dir === 'v' ? '세로' : '가로'} 대칭축을 놓았어요. 끌어서 옮길 수도 있어요.`, 'good');
    };

    const remove = () => {
      if (state.guideSel) {
        const g = state.guideSel;
        setDoc(g.kind === 'axis' ? { ...doc, axes: doc.axes.filter((a) => a.id !== g.id) } : { ...doc, centers: doc.centers.filter((c) => c.id !== g.id) });
        toast(g.kind === 'axis' ? '대칭축을 지웠어요.' : '대칭의 중심을 지웠어요.', 'info');
        return;
      }
      if (!needSelection('지울')) return;
      setDoc(deleteShapes(doc, selection), []);
    };

    const duplicate = () => {
      if (!needSelection('복제할')) return;
      const g = settings.gridSize;
      const r = duplicateShapes(doc, selection, vec(g, g));
      setDoc(r.doc, r.newIds);
      if (r.doc.figures.length > doc.figures.length) toast('대칭 도형을 통째로 복제했어요.', 'good');
    };

    const nudge = (dx: number, dy: number) => {
      if (!selection.length) return;
      setDoc(moveGroup(doc, linkedGroup(doc, selection), vec(dx, dy)));
    };

    const rotateSel = (deg: number) => {
      if (!needSelection('돌릴')) return;
      const ids = linkedGroup(doc, selection);
      setDoc(rotateGroup(doc, ids, groupCenter(doc, ids), deg));
    };

    const scaleSel = (k: number) => {
      if (!needSelection('크기를 바꿀')) return;
      const ids = linkedGroup(doc, selection);
      setDoc(scaleGroup(doc, ids, groupCenter(doc, ids), k));
    };

    /** 고른 도형의 모양 바꾸기 (대칭 짝은 거울처럼 따라 바뀜) */
    const editSel = (fn: (s: Shape) => Shape, what = '바꿀') => {
      if (!needSelection(what)) return;
      setDoc(editShapes(doc, selection, fn));
    };

    /** 색·선 바꾸기: 고른 도형이 있으면 그 도형에, 없으면 앞으로 그릴 도형에 */
    const applyStyle = (patch: Partial<Shape>) => {
      if (selection.length) setDoc(styleShapes(doc, selection, patch));
      const ds: Record<string, unknown> = {};
      for (const k of ['stroke', 'fill', 'strokeWidth', 'opacity', 'lineStyle'] as const) if (k in patch) ds[k] = patch[k];
      if (Object.keys(ds).length) dispatch({ type: 'drawStyle', patch: ds });
    };

    const order = (where: 'front' | 'back' | 'forward' | 'backward') => {
      if (!needSelection('순서를 바꿀')) return;
      setDoc(reorder(doc, selection, where));
    };

    /** 스티커·빠른 도형을 화면 가운데 근처에 놓기 */
    const place = (shapes: Shape[]) => {
      const n = doc.shapes.length % 5;
      const target = add(PAPER_CENTER, vec((n - 2) * settings.gridSize, (n - 2) * settings.gridSize * 0.5));
      const c = centroid(shapes.map(shapeCenter));
      const d = sub(target, c);
      const moved = shapes.map((s) => translateShape(s, d));
      setDoc(addShapes(doc, moved), moved.map((s) => s.id));
      dispatch({ type: 'tool', tool: 'select' });
    };

    const checkAll = () => {
      if (!doc.figures.length) {
        toast('아직 대칭 도형이 없어요. 도형을 고르고 "선대칭 복사"나 "점대칭 복사"를 눌러 보세요.', 'info');
        return;
      }
      const bad = doc.figures.filter((f) => !checkFigure(doc, f, settings.gridSize).ok);
      if (!bad.length) toast(`대칭 도형 ${doc.figures.length}개 모두 대칭이 맞아요! 👍`, 'good');
      else {
        toast(`${bad.map(figTitle).join(', ')}의 대칭이 어긋났어요. 빨간 점선으로 표시된 도형을 눌러 힌트를 확인해 보세요.`, 'warn');
      }
    };

    /** 전체 그림 지우기: 도형·대칭축·중심점을 모두 지운다 (배경은 남기고, 되돌리기로 되살릴 수 있다) */
    const clearAll = () => {
      if (!doc.shapes.length && !doc.axes.length && !doc.centers.length) {
        toast('도화지가 이미 비어 있어요.', 'info');
        return;
      }
      if (!window.confirm('도화지의 그림을 모두 지울까요?\n(배경은 그대로 남아요. 실수로 지웠다면 "되돌리기"로 되살릴 수 있어요.)')) return;
      setDoc({ ...doc, shapes: [], figures: [], axes: [], centers: [] }, []);
      dispatch({ type: 'ui', patch: { guideSel: null, popPreview: false } });
      toast('그림을 모두 지웠어요. 되살리려면 위쪽 "되돌리기"를 누르세요.', 'info');
    };

    return { mirror, addAxis, remove, clearAll, duplicate, nudge, rotateSel, scaleSel, editSel, applyStyle, order, place, checkAll, toast, setDoc };
  }, [state, dispatch]);
}
