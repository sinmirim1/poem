/** 점(벡터) 계산 도우미 */
import type { Vec } from '../types';

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function norm(a: Vec): Vec {
  const l = len(a);
  return l < 1e-9 ? { x: 1, y: 0 } : { x: a.x / l, y: a.y / l };
}

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** 각도를 -180 초과 ~ 180 이하로 맞춘다 */
export function normDeg(d: number): number {
  let r = ((d % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return Math.round(r * 10) / 10;
}

/** 점 p를 중심 c를 기준으로 deg도 돌린다 (화면 좌표: 양수 = 시계 방향) */
export function rotateAround(p: Vec, c: Vec, deg: number): Vec {
  const r = toRad(deg);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** 선대칭: 직선 ab를 대칭축으로 점 p를 옮긴다 */
export function reflectOverLine(p: Vec, a: Vec, b: Vec): Vec {
  const d = norm(sub(b, a));
  const foot = add(a, mul(d, dot(sub(p, a), d))); // p에서 대칭축에 내린 수선의 발
  return { x: 2 * foot.x - p.x, y: 2 * foot.y - p.y };
}

/** 점대칭: 점 c를 대칭의 중심으로 점 p를 옮긴다 (= 180도 회전) */
export function reflectOverPoint(p: Vec, c: Vec): Vec {
  return { x: 2 * c.x - p.x, y: 2 * c.y - p.y };
}

/** 직선 ab에서 점 p까지의 거리 (부호는 어느 쪽에 있는지를 나타냄) */
export function signedDistToLine(p: Vec, a: Vec, b: Vec): number {
  return cross(norm(sub(b, a)), sub(p, a));
}

/** 직선 ab 위에서 점 p와 가장 가까운 점 (수선의 발) */
export function footOnLine(p: Vec, a: Vec, b: Vec): Vec {
  const d = norm(sub(b, a));
  return add(a, mul(d, dot(sub(p, a), d)));
}

export function centroid(points: Vec[]): Vec {
  if (points.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boxOf(points: Vec[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function unionBox(boxes: Box[]): Box {
  return boxOf(boxes.flatMap((b) => [vec(b.x, b.y), vec(b.x + b.w, b.y + b.h)]));
}

export const boxCenter = (b: Box): Vec => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

/** 화면에 보여 줄 선의 기울기(도). 수학 시간처럼 오른쪽이 0°, 위쪽이 90° */
export function lineAngleForDisplay(a: Vec, b: Vec): number {
  let deg = toDeg(Math.atan2(-(b.y - a.y), b.x - a.x));
  deg = ((deg % 180) + 180) % 180;
  return Math.round(deg);
}
