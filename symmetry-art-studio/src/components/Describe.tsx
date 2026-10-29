/** 4단계: 작품 설명 쓰기 (입력하는 대로 자동 저장) */
import { useMemo, useState, type ReactNode } from 'react';
import type { Description } from '../types';
import { useStore } from '../state/store';
import { countFigures } from '../geometry/symmetry';
import { ART_STYLES } from '../data/artStyles';
import { ArtworkSvg } from './art/Artwork';
import { Icon } from './Icon';

/** 인쇄·결과지에 들어갈 완성 문장 */
export function buildSentences(d: Description): string[] {
  const b = (s: string) => s.trim() || '______';
  return [
    `내 작품은 ${b(d.style)} 사조를 활용하여 만들었습니다.`,
    `이 사조의 특징인 ${b(d.feature)}을(를) 작품에 표현했습니다.`,
    `내 작품에는 선대칭 도형이 ${b(d.lineCount)}개 있습니다.`,
    `내 작품에는 점대칭 도형이 ${b(d.pointCount)}개 있습니다.`,
    `선대칭도형에서는 대칭축이 ${b(d.axisRole)} 역할을 합니다.`,
    `점대칭도형에서는 대칭의 중심이 ${b(d.centerRole)} 역할을 합니다.`,
    `가장 마음에 드는 부분은 ${b(d.favorite)}입니다.`,
  ];
}

export const DESC_REQUIRED: (keyof Description)[] = ['style', 'feature', 'lineCount', 'pointCount', 'axisRole', 'centerRole', 'favorite'];

function Sentence({ before, after, children, hint }: { before: string; after: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sentence">
      <div className="sentence-line">
        <span>{before}</span>
        {children}
        <span>{after}</span>
      </div>
      {hint}
    </div>
  );
}

function Helper({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="helper">
      <button className="btn tiny ghost" onClick={() => setOpen(!open)}>
        <Icon name="help" size={16} /> 생각 도우미
      </button>
      {open && <p>{text}</p>}
    </div>
  );
}

export function Describe() {
  const { state, dispatch } = useStore();
  const d = state.desc;
  const set = (patch: Partial<Description>) => dispatch({ type: 'desc', patch });
  const counts = useMemo(() => countFigures(state.doc, state.settings.gridSize), [state.doc, state.settings.gridSize]);
  const st = state.style ? ART_STYLES[state.style] : null;

  const addKeyword = (k: string) => set({ feature: d.feature.trim() ? `${d.feature.trim()}, ${k}` : k });

  return (
    <div className="page describe-page">
      <div className="page-head">
        <h2>4단계 · 내 작품을 문장으로 설명해요</h2>
        <p className="muted">빈칸을 채워 문장을 완성해 보세요. 쓰는 내용은 자동으로 저장돼요.</p>
      </div>
      <div className="describe-grid">
        <div className="describe-art">
          <ArtworkSvg doc={state.doc} prefix="ds" className="art-preview" />
          <div className="art-facts">
            <span>사조: {st?.name ?? '아직 안 고름'}</span>
            <span className="line">선대칭 도형 {counts.line}개</span>
            <span className="point">점대칭 도형 {counts.point}개</span>
          </div>
          <div className="who">
            <label>
              작품 제목
              <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="예: 하늘을 나는 거울 집" maxLength={30} />
            </label>
            <label>
              반·번호
              <input value={d.klass} onChange={(e) => set({ klass: e.target.value })} placeholder="예: 5학년 2반 7번" maxLength={20} />
            </label>
            <label>
              이름
              <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="이름" maxLength={12} />
            </label>
          </div>
        </div>

        <div className="describe-form">
          <Sentence before="내 작품은" after="사조를 활용하여 만들었습니다.">
            <input className="blank" value={d.style} onChange={(e) => set({ style: e.target.value })} placeholder="사조 이름" />
          </Sentence>
          {st && !d.style && (
            <div className="chip-row">
              <button className="kw" onClick={() => set({ style: st.name })}>
                + {st.name}
              </button>
            </div>
          )}

          <Sentence before="이 사조의 특징인" after="을(를) 작품에 표현했습니다.">
            <input className="blank wide" value={d.feature} onChange={(e) => set({ feature: e.target.value })} placeholder="사조의 특징" />
          </Sentence>
          {st && (
            <div className="chip-row">
              {st.keywords.map((k) => (
                <button key={k} className="kw" onClick={() => addKeyword(k)}>
                  + {k}
                </button>
              ))}
            </div>
          )}

          <Sentence
            before="내 작품에는 선대칭 도형이"
            after="개 있습니다."
            hint={d.lineCount && Number(d.lineCount) !== counts.line ? <p className="soft-warn">작품 속 선대칭 도형을 다시 세어 보세요. (위쪽 표시를 참고해요)</p> : null}
          >
            <input className="blank num" inputMode="numeric" value={d.lineCount} onChange={(e) => set({ lineCount: e.target.value.replace(/[^0-9]/g, '') })} placeholder="?" />
          </Sentence>

          <Sentence
            before="내 작품에는 점대칭 도형이"
            after="개 있습니다."
            hint={d.pointCount && Number(d.pointCount) !== counts.point ? <p className="soft-warn">작품 속 점대칭 도형을 다시 세어 보세요. (위쪽 표시를 참고해요)</p> : null}
          >
            <input className="blank num" inputMode="numeric" value={d.pointCount} onChange={(e) => set({ pointCount: e.target.value.replace(/[^0-9]/g, '') })} placeholder="?" />
          </Sentence>

          <Sentence
            before="선대칭도형에서는 대칭축이"
            after="역할을 합니다."
            hint={<Helper text="대칭축을 따라 접으면 양쪽 도형은 어떻게 되나요? 대응점을 이은 선분과 대칭축은 어떻게 만나나요?" />}
          >
            <textarea className="blank wide" rows={2} value={d.axisRole} onChange={(e) => set({ axisRole: e.target.value })} placeholder="대칭축이 하는 일" />
          </Sentence>

          <Sentence
            before="점대칭도형에서는 대칭의 중심이"
            after="역할을 합니다."
            hint={<Helper text="도형을 180° 돌릴 때 어느 점을 기준으로 돌리나요? 대응점을 이은 선분에서 대칭의 중심은 어디에 있나요?" />}
          >
            <textarea className="blank wide" rows={2} value={d.centerRole} onChange={(e) => set({ centerRole: e.target.value })} placeholder="대칭의 중심이 하는 일" />
          </Sentence>

          <Sentence before="가장 마음에 드는 부분은" after="입니다.">
            <textarea className="blank wide" rows={2} value={d.favorite} onChange={(e) => set({ favorite: e.target.value })} placeholder="마음에 드는 부분과 그 까닭" />
          </Sentence>
        </div>
      </div>
      <div className="page-foot">
        <button className="btn" onClick={() => dispatch({ type: 'step', step: 3 })}>
          <Icon name="chevronLeft" /> 작품 고치러 가기
        </button>
        <button className="btn primary huge" onClick={() => dispatch({ type: 'step', step: 5 })}>
          다음: 확인·제출 <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  );
}
