/** 첫 화면 */
import { useStore } from '../state/store';
import { hasSavedWork } from '../state/persist';
import { APP_INTRO, APP_SUBTITLE, APP_TITLE } from '../data/texts';
import { Icon } from './Icon';

/*
 * 첫 화면 그림: 세 사조의 대표 작가 "화풍을 본떠" 도형으로 새로 그린 그림.
 * 피카소·마그리트·워홀의 작품은 아직 저작권 보호 기간이라 실제 작품을 복제해 넣지 않고,
 * 각 그림 안에 대칭이 숨어 있도록 직접 그렸다.
 */
const INK = '#2B2B2B';

/** 입체파 · 피카소 풍: 앞모습과 옆모습이 한 얼굴에 */
function CubistFace() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="피카소 풍으로 그린 입체파 얼굴">
      <rect width="240" height="300" fill="#D9CAB3" />
      <path d="M0 0H120V300H0Z" fill="#B89A6E" />
      <path d="M120 0H240V120L150 160Z" fill="#3E4A61" />
      <path d="M0 210L90 300H0Z" fill="#5B6C5D" />
      <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
        <path d="M120 38L62 82L48 160L70 232L120 264Z" fill="#E3C48D" />
        <path d="M120 38L176 74L196 150L182 226L120 264Z" fill="#C9A66B" />
        <path d="M120 38L176 74L150 120L120 110Z" fill="#8C6A43" opacity="0.85" />
        {/* 왼쪽: 앞에서 본 눈 / 오른쪽: 옆에서 본 눈 */}
        <path d="M66 128Q88 108 110 128Q88 146 66 128Z" fill="#fff" />
        <circle cx="88" cy="128" r="8" fill="#3E4A61" />
        <path d="M140 118L176 130L140 140Z" fill="#fff" />
        <circle cx="152" cy="130" r="5" fill={INK} />
        {/* 옆모습 코 */}
        <path d="M120 120L104 186L126 192Z" fill="#B5523B" />
        {/* 두 빛깔로 나뉜 입 */}
        <path d="M92 216Q108 206 120 214V228Q104 230 92 216Z" fill="#B5523B" />
        <path d="M120 214Q140 204 156 218Q138 232 120 228Z" fill="#7A2E22" />
        <path d="M48 160L18 150L28 196L58 196Z" fill="#5B6C5D" />
        <path d="M196 150L226 140L220 190L190 196Z" fill="#3E4A61" />
      </g>
    </svg>
  );
}

/** 초현실주의 · 마그리트 풍: 구름 하늘에 떠 있는 사과와 중절모 */
function SurrealSky() {
  const hat = (
    <g stroke="#111" strokeWidth="2">
      <ellipse cx="0" cy="14" rx="30" ry="7" fill="#1a1a1a" />
      <path d="M-18 13C-20 -14 -12 -20 0 -20S20 -14 18 13Z" fill="#1a1a1a" />
      <path d="M-18 6H18" stroke="#5a2a2a" strokeWidth="4" />
    </g>
  );
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="마그리트 풍으로 그린 초현실주의 하늘">
      <defs>
        <linearGradient id="home-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5E97D6" />
          <stop offset="1" stopColor="#CFE8FF" />
        </linearGradient>
      </defs>
      <rect width="240" height="300" fill="url(#home-sky)" />
      {[
        [50, 50, 1],
        [180, 34, 0.8],
        [200, 200, 0.9],
        [36, 190, 0.7],
      ].map(([x, y, k], i) => (
        <g key={i} fill="#fff" opacity="0.95" transform={`translate(${x} ${y}) scale(${k})`}>
          <ellipse cx="0" cy="0" rx="34" ry="14" />
          <ellipse cx="-16" cy="-6" rx="18" ry="14" />
          <ellipse cx="12" cy="-10" rx="20" ry="16" />
        </g>
      ))}
      <rect y="246" width="240" height="54" fill="#3D5A80" />
      <rect y="268" width="240" height="32" fill="#A89F91" />
      {/* 가운데 사과: 세로 대칭축에 맞춰 놓았다 */}
      <g stroke="#2E5E1E" strokeWidth="4">
        <path d="M120 112C92 92 58 112 62 150C66 196 100 214 120 202C140 214 174 196 178 150C182 112 148 92 120 112Z" fill="#7CB342" />
        <path d="M120 112C118 98 122 88 128 80" fill="none" stroke="#5D4037" strokeWidth="5" strokeLinecap="round" />
        <path d="M126 92C138 78 156 80 160 86C150 98 136 98 126 92Z" fill="#9CCC65" strokeWidth="3" />
      </g>
      {/* 사과 양쪽에 거울처럼 떠 있는 중절모 */}
      <g transform="translate(44 104) rotate(-12) scale(1.3)">{hat}</g>
      <g transform="translate(196 104) scale(-1 1) rotate(-12) scale(1.3)">{hat}</g>
      <g transform="translate(120 232) scale(0.7)">{hat}</g>
    </svg>
  );
}

/** 팝아트 · 워홀 풍: 같은 꽃을 2×2로 반복하고 칸마다 색을 바꾼 판화 */
function PopFlowers() {
  const combos = [
    ['#FF4FA3', '#FFD400', '#E10600'],
    ['#00C2FF', '#FF8A00', '#111111'],
    ['#FFD400', '#0057E7', '#FF4FA3'],
    ['#7CFC00', '#E10600', '#FFD400'],
  ];
  const petals = [
    [0, -26],
    [26, 0],
    [0, 26],
    [-26, 0],
  ];
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="워홀 풍으로 그린 팝아트 꽃 반복">
      {combos.map(([bg, petal, mid], k) => {
        const x = (k % 2) * 120;
        const y = Math.floor(k / 2) * 150;
        return (
          <g key={k} transform={`translate(${x} ${y})`}>
            <rect width="120" height="150" fill={bg} stroke={INK} strokeWidth="4" />
            <g transform="translate(60 75)">
              {/* 판화처럼 살짝 어긋난 검은 윤곽 */}
              <g fill="none" stroke={INK} strokeWidth="3" transform="translate(4 3)">
                {petals.map(([px, py], i) => (
                  <circle key={i} cx={px} cy={py} r="20" />
                ))}
              </g>
              {petals.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r="20" fill={petal} stroke={INK} strokeWidth="3" />
              ))}
              <circle r="12" fill={mid} stroke={INK} strokeWidth="3" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

const HERO_WORKS = [
  { Art: CubistFace, style: '입체파', artist: '파블로 피카소 풍', works: '「아비뇽의 처녀들」(1907), 「우는 여인」(1937)', sym: '앞모습 눈과 옆모습 눈 — 대칭을 일부러 깨뜨렸어요' },
  { Art: SurrealSky, style: '초현실주의', artist: '르네 마그리트 풍', works: '「인간의 아들」(1964), 「골콘다」(1953)', sym: '사과를 가운데 두고 중절모가 선대칭' },
  { Art: PopFlowers, style: '팝아트', artist: '앤디 워홀 풍', works: '「마릴린 먼로」(1962), 「꽃」(1964)', sym: '꽃 한 송이가 점대칭, 같은 꽃을 2×2로 반복' },
];

function HeroArt() {
  return (
    <div className="hero-gallery">
      <div className="hero-frames">
        {HERO_WORKS.map(({ Art, style, artist, works, sym }) => (
          <figure key={style} className="hero-frame">
            <Art />
            <figcaption>
              <b>{style}</b>
              <span className="artist">{artist}</span>
              <span className="works">{works}</span>
              <span className="sym">{sym}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="hero-note">※ 세 작가의 화풍을 본떠 도형으로 새로 그린 그림이에요. 실제 작품은 수업 시간에 미술관 누리집이나 교과서로 감상해요.</p>
    </div>
  );
}

export function Home({ onHowTo }: { onHowTo: () => void }) {
  const { state, dispatch } = useStore();
  const saved = hasSavedWork() || state.doc.shapes.length > 0;

  const start = () => dispatch({ type: 'step', step: state.style ? state.step : 1 });

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-text">
          <p className="eyebrow">미술 × 수학 융합 프로젝트 · 합동과 대칭</p>
          <h1>
            {APP_TITLE}
            <span>{APP_SUBTITLE}</span>
          </h1>
          <p className="lead">{APP_INTRO}</p>
          <div className="home-buttons">
            <button className="btn primary huge" onClick={start}>
              <Icon name="sparkle" size={26} /> {saved ? '이어서 하기' : '시작하기'}
            </button>
            {saved && (
              <button
                className="btn huge"
                onClick={() => {
                  if (window.confirm('지금까지 만든 작품을 지우고 새로 시작할까요? 지운 작품은 되돌릴 수 없어요.')) dispatch({ type: 'resetWork' });
                }}
              >
                새로 시작하기
              </button>
            )}
          </div>
          <div className="home-buttons">
            <button className="btn" onClick={onHowTo}>
              <Icon name="help" /> 학생용 사용 방법
            </button>
            <button className="btn" onClick={() => dispatch({ type: 'go', screen: 'teacher' })}>
              <Icon name="teacher" /> 교사용 간단 안내
            </button>
          </div>
        </div>
        <HeroArt />
      </div>
      <div className="home-steps">
        {['사조 고르기', '대칭 도형 만들기', '작품 구성하기', '작품 설명 쓰기', '확인·제출'].map((s, i) => (
          <div key={s} className="home-step">
            <b>{i + 1}</b>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
