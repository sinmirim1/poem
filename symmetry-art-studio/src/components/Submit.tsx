/** 5단계: 확인 및 제출 (조건 확인, PNG 저장, 인쇄용 결과지) */
import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { countFigures } from '../geometry/symmetry';
import { ART_STYLES } from '../data/artStyles';
import { ArtworkSvg } from './art/Artwork';
import { Icon } from './Icon';
import { DESC_REQUIRED, buildSentences } from './Describe';
import { saveArtworkPng, saveResultSheetPng } from '../utils/exportImage';

export function Submit() {
  const { state, dispatch } = useStore();
  const { doc, desc } = state;
  const counts = useMemo(() => countFigures(doc, state.settings.gridSize), [doc, state.settings.gridSize]);
  const [busy, setBusy] = useState(false);
  const styleName = state.style ? ART_STYLES[state.style].name : '';
  const missing = DESC_REQUIRED.filter((k) => !desc[k].trim()).length;

  const checks = [
    { ok: !!state.style, text: '미술 사조를 골랐어요', fix: '1단계에서 사조를 골라 주세요.', step: 1 as const },
    { ok: counts.line >= 3, text: `선대칭 도형이 3개 이상이에요 (지금 ${counts.line}개)`, fix: `선대칭 도형을 ${Math.max(0, 3 - counts.line)}개 더 만들어 주세요.`, step: 2 as const },
    { ok: counts.point >= 3, text: `점대칭 도형이 3개 이상이에요 (지금 ${counts.point}개)`, fix: `점대칭 도형을 ${Math.max(0, 3 - counts.point)}개 더 만들어 주세요.`, step: 2 as const },
    { ok: missing === 0, text: '작품 설명을 모두 썼어요', fix: `아직 비어 있는 빈칸이 ${missing}개 있어요.`, step: 4 as const },
  ];
  const allOk = checks.every((c) => c.ok);

  const notes: string[] = [];
  if (counts.broken) notes.push(`대칭이 어긋난 도형이 ${counts.broken}개 있어서 개수에서 빠졌어요. 작품 화면에서 빨간 표시를 눌러 힌트를 확인해 보세요.`);
  if (desc.lineCount && Number(desc.lineCount) !== counts.line) notes.push(`설명에 쓴 선대칭 도형 수(${desc.lineCount}개)와 작품 속 개수(${counts.line}개)가 달라요.`);
  if (desc.pointCount && Number(desc.pointCount) !== counts.point) notes.push(`설명에 쓴 점대칭 도형 수(${desc.pointCount}개)와 작품 속 개수(${counts.point}개)가 달라요.`);

  const sentences = buildSentences(desc);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await fn();
      dispatch({ type: 'toast', text: done, tone: 'good' });
    } catch {
      dispatch({ type: 'toast', text: '저장하지 못했어요. 다른 브라우저(크롬, 엣지)에서 다시 해 보세요.', tone: 'warn' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page submit-page">
      <div className="page-head no-print">
        <h2>5단계 · 확인하고 저장해요</h2>
        <p className="muted">조건을 모두 채우면 "작품 완성" 도장이 찍혀요.</p>
      </div>

      <div className="submit-grid no-print">
        <section className="check-list">
          {checks.map((c) => (
            <div key={c.text} className={`check-item${c.ok ? ' ok' : ''}`}>
              <span className="ci-icon">
                <Icon name={c.ok ? 'check' : 'warn'} />
              </span>
              <div>
                <b>{c.text}</b>
                {!c.ok && (
                  <p>
                    {c.fix}{' '}
                    <button className="link" onClick={() => dispatch({ type: 'step', step: c.step })}>
                      {c.step}단계로 가기 →
                    </button>
                  </p>
                )}
              </div>
            </div>
          ))}
          {notes.map((n) => (
            <p key={n} className="soft-warn">
              <Icon name="info" size={18} /> {n}
            </p>
          ))}
          <div className={`stamp${allOk ? ' done' : ''}`}>{allOk ? '작품 완성!' : '진행 중'}</div>
        </section>

        <section className="save-box">
          <h3>저장하기</h3>
          <button className="btn primary block" disabled={busy} onClick={() => run(() => saveArtworkPng(doc, desc.name), '작품 그림(PNG)을 저장했어요. "다운로드" 폴더를 확인해 보세요.')}>
            <Icon name="download" /> 작품 그림 PNG로 저장
          </button>
          <button
            className="btn block"
            disabled={busy}
            onClick={() =>
              run(
                () => saveResultSheetPng(doc, desc, { styleName: styleName || '-', lineCount: counts.line, pointCount: counts.point, sentences }),
                '설명이 들어간 결과지(PNG)를 저장했어요.',
              )
            }
          >
            <Icon name="download" /> 설명 포함 결과지 PNG로 저장
          </button>
          <button className="btn block" onClick={() => window.print()}>
            <Icon name="print" /> 인쇄하기 / PDF로 저장
          </button>
          <p className="muted small">PDF로 저장하려면 인쇄 창의 "대상(프린터)"에서 "PDF로 저장"을 고르세요.</p>
          <button className="btn ghost block" onClick={() => dispatch({ type: 'step', step: 3 })}>
            <Icon name="chevronLeft" /> 작품 더 고치기
          </button>
        </section>
      </div>

      <h3 className="no-print sheet-title">결과지 미리보기</h3>
      <article className="print-sheet">
        <header>
          <div>
            <h1>{desc.title ? `「${desc.title}」` : '대칭 아트 스튜디오 작품'}</h1>
            <p>
              {desc.klass} {desc.name}
            </p>
          </div>
          {allOk && <div className="stamp done small">작품 완성!</div>}
        </header>
        <ArtworkSvg doc={doc} prefix="pr" className="sheet-art" />
        <div className="sheet-facts">
          <span>사조: {styleName || '-'}</span>
          <span>선대칭 도형: {counts.line}개</span>
          <span>점대칭 도형: {counts.point}개</span>
          <span>{new Date().toLocaleDateString('ko-KR')}</span>
        </div>
        <ol className="sheet-sentences">
          {sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <footer>대칭 아트 스튜디오: 수학으로 만드는 현대미술</footer>
      </article>
    </div>
  );
}
