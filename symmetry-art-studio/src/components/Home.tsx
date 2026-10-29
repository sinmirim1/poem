/** 첫 화면 */
import { useStore } from '../state/store';
import { hasSavedWork } from '../state/persist';
import { APP_INTRO, APP_SUBTITLE, APP_TITLE } from '../data/texts';
import { Icon } from './Icon';

/** 첫 화면 그림: 선대칭(왼쪽)과 점대칭(오른쪽) */
function HeroArt() {
  return (
    <svg viewBox="0 0 520 300" className="hero-art" aria-hidden="true">
      <rect width="520" height="300" rx="24" fill="#FFF8E7" />
      <g opacity="0.5" stroke="#d8cdb5" strokeWidth="1">
        {Array.from({ length: 13 }, (_, i) => (
          <path key={`v${i}`} d={`M${i * 40 + 20} 0V300`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`h${i}`} d={`M0 ${i * 40 + 10}H520`} />
        ))}
      </g>
      {/* 선대칭: 나비 */}
      <path d="M140 50V270" stroke="#2F6FED" strokeWidth="3" strokeDasharray="10 7" />
      <path d="M140 150 L60 70 L40 140 L90 170 L50 230 L140 180Z" fill="#FF5D8F" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
      <path d="M140 150 L220 70 L240 140 L190 170 L230 230 L140 180Z" fill="#FFD60A" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="85" cy="120" r="12" fill="#1d2a4d" />
      <circle cx="195" cy="120" r="12" fill="#1d2a4d" />
      {/* 점대칭: 바람개비 */}
      <g transform="translate(380 150)">
        <path d="M0 0 L0 -100 L60 -40Z" fill="#2F6FED" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
        <path d="M0 0 L0 100 L-60 40Z" fill="#2F6FED" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
        <path d="M0 0 L100 0 L40 60Z" fill="#E4572E" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
        <path d="M0 0 L-100 0 L-40 -60Z" fill="#E4572E" stroke="#1d2a4d" strokeWidth="4" strokeLinejoin="round" />
        <circle r="9" fill="#fff" stroke="#8B3DFF" strokeWidth="4" />
        <path d="M-16 0H16M0 -16V16" stroke="#8B3DFF" strokeWidth="3" />
      </g>
    </svg>
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
