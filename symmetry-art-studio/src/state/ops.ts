/**
 * 작품 자료(Doc)를 바꾸는 순수 함수 모음.
 * 화면 컴포넌트는 이 함수로 새 Doc을 만든 뒤 저장소에 넘긴다.
 *
 * 대칭 도형의 "함께 움직이기"(linked) 규칙
 *  1) 옮기기·돌리기·크기 바꾸기 → 원래 도형, 대칭 도형, 대칭축(중심)이 한 덩어리로 같이 바뀐다.
 *  2) 꼭짓점 끌기·늘이기·뒤집기·나누기처럼 "모양"을 바꾸면 → 짝 도형이 거울처럼 따라 바뀐다.
 *  둘 다 대칭 관계가 그대로 유지된다. "따로 움직이기"로 바꾸면 각각 따로 바뀐다.
 */
import type { Doc, Shape, SymFigure, SymPair, SymType, Vec } from '../types';
import { add, boxCenter, centroid, dist, rotateAround, sub, unionBox, vec } from '../geometry/vec';
import { canMirror, isPolygonKind, samePointSet, shapeBounds, transformShape, translateShape } from '../geometry/shapes';
import { figureMembers, mirrorShape, nextFigureNum } from '../geometry/symmetry';
import { shade } from '../utils/color';
import { uid } from '../utils/id';

const byIdMap = (doc: Doc) => new Map(doc.shapes.map((s) => [s.id, s]));

/** "함께 움직이기" 중인 대칭 도형의 짝까지 모두 모은다 */
export function linkedGroup(doc: Doc, ids: string[]): Set<string> {
  const set = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of doc.figures) {
      if (!f.linked) continue;
      const ms = figureMembers(f);
      if (ms.some((m) => set.has(m)) && ms.some((m) => !set.has(m))) {
        ms.forEach((m) => set.add(m));
        changed = true;
      }
    }
  }
  return set;
}

export function groupBounds(doc: Doc, ids: Iterable<string>) {
  const want = new Set(ids);
  return unionBox(doc.shapes.filter((s) => want.has(s.id)).map(shapeBounds));
}

export const groupCenter = (doc: Doc, ids: Iterable<string>) => boxCenter(groupBounds(doc, ids));

/** 덩어리 전체에 같은 변환을 적용 (도형 + 덩어리에 통째로 들어 있는 대칭 도형의 축/중심) */
function rigid(doc: Doc, ids: Set<string>, f: (p: Vec) => Vec, extra: { rotate?: number; scale?: number }): Doc {
  return {
    ...doc,
    shapes: doc.shapes.map((s) => (ids.has(s.id) ? transformShape(s, f, extra) : s)),
    figures: doc.figures.map((fig) => {
      const ms = figureMembers(fig);
      if (!ms.length || !ms.every((m) => ids.has(m))) return fig;
      return {
        ...fig,
        axis: fig.axis ? [f(fig.axis[0]), f(fig.axis[1])] : undefined,
        center: fig.center ? f(fig.center) : undefined,
      };
    }),
  };
}

export const moveGroup = (doc: Doc, ids: Set<string>, d: Vec) => rigid(doc, ids, (p) => add(p, d), {});

export const rotateGroup = (doc: Doc, ids: Set<string>, c: Vec, deg: number) =>
  rigid(doc, ids, (p) => rotateAround(p, c, deg), { rotate: deg });

export const scaleGroup = (doc: Doc, ids: Set<string>, c: Vec, k: number) =>
  rigid(doc, ids, (p) => vec(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k), { scale: k });

/**
 * 도형의 "모양"을 바꾼다. "함께 움직이기" 중인 짝 도형은 거울처럼 다시 계산한다.
 */
export function editShapes(doc: Doc, ids: string[], fn: (s: Shape) => Shape): Doc {
  const map = byIdMap(doc);
  const done = new Set<string>();
  for (const id of ids) {
    if (done.has(id)) continue;
    const s = map.get(id);
    if (!s) continue;
    const ns = fn(s);
    map.set(id, ns);
    done.add(id);
    for (const fig of doc.figures) {
      if (!fig.linked) continue;
      for (const p of fig.pairs) {
        const partner = p.orig === id ? p.copy : p.copy === id ? p.orig : null;
        if (!partner || done.has(partner)) continue;
        const ps = map.get(partner);
        if (!ps) continue;
        map.set(partner, mirrorShape(ns, fig, ps));
        done.add(partner);
      }
    }
  }
  return { ...doc, shapes: doc.shapes.map((s) => map.get(s.id) ?? s) };
}

/** 꼭짓점 하나를 옮긴다 (원의 중심을 옮기면 원 전체가 옮겨진다) */
export function setVertex(doc: Doc, id: string, index: number, p: Vec): Doc {
  return editShapes(doc, [id], (s) => {
    if (s.kind === 'circle' && index === 0) return translateShape(s, sub(p, s.points[0]));
    const points = s.points.slice();
    points[index] = p;
    return { ...s, points };
  });
}

/** 색·선 등 꾸미기 값만 바꾸기 (짝 도형에는 퍼지지 않는다: 양쪽을 다른 색으로 칠해도 된다) */
export function styleShapes(doc: Doc, ids: string[], patch: Partial<Shape>): Doc {
  const want = new Set(ids);
  return { ...doc, shapes: doc.shapes.map((s) => (want.has(s.id) ? { ...s, ...patch } : s)) };
}

export function addShapes(doc: Doc, shapes: Shape[]): Doc {
  return { ...doc, shapes: [...doc.shapes, ...shapes] };
}

/** 대칭 관계 정리: 지워진 도형이 들어 있던 짝은 빼고, 짝이 하나도 없으면 대칭 도형도 없앤다 */
function pruneFigures(doc: Doc): Doc {
  const alive = new Set(doc.shapes.map((s) => s.id));
  const figures = doc.figures
    .map((f) => ({ ...f, pairs: f.pairs.filter((p) => alive.has(p.orig) && alive.has(p.copy)) }))
    .filter((f) => f.pairs.length > 0);
  return { ...doc, figures };
}

export function deleteShapes(doc: Doc, ids: string[]): Doc {
  const want = new Set(ids);
  return pruneFigures({ ...doc, shapes: doc.shapes.filter((s) => !want.has(s.id)) });
}

/** 복제: 함께 움직이는 대칭 도형은 통째로 복제하고, 대칭 관계도 함께 복사한다 */
export function duplicateShapes(doc: Doc, ids: string[], offset: Vec): { doc: Doc; newIds: string[] } {
  const group = linkedGroup(doc, ids);
  const idMap = new Map<string, string>();
  const clones: Shape[] = [];
  for (const s of doc.shapes) {
    if (!group.has(s.id)) continue;
    const nid = uid();
    idMap.set(s.id, nid);
    clones.push({ ...translateShape(s, offset), id: nid });
  }
  const newFigures: SymFigure[] = [];
  const counters = { line: nextFigureNum(doc, 'line'), point: nextFigureNum(doc, 'point') };
  for (const f of doc.figures) {
    const ms = figureMembers(f);
    if (!ms.every((m) => idMap.has(m))) continue;
    newFigures.push({
      ...f,
      id: uid('f'),
      num: counters[f.type]++,
      pairs: f.pairs.map((p) => ({ orig: idMap.get(p.orig)!, copy: idMap.get(p.copy)! })),
      axis: f.axis ? [add(f.axis[0], offset), add(f.axis[1], offset)] : undefined,
      center: f.center ? add(f.center, offset) : undefined,
    });
  }
  return {
    doc: { ...doc, shapes: [...doc.shapes, ...clones], figures: [...doc.figures, ...newFigures] },
    newIds: clones.map((c) => c.id),
  };
}

export type MirrorResult =
  | { ok: true; doc: Doc; figure: SymFigure; skipped: number }
  | { ok: false; reason: 'none' | 'overlap' };

/**
 * 선대칭 복사 / 점대칭 복사.
 * 고른 도형을 대칭축(또는 대칭의 중심)으로 옮긴 복사본을 만들고, 둘을 한 대칭 도형으로 묶는다.
 */
export function makeSymmetric(doc: Doc, ids: string[], type: SymType, ref: { axis?: [Vec, Vec]; center?: Vec }): MirrorResult {
  const want = new Set(ids);
  const sources = doc.shapes.filter((s) => want.has(s.id) && canMirror(s));
  const skipped = ids.length - sources.length;
  if (sources.length === 0) return { ok: false, reason: 'none' };

  const figure: SymFigure = {
    id: uid('f'),
    type,
    num: nextFigureNum(doc, type),
    pairs: [],
    axis: ref.axis,
    center: ref.center,
    linked: true,
  };
  const copies = new Map<string, Shape>();
  for (const s of sources) {
    const c = { ...mirrorShape(s, figure), id: uid() };
    copies.set(s.id, c);
    figure.pairs.push({ orig: s.id, copy: c.id });
  }
  // 복사본이 원래 도형과 완전히 겹치면(이미 대칭인 도형을 축 위에 둔 경우) 만들지 않는다.
  const allOverlap = sources.every((s) => samePointSet(s.points, copies.get(s.id)!.points));
  if (allOverlap) return { ok: false, reason: 'overlap' };

  // 복사본은 원래 도형 바로 위 층에 넣는다.
  const shapes: Shape[] = [];
  for (const s of doc.shapes) {
    shapes.push(s);
    const c = copies.get(s.id);
    if (c) shapes.push(c);
  }
  return { ok: true, doc: { ...doc, shapes, figures: [...doc.figures, figure] }, figure, skipped };
}

/** 어긋난 대칭 도형을 원래 도형에 맞춰 다시 대칭으로 맞춘다 */
export function fixFigure(doc: Doc, figId: string): Doc {
  const fig = doc.figures.find((f) => f.id === figId);
  if (!fig) return doc;
  const map = byIdMap(doc);
  for (const p of fig.pairs) {
    const o = map.get(p.orig);
    const c = map.get(p.copy);
    if (o && c) map.set(p.copy, mirrorShape(o, fig, c));
  }
  return { ...doc, shapes: doc.shapes.map((s) => map.get(s.id) ?? s) };
}

export function setFigureLinked(doc: Doc, figId: string, linked: boolean): Doc {
  return { ...doc, figures: doc.figures.map((f) => (f.id === figId ? { ...f, linked } : f)) };
}

/** 대칭 관계 풀기: 도형은 남기고 "대칭 도형" 묶음만 없앤다 */
export function dissolveFigure(doc: Doc, figId: string): Doc {
  return { ...doc, figures: doc.figures.filter((f) => f.id !== figId) };
}

/** 겹치는 순서 바꾸기 */
export function reorder(doc: Doc, ids: string[], where: 'front' | 'back' | 'forward' | 'backward'): Doc {
  const want = new Set(ids);
  const shapes = doc.shapes.slice();
  if (where === 'front' || where === 'back') {
    const picked = shapes.filter((s) => want.has(s.id));
    const rest = shapes.filter((s) => !want.has(s.id));
    return { ...doc, shapes: where === 'front' ? [...rest, ...picked] : [...picked, ...rest] };
  }
  if (where === 'forward') {
    for (let i = shapes.length - 2; i >= 0; i--) {
      if (want.has(shapes[i].id) && !want.has(shapes[i + 1].id)) [shapes[i], shapes[i + 1]] = [shapes[i + 1], shapes[i]];
    }
  } else {
    for (let i = 1; i < shapes.length; i++) {
      if (want.has(shapes[i].id) && !want.has(shapes[i - 1].id)) [shapes[i], shapes[i - 1]] = [shapes[i - 1], shapes[i]];
    }
  }
  return { ...doc, shapes };
}

const FACET_SHADES = [0, 14, -12, 20, -6, 8, -16, 10];

/**
 * 입체파 "도형 나누기": 다각형을 무게중심에서 꼭짓점으로 잘라 삼각형 조각으로 나눈다.
 * 대칭 짝이 있는 도형은 짝도 같은 번호의 조각으로 나눠서 조각끼리 다시 짝을 지어 준다.
 * (꼭짓점 i ↔ 꼭짓점 i 이고 무게중심 ↔ 무게중심 이므로 조각 i ↔ 조각 i 가 된다.)
 */
export function splitShapes(doc: Doc, ids: string[]): { doc: Doc; count: number; newIds: string[] } {
  const map = byIdMap(doc);
  const targets = new Set(ids.filter((id) => {
    const s = map.get(id);
    return s && isPolygonKind(s.kind);
  }));
  // 짝 도형도 함께 나눈다.
  for (const f of doc.figures) {
    for (const p of f.pairs) {
      if (targets.has(p.orig) || targets.has(p.copy)) {
        targets.add(p.orig);
        targets.add(p.copy);
      }
    }
  }
  if (targets.size === 0) return { doc, count: 0, newIds: [] };

  const pieces = new Map<string, Shape[]>();
  for (const id of targets) {
    const s = map.get(id)!;
    const c = centroid(s.points);
    const n = s.points.length;
    const base = s.fill === 'none' ? '#d9cab3' : s.fill;
    pieces.set(
      id,
      s.points.map((p, j) => ({
        ...s,
        id: uid(),
        kind: 'triangle' as const,
        points: [c, p, s.points[(j + 1) % n]],
        fill: shade(base, FACET_SHADES[j % FACET_SHADES.length]),
        label: undefined,
      })),
    );
  }
  const shapes = doc.shapes.flatMap((s) => pieces.get(s.id) ?? [s]);
  const figures = doc.figures.map((f) => {
    const pairs: SymPair[] = [];
    for (const p of f.pairs) {
      const a = pieces.get(p.orig);
      const b = pieces.get(p.copy);
      if (a && b && a.length === b.length) a.forEach((pa, j) => pairs.push({ orig: pa.id, copy: b[j].id }));
      else pairs.push(p);
    }
    return { ...f, pairs };
  });
  const newIds = [...pieces.values()].flat().map((s) => s.id);
  return { doc: pruneFigures({ ...doc, shapes, figures }), count: targets.size, newIds };
}

/** 도형들이 원래 자리에서 얼마나 움직였는지 (변화가 있었는지 확인용) */
export function docMoved(a: Doc, b: Doc): boolean {
  if (a === b) return false;
  if (a.shapes.length !== b.shapes.length) return true;
  return a.shapes.some((s, i) => s !== b.shapes[i] && s.points.some((p, j) => dist(p, b.shapes[i].points[j] ?? p) > 0.01));
}
