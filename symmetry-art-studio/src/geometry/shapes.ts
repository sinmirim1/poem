/** 도형의 크기·중심·변형·그리기 경로 계산 */
import type { Shape, ShapeKind, Vec } from '../types';
import {
  add,
  boxCenter,
  boxOf,
  cross,
  dist,
  dot,
  len,
  mul,
  norm,
  normDeg,
  rotateAround,
  sub,
  toDeg,
  vec,
  type Box,
} from './vec';

/** 도화지 크기. 가운데(720, 480)가 모든 격자 간격(24·40·60·80)에서 격자점이 되도록 정했다. */
export const PAPER = { w: 1440, h: 960 };
export const PAPER_CENTER: Vec = { x: PAPER.w / 2, y: PAPER.h / 2 };

export const KIND_NAMES: Record<ShapeKind, string> = {
  point: '점',
  segment: '선분',
  line: '직선',
  triangle: '삼각형',
  rect: '사각형',
  polygon: '다각형',
  circle: '원',
  freehand: '자유선',
  text: '글자',
  bubble: '말풍선',
};

/** 면이 있는(닫힌) 도형인지 */
export const isClosedKind = (k: ShapeKind) => k === 'triangle' || k === 'rect' || k === 'polygon' || k === 'circle';
/** 꼭짓점을 끌어서 고칠 수 있는 도형인지 */
export const hasVertexHandles = (k: ShapeKind) => k !== 'text' && k !== 'bubble' && k !== 'freehand';
/** 대칭 복사를 할 수 있는 도형인지 (글자·말풍선은 거울처럼 뒤집으면 읽을 수 없어서 제외) */
export const canMirror = (s: Shape) => s.kind !== 'text' && s.kind !== 'bubble';
/** 꼭짓점이 있는 다각형 종류인지 */
export const isPolygonKind = (k: ShapeKind) => k === 'triangle' || k === 'rect' || k === 'polygon';

/** 글자 하나하나의 폭을 대략 계산해서 글자 상자의 크기를 구한다 */
export function textBox(s: Shape): { w: number; h: number } {
  const fs = s.fontSize ?? 40;
  let units = 0;
  for (const ch of s.text ?? '') units += ch.charCodeAt(0) > 0x1100 ? 1 : 0.62;
  const w = Math.max(fs * 0.8, units * fs);
  if (s.kind === 'bubble') return { w: w + fs * 1.8, h: fs * 2.5 };
  return { w, h: fs * 1.3 };
}

/** 도형을 감싸는 상자 */
export function shapeBounds(s: Shape): Box {
  const p0 = s.points[0] ?? vec(0, 0);
  switch (s.kind) {
    case 'circle': {
      const r = dist(p0, s.points[1] ?? p0);
      return { x: p0.x - r, y: p0.y - r, w: r * 2, h: r * 2 };
    }
    case 'point':
      return { x: p0.x - 8, y: p0.y - 8, w: 16, h: 16 };
    case 'text':
    case 'bubble': {
      const { w, h } = textBox(s);
      const bottom = s.kind === 'bubble' ? h * 0.75 : h / 2; // 말풍선 꼬리까지
      const corners = [vec(-w / 2, -h / 2), vec(w / 2, -h / 2), vec(w / 2, bottom), vec(-w / 2, bottom)].map((c) =>
        rotateAround(add(p0, c), p0, s.rotation),
      );
      return boxOf(corners);
    }
    default:
      return boxOf(s.points);
  }
}

/** 도형의 중심 (돌리거나 크기를 바꿀 때 기준점) */
export function shapeCenter(s: Shape): Vec {
  if (s.kind === 'circle' || s.kind === 'text' || s.kind === 'bubble' || s.kind === 'point') return s.points[0];
  return boxCenter(boxOf(s.points));
}

/**
 * 도형의 모든 점에 같은 변환 f를 적용한다.
 * rotate: 화면에 보여 줄 회전 각도에 더할 값, scale: 글자 크기에 곱할 값
 */
export function transformShape(s: Shape, f: (p: Vec) => Vec, extra: { rotate?: number; scale?: number } = {}): Shape {
  return {
    ...s,
    points: s.points.map(f),
    rotation: extra.rotate ? normDeg(s.rotation + extra.rotate) : s.rotation,
    fontSize: s.fontSize !== undefined && extra.scale ? Math.max(8, s.fontSize * extra.scale) : s.fontSize,
  };
}

export const translateShape = (s: Shape, d: Vec) => transformShape(s, (p) => add(p, d));

/** 도형 자신의 중심을 기준으로 가로 kx배, 세로 ky배 늘인다 */
export function stretchShape(s: Shape, kx: number, ky: number, c = shapeCenter(s)): Shape {
  if (s.kind === 'text' || s.kind === 'bubble') {
    return { ...s, fontSize: Math.max(8, (s.fontSize ?? 40) * Math.sqrt(Math.abs(kx * ky))) };
  }
  return transformShape(s, (p) => vec(c.x + (p.x - c.x) * kx, c.y + (p.y - c.y) * ky));
}

/** 도형을 옆으로 기울인다 (밀기 변형) */
export function skewShape(s: Shape, k: number): Shape {
  if (s.kind === 'text' || s.kind === 'bubble' || s.kind === 'circle') return s;
  const c = shapeCenter(s);
  return transformShape(s, (p) => vec(p.x + (p.y - c.y) * k, p.y));
}

/** 도형을 제자리에서 뒤집는다 (horizontal: 좌우, 아니면 위아래) */
export function flipShape(s: Shape, horizontal: boolean): Shape {
  if (s.kind === 'text' || s.kind === 'bubble') return s;
  const c = shapeCenter(s);
  return transformShape(s, (p) => (horizontal ? vec(2 * c.x - p.x, p.y) : vec(p.x, 2 * c.y - p.y)));
}

/** 정다각형의 꼭짓점 */
export function regularPolygon(n: number, c: Vec, r: number, startDeg = -90): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    return vec(c.x + r * Math.cos(a), c.y + r * Math.sin(a));
  });
}

/** 자유선의 점이 너무 많을 때 모양은 유지하면서 점 수를 줄인다 (더글러스-포이커 방법) */
export function simplifyPath(points: Vec[], tol = 1.5): Vec[] {
  if (points.length < 3) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    const ab = sub(points[b], points[a]);
    const l = len(ab);
    for (let i = a + 1; i < b; i++) {
      const ap = sub(points[i], points[a]);
      const d = l < 1e-9 ? len(ap) : Math.abs(cross(ab, ap)) / l;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 열린 선/닫힌 다각형의 SVG 경로 */
export function polyPath(points: Vec[], closed: boolean): string {
  if (points.length === 0) return '';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${r1(p.x)} ${r1(p.y)}`).join(' ');
  return closed ? d + ' Z' : d;
}

/** 자유선은 꺾인 곳 없이 부드럽게 이어서 그린다 */
export function smoothPath(points: Vec[]): string {
  if (points.length < 3) return polyPath(points, false);
  let d = `M${r1(points[0].x)} ${r1(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const m = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    d += ` Q${r1(points[i].x)} ${r1(points[i].y)} ${r1(m.x)} ${r1(m.y)}`;
  }
  const last = points[points.length - 1];
  return d + ` L${r1(last.x)} ${r1(last.y)}`;
}

/** 직선은 양쪽으로 아주 길게 늘여서 그린다 (도화지 밖은 잘려 보이지 않음) */
export function extendedLine(a: Vec, b: Vec, reach = 5000): [Vec, Vec] {
  const d = norm(sub(b, a));
  return [add(a, mul(d, -reach)), add(a, mul(d, reach))];
}

/** 말풍선 모양 경로 (가운데가 0,0) */
export function bubblePath(w: number, h: number): string {
  const rx = w / 2;
  const ry = h / 2;
  const at = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return vec(rx * Math.cos(r), ry * Math.sin(r));
  };
  const a = at(135);
  const b = at(105);
  const tip = vec(-rx * 0.62, ry * 1.5);
  return `M${r1(a.x)} ${r1(a.y)} A${r1(rx)} ${r1(ry)} 0 1 1 ${r1(b.x)} ${r1(b.y)} L${r1(tip.x)} ${r1(tip.y)} Z`;
}

/** 다각형 각 꼭짓점의 안쪽 각도와, 각도 글자를 놓을 위치 */
export function interiorAngles(points: Vec[]): { deg: number; at: Vec }[] {
  const n = points.length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) area += cross(points[i], points[(i + 1) % n]);
  const orient = Math.sign(area) || 1;
  return points.map((cur, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const a = sub(prev, cur);
    const b = sub(next, cur);
    const cosv = dot(a, b) / ((len(a) || 1) * (len(b) || 1));
    let deg = toDeg(Math.acos(Math.max(-1, Math.min(1, cosv))));
    const convex = Math.sign(cross(sub(cur, prev), sub(next, cur))) === orient;
    if (!convex) deg = 360 - deg;
    let bis = norm(add(norm(a), norm(b)));
    if (!convex) bis = mul(bis, -1);
    return { deg: Math.round(deg), at: add(cur, mul(bis, 34)) };
  });
}

/** 도형의 "꼭짓점" 목록 (원은 중심과 원 위의 점) */
export const shapeVertices = (s: Shape): Vec[] => s.points;

/** 도형의 변(선분) 목록: 평행·수직 맞추기와 대응변 표시에 쓴다 */
export function shapeEdges(s: Shape): [Vec, Vec][] {
  const p = s.points;
  if (s.kind === 'segment' || s.kind === 'line') return p.length >= 2 ? [[p[0], p[1]]] : [];
  if (isPolygonKind(s.kind)) return p.map((a, i) => [a, p[(i + 1) % p.length]] as [Vec, Vec]);
  return [];
}

/** 두 도형의 점들이 (순서와 상관없이) 같은 자리에 있는지 */
export function samePointSet(a: Vec[], b: Vec[], tol = 1.5): boolean {
  if (a.length !== b.length) return false;
  return a.every((p) => b.some((q) => dist(p, q) < tol));
}

/** 다각형 넓이 (거의 0이면 납작한 도형) */
export function polygonArea(points: Vec[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) s += cross(points[i], points[(i + 1) % points.length]);
  return Math.abs(s) / 2;
}

/** 원 위의 점 (원을 다각형처럼 다뤄야 할 때) */
export function rotatePointsAround(points: Vec[], c: Vec, deg: number) {
  return points.map((p) => rotateAround(p, c, deg));
}
