/**
 * 사조별 예시 배치.
 *  - 사조 고르기 화면의 작은 그림
 *  - 교사용 "예시 템플릿 불러오기"
 * 학생의 창작을 대신하지 않도록 대칭 도형은 3개만(선대칭 2 + 점대칭 1) 넣어 "이렇게 시작할 수 있어요" 수준으로 둔다.
 */
import type { ArtStyleId, Background, Doc, Shape, SymType, Vec } from '../types';
import { vec } from '../geometry/vec';
import { makeSymmetric } from '../state/ops';
import { uid } from '../utils/id';
import { STICKERS, starPoints } from './stickers';

const sh = (kind: Shape['kind'], points: Vec[], over: Partial<Shape> = {}): Shape => ({
  id: uid(),
  kind,
  points,
  stroke: '#111111',
  strokeWidth: 5,
  fill: '#FFD400',
  opacity: 1,
  lineStyle: 'solid',
  rotation: 0,
  ...over,
});

const P = (pts: [number, number][]) => pts.map(([x, y]) => vec(x, y));

/** 예시를 쉽게 쌓는 도우미 */
class Builder {
  doc: Doc;
  constructor(background: Background) {
    this.doc = { shapes: [], figures: [], axes: [], centers: [], background, popGrid: 1 };
  }
  add(...shapes: Shape[]) {
    this.doc = { ...this.doc, shapes: [...this.doc.shapes, ...shapes] };
    return shapes.map((s) => s.id);
  }
  sym(ids: string[], type: SymType, ref: { axis?: [Vec, Vec]; center?: Vec }) {
    const r = makeSymmetric(this.doc, ids, type, ref);
    if (r.ok) this.doc = r.doc;
  }
}

function surreal(): Doc {
  const b = new Builder({ type: 'floor', c1: '#9CC9F0', c2: '#6B4E9B' });
  // 하늘에 떠 있는 두 눈 (세로 대칭축)
  const eye = STICKERS.surreal[0].make(vec(560, 250), { fill: '', stroke: '' }).map((s) => ({ ...s, shadow: true }));
  b.sym(b.add(...eye), 'line', { axis: [vec(720, 0), vec(720, 960)] });
  // 물에 비친 듯 거꾸로 선 집 (가로 대칭축)
  const house = sh('polygon', P([[240, 520], [400, 520], [400, 420], [320, 340], [240, 420]]), { fill: '#E07A5F', stroke: '#3D405B', strokeWidth: 4 });
  b.sym(b.add(house), 'line', { axis: [vec(0, 520), vec(1440, 520)] });
  // 점대칭으로 마주 보는 초승달
  const moon = STICKERS.surreal[2].make(vec(1120, 200), { fill: '', stroke: '' })[0];
  b.sym(b.add({ ...moon, shadow: true }), 'point', { center: vec(1180, 320) });
  return b.doc;
}

function cubism(): Doc {
  const b = new Builder({ type: 'solid', c1: '#EFE6D2', c2: '#EFE6D2' });
  const face = sh('polygon', P([[720, 160], [600, 240], [560, 420], [620, 600], [720, 660]]), { fill: '#C9A66B', stroke: '#2B2B2B', opacity: 0.85 });
  const cheek = sh('triangle', P([[600, 440], [700, 480], [640, 600]]), { fill: '#B5523B', stroke: '#2B2B2B', opacity: 0.7 });
  b.sym(b.add(face, cheek), 'line', { axis: [vec(720, 0), vec(720, 960)] });
  const eye = sh('triangle', P([[620, 320], [700, 300], [690, 360]]), { fill: '#3E4A61', stroke: '#2B2B2B' });
  b.sym(b.add(eye), 'line', { axis: [vec(720, 0), vec(720, 960)] });
  const slab = sh('rect', P([[160, 200], [360, 160], [400, 360], [200, 400]]), { fill: '#5B6C5D', stroke: '#2B2B2B', opacity: 0.75 });
  b.sym(b.add(slab), 'point', { center: vec(360, 480) });
  return b.doc;
}

function pop(): Doc {
  const b = new Builder({ type: 'dots', c1: '#FFE14D', c2: '#FF8A00' });
  const half = sh('polygon', P([[360, 160], [240, 440], [360, 440]]), { fill: '#E10600', strokeWidth: 8 });
  b.sym(b.add(half), 'line', { axis: [vec(360, 0), vec(360, 960)] });
  const eye = sh('circle', [vec(1000, 280), vec(1050, 280)], { fill: '#0057E7', strokeWidth: 8 });
  b.sym(b.add(eye), 'line', { axis: [vec(1080, 0), vec(1080, 960)] });
  const blade = sh('triangle', P([[620, 560], [720, 560], [720, 680]]), { fill: '#FF4FA3', strokeWidth: 8 });
  b.sym(b.add(blade), 'point', { center: vec(720, 680) });
  b.add(
    sh('bubble', [vec(1060, 640)], { text: '와우!', fontSize: 56, fill: '#FFFFFF', stroke: '#111111', strokeWidth: 6 }),
    sh('polygon', starPoints(vec(220, 760), 90, 38), { fill: '#00C2FF', strokeWidth: 6 }),
  );
  return b.doc;
}

const BUILDERS: Record<ArtStyleId, () => Doc> = { cubism, surreal, pop };

/** 부를 때마다 새 이름표로 새로 만든다 (여러 번 불러와도 겹치지 않게) */
export const makeTemplate = (id: ArtStyleId): Doc => BUILDERS[id]();

/** 사조 고르기 화면의 작은 예시 그림용 (한 번만 만든다) */
export const TEMPLATE_PREVIEWS: Record<ArtStyleId, Doc> = {
  cubism: cubism(),
  surreal: surreal(),
  pop: pop(),
};
