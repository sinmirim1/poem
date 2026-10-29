/** 앱 전체에서 쓰는 자료형 모음 */

export interface Vec {
  x: number;
  y: number;
}

export type ShapeKind =
  | 'point'
  | 'segment'
  | 'line'
  | 'triangle'
  | 'rect'
  | 'polygon'
  | 'circle'
  | 'freehand'
  | 'text'
  | 'bubble';

export type LineStyle = 'solid' | 'dashed' | 'brush';

/**
 * 도형 하나.
 * 모든 좌표는 도화지 기준(px)이며, 회전·크기 변화는 점 좌표에 바로 반영해 둔다.
 * 이렇게 하면 "원래 도형의 점 i ↔ 대칭 도형의 점 i"를 바로 비교할 수 있어
 * 대칭 검사가 단순해진다.
 *  - circle  : points[0] = 중심, points[1] = 원 위의 한 점
 *  - text, bubble : points[0] = 글자 가운데 (회전은 rotation 값으로 그린다)
 */
export interface Shape {
  id: string;
  kind: ShapeKind;
  points: Vec[];
  stroke: string;
  strokeWidth: number;
  fill: string; // 'none' 이면 채우지 않음
  opacity: number; // 0 ~ 1
  lineStyle: LineStyle;
  rotation: number; // 화면에 보여 줄 회전 각도(도)
  shadow?: boolean; // 떠 있는 듯한 그림자
  text?: string;
  fontSize?: number;
  label?: string; // 스티커 이름 등
}

export type SymType = 'line' | 'point';

export interface SymPair {
  orig: string;
  copy: string;
}

/**
 * 대칭 도형 하나 = 원래 도형(들) + 대칭으로 복사된 도형(들) + 그때 쓴 대칭축/중심.
 * linked가 true이면 한 덩어리로 함께 움직이고, 모양을 바꾸면 짝도 거울처럼 바뀐다.
 */
export interface SymFigure {
  id: string;
  type: SymType;
  num: number; // 선대칭 ①, ② … 처럼 보여 줄 번호
  pairs: SymPair[];
  axis?: [Vec, Vec];
  center?: Vec;
  linked: boolean;
}

/** 도화지에 놓아 둔 대칭축 도구 */
export interface Axis {
  id: string;
  p1: Vec;
  p2: Vec;
}

/** 도화지에 찍어 둔 대칭의 중심 도구 */
export interface CenterPoint {
  id: string;
  p: Vec;
}

export type BgType = 'solid' | 'linear' | 'radial' | 'dots' | 'stripes' | 'checker' | 'clouds' | 'night' | 'floor';

export interface Background {
  type: BgType;
  c1: string;
  c2: string;
}

/** 되돌리기(실행 취소) 대상이 되는 작품 자료 */
export interface Doc {
  shapes: Shape[];
  figures: SymFigure[];
  axes: Axis[];
  centers: CenterPoint[];
  background: Background;
  popGrid: 1 | 2 | 3;
}

export type ArtStyleId = 'cubism' | 'surreal' | 'pop';

export type Screen = 'home' | 'style' | 'studio' | 'describe' | 'submit' | 'teacher';
export type Step = 1 | 2 | 3 | 4 | 5;

export type ToolId =
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'pan'
  | 'point'
  | 'segment'
  | 'line'
  | 'triangle'
  | 'rect'
  | 'polygon'
  | 'circle'
  | 'freehand'
  | 'text'
  | 'bubble'
  | 'axis'
  | 'center';

export interface Description {
  name: string;
  klass: string;
  title: string;
  style: string;
  feature: string;
  lineCount: string;
  pointCount: string;
  axisRole: string;
  centerRole: string;
  favorite: string;
}

export interface Settings {
  grid: boolean;
  gridSize: number;
  snapGrid: boolean;
  snapPoints: boolean;
  snapAngle: boolean;
  showCoords: boolean;
  showAngles: boolean;
  showAxes: boolean;
  showCenters: boolean;
}

export interface DrawStyle {
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
  lineStyle: LineStyle;
}
