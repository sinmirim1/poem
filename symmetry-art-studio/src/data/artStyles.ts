/** 세 가지 현대미술 사조의 안내 내용과 색 */
import type { ArtStyleId, Background, LineStyle } from '../types';

export interface ArtStyle {
  id: ArtStyleId;
  name: string;
  english: string;
  tagline: string;
  features: string[];
  mood: string[]; // 색 분위기 견본
  tips: string[];
  guide: string; // 작품 제작 화면의 안내 문구
  keywords: string[]; // 작품 설명 쓰기에서 눌러 넣을 수 있는 특징 낱말
  palette: string[];
  backgrounds: { name: string; bg: Background }[];
  defaults: { stroke: string; fill: string; strokeWidth: number; opacity: number; lineStyle: LineStyle };
  accent: string;
}

export const ART_STYLES: Record<ArtStyleId, ArtStyle> = {
  surreal: {
    id: 'surreal',
    name: '초현실주의',
    english: 'Surrealism',
    tagline: '꿈속처럼 낯설고 신비한 장면',
    features: ['현실과 다른 낯선 조합', '크기와 위치가 현실과 달라요', '꿈, 상상, 환상 같은 분위기'],
    mood: ['#7FB7E8', '#F4E1C1', '#E07A5F', '#3D405B', '#8E7DBE'],
    tips: ['아주 작은 물건을 아주 크게 키워 보세요.', '하늘에 떠 있는 도형을 만들어 보세요.', '대칭축을 가로로 놓으면 물에 비친 듯한 장면이 돼요.'],
    guide:
      '익숙한 도형을 낯선 방식으로 조합해 보세요. 하늘에 떠 있는 집, 거대한 눈, 뒤집힌 물건처럼 상상 속 장면을 만들어도 좋습니다.',
    keywords: ['낯선 조합', '꿈 같은 분위기', '크기 과장', '떠 있는 물체', '뒤집힌 모습', '상상 속 장면'],
    palette: ['#7FB7E8', '#3D405B', '#E07A5F', '#F2C14E', '#81B29A', '#F4F1DE', '#8E7DBE', '#C9ADA7'],
    backgrounds: [
      { name: '꿈속 바닥', bg: { type: 'floor', c1: '#9CC9F0', c2: '#6B4E9B' } },
      { name: '구름 하늘', bg: { type: 'clouds', c1: '#6FA8DC', c2: '#CFE8FF' } },
      { name: '노을', bg: { type: 'linear', c1: '#F6AE7B', c2: '#5B4B8A' } },
      { name: '밤하늘', bg: { type: 'night', c1: '#0B1D3A', c2: '#3A2B6B' } },
    ],
    defaults: { stroke: '#3D405B', fill: '#F2C14E', strokeWidth: 3, opacity: 1, lineStyle: 'solid' },
    accent: '#6B4E9B',
  },
  cubism: {
    id: 'cubism',
    name: '입체파',
    english: 'Cubism',
    tagline: '여러 방향에서 본 모습을 한 화면에',
    features: ['한 대상을 여러 방향에서 본 것처럼', '도형으로 나누고 다시 조합해요', '면, 선, 기하학적 형태가 강조돼요'],
    mood: ['#8C6A43', '#C9A66B', '#5B6C5D', '#3E4A61', '#D9CAB3'],
    tips: ['삼각형·사각형 조각으로 얼굴이나 악기를 만들어 보세요.', '조각을 반투명하게 겹쳐 보세요.', '굵은 외곽선으로 면을 나눠 보세요.'],
    guide: '하나의 대상을 여러 조각의 도형으로 나누고, 다른 방향에서 본 모습처럼 다시 조합해 보세요.',
    keywords: ['도형으로 나누기', '여러 방향에서 본 모습', '면의 겹침', '기하학적 형태', '굵은 외곽선', '차분한 색'],
    palette: ['#8C6A43', '#C9A66B', '#5B6C5D', '#3E4A61', '#A3A3A3', '#D9CAB3', '#B5523B', '#2B2B2B'],
    backgrounds: [
      { name: '종이', bg: { type: 'solid', c1: '#EFE6D2', c2: '#EFE6D2' } },
      { name: '갈색 면', bg: { type: 'linear', c1: '#D9CAB3', c2: '#8C6A43' } },
      { name: '체크', bg: { type: 'checker', c1: '#E6DCC6', c2: '#CDBF9F' } },
      { name: '회색 줄무늬', bg: { type: 'stripes', c1: '#D7D2C8', c2: '#BDB6A8' } },
    ],
    defaults: { stroke: '#2B2B2B', fill: '#C9A66B', strokeWidth: 4, opacity: 0.8, lineStyle: 'solid' },
    accent: '#8C6A43',
  },
  pop: {
    id: 'pop',
    name: '팝아트',
    english: 'Pop Art',
    tagline: '선명한 색, 반복, 만화 같은 재미',
    features: ['강렬하고 선명한 원색', '같은 모양의 반복과 복제', '만화처럼 굵은 외곽선과 말풍선'],
    mood: ['#E10600', '#FFD400', '#0057E7', '#FF4FA3', '#111111'],
    tips: ['같은 도형을 2×2, 3×3으로 반복해 보세요.', '굵은 검은 외곽선을 넣어 보세요.', '말풍선에 짧은 감탄사를 넣어 보세요.'],
    guide: '같은 도형을 반복하고, 강한 색을 사용해 보세요. 짧은 단어나 감탄사를 넣어도 좋습니다.',
    keywords: ['선명한 원색', '반복과 복제', '굵은 외곽선', '말풍선과 글자', '점무늬', '일상 물건'],
    palette: ['#E10600', '#FFD400', '#0057E7', '#00A86B', '#FF4FA3', '#00C2FF', '#111111', '#FFFFFF'],
    backgrounds: [
      { name: '노랑 점무늬', bg: { type: 'dots', c1: '#FFE14D', c2: '#FF8A00' } },
      { name: '분홍 점무늬', bg: { type: 'dots', c1: '#FFC2E2', c2: '#FF4FA3' } },
      { name: '파랑 줄무늬', bg: { type: 'stripes', c1: '#7FD3FF', c2: '#0057E7' } },
      { name: '빨강', bg: { type: 'solid', c1: '#E10600', c2: '#E10600' } },
    ],
    defaults: { stroke: '#111111', fill: '#E10600', strokeWidth: 6, opacity: 1, lineStyle: 'solid' },
    accent: '#E10600',
  },
};

/** 사조 고르기 화면·사조 도구·교사용 화면에 보여 줄 순서 */
export const STYLE_ORDER: ArtStyleId[] = ['cubism', 'surreal', 'pop'];

export const BASIC_COLORS = ['#111111', '#FFFFFF', '#9E9E9E', '#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#6D4C41'];

export const DEFAULT_BG: Background = { type: 'solid', c1: '#FFFFFF', c2: '#FFFFFF' };

/** 팝아트 반복 배치 칸마다 바꿔 줄 색 */
export const POP_CELL_BG = ['#FFE14D', '#FF4FA3', '#00C2FF', '#7CFC00', '#FF8A00', '#B388FF', '#FFFFFF', '#E10600', '#00A86B'];
export const POP_HUES = [0, 120, 240, 60, 180, 300, 30, 150, 270];
