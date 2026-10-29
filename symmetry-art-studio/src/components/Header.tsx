/** 위쪽 막대: 앱 이름, 단계 표시기, 조건 달성 현황, 저장 상태 */
import { useMemo } from 'react';
import { useStore } from '../state/store';
import { countFigures } from '../geometry/symmetry';
import { ART_STYLES } from '../data/artStyles';
import { APP_TITLE, STEPS } from '../data/texts';
import { Icon } from './Icon';

export function toggleFullscreen() {
  const d = document as Document & { webkitFullscreenElement?: Element };
  if (document.fullscreenElement || d.webkitFullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function ProgressChips() {
  const { state } = useStore();
  const c = useMemo(() => countFigures(state.doc, state.settings.gridSize), [state.doc, state.settings.gridSize]);
  const done = c.line >= 3 && c.point >= 3;
  return (
    <div className="chips" aria-label="프로젝트 조건 달성 현황">
      <span className={`chip${state.style ? ' ok' : ''}`}>
        {state.style ? <Icon name="check" size={16} /> : null}
        사조: {state.style ? ART_STYLES[state.style].name : '아직 안 고름'}
      </span>
      <span className={`chip line${c.line >= 3 ? ' ok' : ''}`}>
        {c.line >= 3 && <Icon name="check" size={16} />}
        선대칭 도형 <b>{c.line}</b> / 3개
      </span>
      <span className={`chip point${c.point >= 3 ? ' ok' : ''}`}>
        {c.point >= 3 && <Icon name="check" size={16} />}
        점대칭 도형 <b>{c.point}</b> / 3개
      </span>
      {c.broken > 0 && (
        <span className="chip warn" title="대칭이 어긋난 도형은 개수에서 빠져요">
          <Icon name="warn" size={16} /> 확인 필요 {c.broken}개
        </span>
      )}
      <span className={`chip status${done ? ' ok' : ''}`}>{done ? '대칭 조건 완료' : '진행 중'}</span>
    </div>
  );
}

export function Header({ onHowTo }: { onHowTo: () => void }) {
  const { state, dispatch } = useStore();
  const inFlow = state.screen !== 'home' && state.screen !== 'teacher';
  const saved = state.savedAt ? new Date(state.savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <header className="app-header">
      <div className="header-row">
        <button className="brand" onClick={() => dispatch({ type: 'go', screen: 'home' })} title="첫 화면으로">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <path d="M16 4 L4 26 L16 26Z" fill="#ff5d5d" />
            <path d="M16 4 L28 26 L16 26Z" fill="#2f6fed" />
            <path d="M16 1v30" stroke="#1d2a4d" strokeWidth="2" strokeDasharray="3 2" />
          </svg>
          <span>{APP_TITLE}</span>
        </button>

        {inFlow && (
          <nav className="stepper" aria-label="작업 단계">
            {STEPS.map((s) => {
              const cls = s.step === state.step ? 'current' : s.step < state.step ? 'done' : '';
              return (
                <button key={s.step} className={`step ${cls}`} onClick={() => dispatch({ type: 'step', step: s.step })} aria-current={s.step === state.step ? 'step' : undefined} title={s.todo}>
                  <span className="num">{s.step < state.step ? <Icon name="check" size={14} /> : s.step}</span>
                  <span className="name">{s.name}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div className="header-actions">
          {saved && (
            <span className="saved" title="이 컴퓨터의 브라우저에 자동으로 저장돼요">
              <Icon name="check" size={14} /> 자동 저장 {saved}
            </span>
          )}
          <button className="btn small ghost" onClick={onHowTo}>
            <Icon name="help" size={18} /> 사용 방법
          </button>
          <button className="btn small ghost" onClick={() => dispatch({ type: 'go', screen: 'teacher' })}>
            <Icon name="teacher" size={18} /> 교사용
          </button>
          <button className="icon-btn" onClick={toggleFullscreen} title="전체 화면" aria-label="전체 화면">
            <Icon name="fullscreen" />
          </button>
        </div>
      </div>
      {inFlow && <ProgressChips />}
    </header>
  );
}
