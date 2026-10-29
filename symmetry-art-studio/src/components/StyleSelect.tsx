/** 1단계: 미술 사조 고르기 */
import { useStore } from '../state/store';
import { ART_STYLES, STYLE_ORDER } from '../data/artStyles';
import { TEMPLATE_PREVIEWS } from '../data/templates';
import { ArtworkSvg } from './art/Artwork';
import { Icon } from './Icon';

export function StyleSelect() {
  const { state, dispatch } = useStore();
  return (
    <div className="page style-page">
      <div className="page-head">
        <h2>1단계 · 내 작품에 쓸 현대미술 사조를 골라요</h2>
        <p className="muted">사조마다 특징과 색 분위기가 달라요. 나중에 바꿀 수도 있어요.</p>
      </div>
      <div className="style-cards">
        {STYLE_ORDER.map((id) => {
          const st = ART_STYLES[id];
          const on = state.style === id;
          return (
            <article key={id} className={`style-card${on ? ' on' : ''}`} style={{ ['--accent' as string]: st.accent }}>
              <div className="sc-preview">
                <ArtworkSvg doc={TEMPLATE_PREVIEWS[id]} prefix={`pv-${id}`} className="thumb" title={`${st.name} 도형 배치 예시`} />
                <span className="sc-tag">이런 방식으로 시작할 수 있어요</span>
              </div>
              <div className="sc-body">
                <h3>
                  {st.name} <small>{st.english}</small>
                </h3>
                <p className="sc-tagline">{st.tagline}</p>
                <h4>대표 특징</h4>
                <ul>
                  {st.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <h4>색 분위기</h4>
                <div className="mood">
                  {st.mood.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
                <h4>제작 팁</h4>
                <ul className="tips">
                  {st.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <button className={`btn block${on ? ' primary' : ''}`} onClick={() => dispatch({ type: 'style', style: id })} aria-pressed={on}>
                {on ? (
                  <>
                    <Icon name="check" /> 골랐어요
                  </>
                ) : (
                  `${st.name}로 하기`
                )}
              </button>
            </article>
          );
        })}
      </div>
      <div className="page-foot">
        <button
          className="btn primary huge"
          disabled={!state.style}
          onClick={() => dispatch({ type: 'step', step: 2 })}
        >
          다음: 대칭 도형 만들기 <Icon name="chevronRight" />
        </button>
        {!state.style && <p className="muted">사조를 하나 고르면 다음 단계로 갈 수 있어요.</p>}
      </div>
    </div>
  );
}
