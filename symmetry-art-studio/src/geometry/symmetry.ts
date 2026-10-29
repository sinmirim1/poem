/**
 * 대칭의 핵심 계산
 *  - 선대칭 복사 / 점대칭 복사
 *  - 대칭이 맞는지 검사하고, 맞지 않으면 무엇을 고치면 되는지 힌트 만들기
 *  - 한 도형이 스스로 대칭인지 찾아보기
 */
import type { Doc, OwnSymmetry, Shape, SymFigure, SymType, Vec } from '../types';
import { centroid, dist, dot, mid, norm, normDeg, reflectOverLine, reflectOverPoint, signedDistToLine, sub, vec, add, mul, len } from './vec';
import { isPolygonKind } from './shapes';

/** 점의 이름: 교과서처럼 ㄱ, ㄴ, ㄷ … (대응점은 ㄱ′, ㄴ′ …) */
export const POINT_NAMES = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

/** 검사할 때 허용하는 오차(px). 격자 한 칸은 24px 이상이라 손으로 옮긴 차이는 충분히 구별된다. */
export const SYM_TOL = 1.5;

export const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
export const figNumText = (n: number) => CIRCLED[n - 1] ?? `(${n})`;
export const figTitle = (f: SymFigure) => `${f.type === 'line' ? '선대칭' : '점대칭'} 도형 ${figNumText(f.num)}`;

/** 이 대칭 도형에서 점을 대응점으로 옮기는 함수 */
export function figureMap(fig: Pick<SymFigure, 'type' | 'axis' | 'center'>): (p: Vec) => Vec {
  if (fig.type === 'line' && fig.axis) {
    const [a, b] = fig.axis;
    return (p) => reflectOverLine(p, a, b);
  }
  const c = fig.center ?? vec(0, 0);
  return (p) => reflectOverPoint(p, c);
}

/**
 * src를 대칭시킨 도형을 만든다.
 * base가 있으면 base의 색·선 모양은 그대로 두고 위치(점)만 바꾼다.
 */
export function mirrorShape(src: Shape, fig: Pick<SymFigure, 'type' | 'axis' | 'center'>, base?: Shape): Shape {
  const m = figureMap(fig);
  // 점대칭은 180° 돌린 것과 같으므로 회전 각도에 180을 더한다.
  const rotation = fig.type === 'point' ? normDeg(src.rotation + 180) : normDeg(-src.rotation);
  return {
    ...(base ?? src),
    id: base?.id ?? src.id,
    kind: src.kind,
    points: src.points.map(m),
    rotation,
  };
}

export const figureMembers = (f: SymFigure) => f.pairs.flatMap((p) => [p.orig, p.copy]);

/** 도형 하나가 속한 대칭 도형들과, 그 안에서의 역할 */
export function figuresOfShape(doc: Doc, id: string) {
  const out: { fig: SymFigure; role: 'orig' | 'copy'; partner: string }[] = [];
  for (const fig of doc.figures) {
    for (const p of fig.pairs) {
      if (p.orig === id) out.push({ fig, role: 'orig', partner: p.copy });
      else if (p.copy === id) out.push({ fig, role: 'copy', partner: p.orig });
    }
  }
  return out;
}

export function nextFigureNum(doc: Doc, type: SymType): number {
  return doc.figures.filter((f) => f.type === type).reduce((m, f) => Math.max(m, f.num), 0) + 1;
}

export interface CheckResult {
  ok: boolean;
  hints: string[];
  /** 가장 많이 어긋난 대응점 (학습용 설명에 쓴다) */
  worst?: { name: string; a: number; b: number };
}

/**
 * 대칭 도형이 정말 대칭인지 검사한다.
 * 창작을 막지 않도록 "틀렸다"가 아니라 "어디를 확인하면 되는지"를 알려 준다.
 */
export function checkFigure(doc: Doc, fig: SymFigure, gridSize: number): CheckResult {
  const byId = new Map(doc.shapes.map((s) => [s.id, s]));
  const hints = new Set<string>();
  let worst: CheckResult['worst'];
  let worstErr = 0;
  let nameIdx = 0;
  const cells = (px: number) => Math.round((px / gridSize) * 10) / 10;

  for (const pair of fig.pairs) {
    const a = byId.get(pair.orig);
    const b = byId.get(pair.copy);
    if (!a || !b) continue;
    if (a.points.length !== b.points.length) {
      hints.add('두 도형의 꼭짓점 수가 달라요. 대칭인 두 도형은 모양과 크기가 같아야 해요.');
      continue;
    }
    for (let i = 0; i < a.points.length; i++) {
      const P = a.points[i];
      const Q = b.points[i];
      const name = POINT_NAMES[nameIdx++ % POINT_NAMES.length];
      if (fig.type === 'line' && fig.axis) {
        const [s, e] = fig.axis;
        const dir = norm(sub(e, s));
        const dP = signedDistToLine(P, s, e);
        const dQ = signedDistToLine(Q, s, e);
        const M = mid(P, Q);
        const PQ = sub(Q, P);
        const midOff = Math.abs(signedDistToLine(M, s, e));
        const tilt = len(PQ) < SYM_TOL ? 0 : Math.abs(dot(PQ, dir));
        const distDiff = Math.abs(Math.abs(dP) - Math.abs(dQ));
        const sameSide = dP * dQ > SYM_TOL * SYM_TOL;
        const err = Math.max(midOff, tilt, distDiff);
        if (sameSide) hints.add('대칭된 도형의 방향이 원래 도형과 거울처럼 반대인지 확인해 보세요. 두 도형은 대칭축의 서로 다른 쪽에 있어야 해요.');
        if (distDiff > SYM_TOL) hints.add('대칭축의 왼쪽과 오른쪽 거리를 다시 확인해 보세요.');
        if (tilt > SYM_TOL) hints.add('대응점을 이은 선분이 대칭축과 수직으로 만나는지 확인해 보세요.');
        if (midOff > SYM_TOL) hints.add('대칭축이 두 대응점을 이은 선분의 가운데를 지나야 합니다.');
        if (err > worstErr) {
          worstErr = err;
          worst = { name, a: cells(Math.abs(dP)), b: cells(Math.abs(dQ)) };
        }
      } else if (fig.center) {
        const C = fig.center;
        const M = mid(P, Q);
        const off = dist(M, C);
        const dP = dist(P, C);
        const dQ = dist(Q, C);
        const lineErr = Math.abs(signedDistToLine(C, P, Q));
        if (Math.abs(dP - dQ) > SYM_TOL) hints.add('대칭의 중심에서 두 대응점까지의 거리를 확인해 보세요.');
        if (lineErr > SYM_TOL && dist(P, Q) > SYM_TOL) hints.add('원래 도형을 중심점 기준으로 180도 돌렸을 때 겹치는지 생각해 보세요.');
        if (off > SYM_TOL) hints.add('대칭의 중심은 대응점들을 이은 선분의 한가운데에 있어야 합니다.');
        if (off > worstErr) {
          worstErr = off;
          worst = { name, a: cells(dP), b: cells(dQ) };
        }
      }
    }
  }
  return { ok: hints.size === 0, hints: [...hints], worst: hints.size ? worst : undefined };
}

/** 프로젝트 조건에 쓰는 개수: 검사를 통과한 대칭 도형만 센다 */
export function countFigures(doc: Doc, gridSize: number) {
  let line = 0;
  let point = 0;
  let broken = 0;
  for (const f of doc.figures) {
    if (f.pairs.length === 0) continue;
    if (checkFigure(doc, f, gridSize).ok) {
      if (f.type === 'line') line++;
      else point++;
    } else broken++;
  }
  return { line, point, broken };
}

/**
 * 한 도형이 스스로 선대칭·점대칭인지 찾아본다.
 * 꼭짓점들의 무게중심을 지나는 후보 직선(꼭짓점·변의 중점을 지나는 선, 변에 수직인 선)으로
 * 접어 보아 꼭짓점들이 서로 겹치면 대칭축이다.
 */
export function findOwnSymmetry(s: Shape): OwnSymmetry | null {
  if (s.kind === 'circle') {
    return { shapeId: s.id, axes: [], center: s.points[0], infinite: true };
  }
  if (!(isPolygonKind(s.kind) || s.kind === 'segment')) return null;
  const pts = s.points;
  const c = centroid(pts);
  const same = (mapped: Vec[]) => mapped.every((p) => pts.some((q) => dist(p, q) < SYM_TOL * 2));

  const dirs: Vec[] = [];
  const edges = pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Vec, Vec]);
  for (const p of pts) if (dist(p, c) > 1) dirs.push(norm(sub(p, c)));
  for (const [a, b] of edges) {
    const m = mid(a, b);
    if (dist(m, c) > 1) dirs.push(norm(sub(m, c)));
    const e = norm(sub(b, a));
    dirs.push(vec(-e.y, e.x));
  }
  const axes: [Vec, Vec][] = [];
  const seen: Vec[] = [];
  for (const d of dirs) {
    if (seen.some((q) => Math.abs(Math.abs(dot(q, d)) - 1) < 1e-4)) continue;
    seen.push(d);
    const a = c;
    const b = add(c, d);
    if (same(pts.map((p) => reflectOverLine(p, a, b)))) {
      const r = Math.max(...pts.map((p) => dist(p, c))) + 40;
      axes.push([add(c, mul(d, -r)), add(c, mul(d, r))]);
    }
  }
  const center = same(pts.map((p) => reflectOverPoint(p, c))) ? c : null;
  return { shapeId: s.id, axes, center, infinite: false };
}

/** 학습 모드에서 대응점을 보여 줄 점 번호 (자유선은 점이 많아서 몇 개만 고른다) */
export function sampleIndices(s: Shape): number[] {
  if (s.kind === 'freehand') {
    const n = s.points.length;
    if (n <= 4) return s.points.map((_, i) => i);
    return [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
  }
  if (s.kind === 'circle') return [0];
  return s.points.map((_, i) => i);
}
