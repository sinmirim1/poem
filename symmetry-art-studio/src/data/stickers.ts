/** 사조별 꾸미기 스티커: 모두 도형(다각형·원)으로 만들어서 대칭 복사도 할 수 있다 */
import type { ArtStyleId, Shape, Vec } from '../types';
import { regularPolygon } from '../geometry/shapes';
import { vec } from '../geometry/vec';
import { uid } from '../utils/id';

type Part = Omit<Shape, 'id'>;

const base = (over: Partial<Part>): Shape => ({
  id: uid(),
  kind: 'polygon',
  points: [],
  stroke: '#111111',
  strokeWidth: 5,
  fill: '#FFD400',
  opacity: 1,
  lineStyle: 'solid',
  rotation: 0,
  ...over,
});

const at = (c: Vec, pts: [number, number][], k: number) => pts.map(([x, y]) => vec(c.x + x * k, c.y + y * k));

export function starPoints(c: Vec, R: number, r: number, n = 5): Vec[] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    const rad = i % 2 === 0 ? R : r;
    return vec(c.x + rad * Math.cos(a), c.y + rad * Math.sin(a));
  });
}

function heart(c: Vec, k: number): Vec[] {
  return Array.from({ length: 36 }, (_, i) => {
    const t = (i / 36) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return vec(c.x + x * k, c.y + y * k);
  });
}

function cloud(c: Vec, rx: number, ry: number): Vec[] {
  return Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const f = 1 + 0.16 * Math.abs(Math.sin(3 * t));
    return vec(c.x + rx * f * Math.cos(t), c.y + ry * f * Math.sin(t));
  });
}

function eyeLens(c: Vec, w: number, h: number): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = -w + (2 * w * i) / 16;
    pts.push(vec(c.x + x, c.y - h * (1 - (x / w) ** 2)));
  }
  for (let i = 15; i >= 1; i--) {
    const x = -w + (2 * w * i) / 16;
    pts.push(vec(c.x + x, c.y + h * (1 - (x / w) ** 2)));
  }
  return pts;
}

/** 초승달: 큰 원에서 오른쪽으로 비킨 원을 뺀 모양 */
function crescent(c: Vec, R: number): Vec[] {
  const pts: Vec[] = [];
  for (let d = 55; d <= 305; d += 10) {
    const a = (d * Math.PI) / 180;
    pts.push(vec(c.x + R * Math.cos(a), c.y + R * Math.sin(a)));
  }
  const ic = vec(c.x + R * 0.5, c.y);
  for (let d = -85; d >= -275; d -= 10) {
    const a = (d * Math.PI) / 180;
    pts.push(vec(ic.x + R * 0.82 * Math.cos(a), ic.y + R * 0.82 * Math.sin(a)));
  }
  return pts;
}

function spiral(c: Vec, turns: number, R: number): Vec[] {
  const n = turns * 24;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * turns * Math.PI * 2;
    const r = (R * i) / n;
    return vec(c.x + r * Math.cos(t), c.y + r * Math.sin(t));
  });
}

export interface StickerDef {
  name: string;
  make: (c: Vec, colors: { fill: string; stroke: string }) => Shape[];
}

export const STICKERS: Record<ArtStyleId, StickerDef[]> = {
  surreal: [
    {
      name: '거대한 눈',
      make: (c) => [
        base({ points: eyeLens(c, 110, 60), fill: '#FFFFFF', stroke: '#3D405B', strokeWidth: 5, label: '눈' }),
        base({ kind: 'circle', points: [c, vec(c.x + 42, c.y)], fill: '#5DA9E9', stroke: '#3D405B', strokeWidth: 4, label: '눈동자' }),
        base({ kind: 'circle', points: [c, vec(c.x + 18, c.y)], fill: '#111111', stroke: '#111111', strokeWidth: 1, label: '동공' }),
      ],
    },
    { name: '구름', make: (c) => [base({ points: cloud(c, 120, 60), fill: '#FFFFFF', stroke: '#9CB8D8', strokeWidth: 3, label: '구름' })] },
    { name: '초승달', make: (c) => [base({ points: crescent(c, 80), fill: '#F2C14E', stroke: '#B8860B', strokeWidth: 3, label: '달' })] },
    {
      name: '집',
      make: (c) => [base({ points: at(c, [[-1, 1], [1, 1], [1, -0.2], [0, -1.1], [-1, -0.2]], 70), fill: '#E07A5F', stroke: '#3D405B', strokeWidth: 4, label: '집' })],
    },
  ],
  cubism: [
    { name: '정삼각형', make: (c, k) => [base({ kind: 'triangle', points: regularPolygon(3, c, 90), fill: k.fill, stroke: k.stroke, strokeWidth: 4, opacity: 0.8 })] },
    { name: '정사각형', make: (c, k) => [base({ kind: 'rect', points: regularPolygon(4, c, 90, -45), fill: k.fill, stroke: k.stroke, strokeWidth: 4, opacity: 0.8 })] },
    { name: '정오각형', make: (c, k) => [base({ points: regularPolygon(5, c, 90), fill: k.fill, stroke: k.stroke, strokeWidth: 4, opacity: 0.8 })] },
    { name: '정육각형', make: (c, k) => [base({ points: regularPolygon(6, c, 90, 0), fill: k.fill, stroke: k.stroke, strokeWidth: 4, opacity: 0.8 })] },
  ],
  expression: [
    { name: '소용돌이', make: (c, k) => [base({ kind: 'freehand', points: spiral(c, 3, 110), fill: 'none', stroke: k.stroke, strokeWidth: 10, lineStyle: 'brush', label: '소용돌이' })] },
    { name: '이글이글 해', make: (c) => [base({ points: starPoints(c, 110, 70, 14), fill: '#FFBA08', stroke: '#D00000', strokeWidth: 6, lineStyle: 'brush', label: '해' })] },
    { name: '번개', make: (c) => [base({ points: at(c, [[-0.2, -1], [0.6, -1], [0.15, -0.15], [0.55, -0.15], [-0.35, 1], [-0.05, 0.1], [-0.45, 0.1]], 100), fill: '#FFD000', stroke: '#03071E', strokeWidth: 6, lineStyle: 'brush', label: '번개' })] },
    { name: '눈물', make: (c) => [base({ points: Array.from({ length: 30 }, (_, i) => { const t = (i / 30) * Math.PI * 2; return vec(c.x + 60 * Math.sin(t) * Math.sin(t / 2) ** 1.4, c.y - 80 * Math.cos(t)); }), fill: '#4CC9F0', stroke: '#03071E', strokeWidth: 6, lineStyle: 'brush', label: '눈물' })] },
  ],
  pop: [
    { name: '별', make: (c) => [base({ points: starPoints(c, 100, 42), fill: '#FFD400', stroke: '#111111', strokeWidth: 6, label: '별' })] },
    { name: '하트', make: (c) => [base({ points: heart(c, 6), fill: '#FF4FA3', stroke: '#111111', strokeWidth: 6, label: '하트' })] },
    {
      name: '번개',
      make: (c) => [base({ points: at(c, [[-0.2, -1], [0.6, -1], [0.15, -0.15], [0.55, -0.15], [-0.35, 1], [-0.05, 0.1], [-0.45, 0.1]], 100), fill: '#00C2FF', stroke: '#111111', strokeWidth: 6, label: '번개' })],
    },
    {
      name: '펑!',
      make: (c) => [
        base({ points: starPoints(c, 130, 80, 12), fill: '#E10600', stroke: '#111111', strokeWidth: 6, label: '펑' }),
        base({ kind: 'text', points: [c], text: '펑!', fontSize: 64, fill: '#FFD400', stroke: '#111111', strokeWidth: 4 }),
      ],
    },
  ],
};
