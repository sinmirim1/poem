/** 오른쪽 패널: 고른 도형의 속성 / 사조 도구 */
import { useEffect, useState, type ReactNode } from 'react';
import type { BgType, Shape } from '../../types';
import { useStore } from '../../state/store';
import { Icon } from '../Icon';
import { ART_STYLES, BASIC_COLORS, STYLE_ORDER } from '../../data/artStyles';
import { STICKERS } from '../../data/stickers';
import { KIND_NAMES, flipShape, shapeCenter, transformShape, translateShape } from '../../geometry/shapes';
import { lineAngleForDisplay, rotateAround, vec } from '../../geometry/vec';
import { checkFigure, figTitle, figureMembers, figuresOfShape } from '../../geometry/symmetry';
import { dissolveFigure, fixFigure, setFigureLinked, splitShapes, styleShapes } from '../../state/ops';
import { toInputColor } from '../../utils/color';
import { useActions } from './useActions';

function Swatches({ colors, value, onPick, allowNone }: { colors: string[]; value: string; onPick: (c: string) => void; allowNone?: boolean }) {
  return (
    <div className="swatches">
      {allowNone && (
        <button className={`swatch none${value === 'none' ? ' on' : ''}`} onClick={() => onPick('none')} title="채우지 않기" aria-label="채우지 않기" />
      )}
      {colors.map((c) => (
        <button key={c} className={`swatch${value.toUpperCase() === c.toUpperCase() ? ' on' : ''}`} style={{ background: c }} onClick={() => onPick(c)} title={c} aria-label={`색 ${c}`} />
      ))}
      <label className="swatch custom" title="다른 색 고르기">
        <input type="color" value={toInputColor(value)} onChange={(e) => onPick(e.target.value)} aria-label="다른 색 고르기" />
        <Icon name="palette" size={16} />
      </label>
    </div>
  );
}

function Card({ title, children, tone }: { title?: ReactNode; children: ReactNode; tone?: string }) {
  return (
    <div className={`card${tone ? ' ' + tone : ''}`}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

function usePalette() {
  const { state } = useStore();
  const style = state.style ? ART_STYLES[state.style] : null;
  const main = style?.palette ?? [];
  return [...new Set([...main, ...BASIC_COLORS].map((c) => c.toUpperCase()))];
}

// ───────────────────────── 속성 ─────────────────────────
function PropertiesTab() {
  const { state, dispatch } = useStore();
  const act = useActions();
  const palette = usePalette();
  const { doc, selection, settings, drawStyle } = state;
  const grid = settings.gridSize;
  const byId = new Map(doc.shapes.map((s) => [s.id, s]));
  const sel = selection.map((id) => byId.get(id)).filter(Boolean) as Shape[];
  const first = sel[0];
  const look = first ?? { ...drawStyle, shadow: false };

  // 슬라이더는 누르는 순간 한 번만 되돌리기 기록을 남기고, 끄는 동안은 기록 없이 바꾼다.
  const sliderStart = () => sel.length && dispatch({ type: 'checkpoint' });
  const sliderChange = (patch: Partial<Shape>) => {
    if (sel.length) dispatch({ type: 'doc', doc: styleShapes(doc, selection, patch) });
    dispatch({ type: 'drawStyle', patch: patch as Partial<typeof drawStyle> });
  };

  // ── 대칭축/중심을 골랐을 때 ──
  if (!sel.length && state.guideSel) {
    const g = state.guideSel;
    const ax = g.kind === 'axis' ? doc.axes.find((a) => a.id === g.id) : null;
    return (
      <div className="panel-body">
        <Card title={g.kind === 'axis' ? '대칭축' : '대칭의 중심'} tone={g.kind === 'axis' ? 'line' : 'point'}>
          {ax && <p className="muted">기울기 {lineAngleForDisplay(ax.p1, ax.p2)}° · 끌면 옮겨지고, 양 끝 동그라미를 끌면 기울기가 바뀌어요.</p>}
          {!ax && <p className="muted">끌어서 옮길 수 있어요. 도형을 고르고 "점대칭 복사"를 누르면 이 점을 중심으로 복사돼요.</p>}
          <button className="btn small block" onClick={act.remove}>
            <Icon name="trash" size={18} /> 지우기
          </button>
        </Card>
      </div>
    );
  }

  const single = sel.length === 1 ? first : null;
  const figs = single ? figuresOfShape(doc, single.id) : [];
  const name = sel.length ? (single ? single.label ?? KIND_NAMES[single.kind] : `도형 ${sel.length}개`) : '새로 그릴 도형';
  // 선분·직선·점은 면이 없어서 채우기 색이 없다. 자유선은 칠하면 닫힌 도형이 된다.
  const showFill = !single || (single.kind !== 'segment' && single.kind !== 'line' && single.kind !== 'point');

  return (
    <div className="panel-body">
      <Card
        title={
          <>
            색과 선 <span className="badge soft">{name}</span>
          </>
        }
      >
        {!sel.length && <p className="muted small">도화지의 도형을 누르면 그 도형을 꾸밀 수 있어요. 지금 고르는 색은 앞으로 그릴 도형에 쓰여요.</p>}
        {single && (single.kind === 'text' || single.kind === 'bubble') && (
          <label className="text-field">
            <span>글자 내용</span>
            <input
              value={single.text ?? ''}
              maxLength={20}
              onFocus={() => dispatch({ type: 'checkpoint' })}
              onChange={(e) => dispatch({ type: 'doc', doc: styleShapes(doc, [single.id], { text: e.target.value }) })}
            />
          </label>
        )}
        {showFill && (
          <div className="prop">
            <span className="prop-label">{single?.kind === 'text' ? '글자 색' : single?.kind === 'bubble' ? '말풍선 색' : '채우기 색'}</span>
            <Swatches colors={palette} value={look.fill} onPick={(c) => act.applyStyle({ fill: c })} allowNone={!single || (single.kind !== 'text' && single.kind !== 'bubble')} />
            {single?.kind === 'freehand' && <p className="muted small">자유선에 색을 칠하면 시작점과 끝점이 이어진 닫힌 도형으로 채워져요.</p>}
          </div>
        )}
        <div className="prop">
          <span className="prop-label">{single?.kind === 'bubble' ? '테두리·글자 색' : single?.kind === 'point' ? '점 색' : '선 색'}</span>
          <Swatches colors={palette} value={look.stroke} onPick={(c) => act.applyStyle({ stroke: c })} />
        </div>
        <div className="prop">
          <span className="prop-label">
            선 굵기 <b>{look.strokeWidth}</b>
          </span>
          <input type="range" min={1} max={30} value={look.strokeWidth} onPointerDown={sliderStart} onChange={(e) => sliderChange({ strokeWidth: Number(e.target.value) })} aria-label="선 굵기" />
        </div>
        <div className="prop">
          <span className="prop-label">선 모양</span>
          <div className="seg">
            {(
              [
                ['solid', '보통'],
                ['dashed', '점선'],
                ['brush', '붓터치'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} className={look.lineStyle === v ? 'on' : ''} onClick={() => act.applyStyle({ lineStyle: v })}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="prop">
          <span className="prop-label">
            투명도 <b>{Math.round(look.opacity * 100)}%</b>
          </span>
          <input type="range" min={10} max={100} value={Math.round(look.opacity * 100)} onPointerDown={sliderStart} onChange={(e) => sliderChange({ opacity: Number(e.target.value) / 100 })} aria-label="투명도" />
        </div>
        {sel.length > 0 && (
          <label className={`toggle${first.shadow ? ' on' : ''}`}>
            <input type="checkbox" checked={!!first.shadow} onChange={(e) => act.setDoc(styleShapes(doc, selection, { shadow: e.target.checked }))} />
            <Icon name="shadow" size={18} />
            <span>떠 있는 그림자</span>
            <i aria-hidden="true" />
          </label>
        )}
      </Card>

      {figs.map(({ fig, role }) => {
        const r = checkFigure(doc, fig, grid);
        return (
          <Card key={fig.id} tone={r.ok ? fig.type : 'warn'} title={<>{figTitle(fig)} <span className="badge">{role === 'orig' ? '원본' : '대칭 복사본'}</span></>}>
            <label className={`toggle${fig.linked ? ' on' : ''}`}>
              <input type="checkbox" checked={fig.linked} onChange={(e) => act.setDoc(setFigureLinked(doc, fig.id, e.target.checked))} />
              <Icon name={fig.linked ? 'link' : 'unlink'} size={18} />
              <span>원본과 복사본 함께 움직이기</span>
              <i aria-hidden="true" />
            </label>
            <p className="muted small">
              {fig.linked
                ? '한 덩어리로 움직여요. 꼭짓점을 끌거나 모양을 바꾸면 짝 도형도 거울처럼 같이 바뀌어요.'
                : '따로따로 움직일 수 있어요. 대칭이 어긋나면 아래에 힌트가 나타나요.'}
            </p>
            {r.ok ? (
              <div className="check ok">
                <Icon name="check" size={18} /> {fig.type === 'line' ? '대칭이 맞아요' : '점대칭이 맞아요'}
              </div>
            ) : (
              <div className="check bad">
                <strong>
                  <Icon name="warn" size={18} /> 대칭을 다시 확인해 볼까요?
                </strong>
                <ul>
                  {r.hints.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
                {r.worst && (
                  <p className="small">
                    점 {r.worst.name}와 {r.worst.name}′: {fig.type === 'line' ? '대칭축' : '대칭의 중심'}에서 {r.worst.a}칸, {r.worst.b}칸 떨어져 있어요.
                  </p>
                )}
                <button className="btn small block" onClick={() => act.setDoc(fixFigure(doc, fig.id))}>
                  <Icon name="sparkle" size={18} /> 원본에 맞춰 다시 맞추기
                </button>
              </div>
            )}
            <div className="row-btns">
              <button className="btn tiny" onClick={() => dispatch({ type: 'select', ids: figureMembers(fig) })}>
                짝까지 모두 고르기
              </button>
              <button
                className="btn tiny ghost"
                onClick={() => {
                  if (window.confirm('대칭 관계를 풀까요? 도형은 그대로 남지만, 대칭 도형 개수에서는 빠져요.')) act.setDoc(dissolveFigure(doc, fig.id));
                }}
              >
                대칭 관계 풀기
              </button>
            </div>
          </Card>
        );
      })}

      {sel.length > 0 && (
        <Card title="겹치는 순서">
          <div className="row-btns">
            <button className="btn tiny" onClick={() => act.order('front')}>
              <Icon name="front" size={16} /> 맨 앞으로
            </button>
            <button className="btn tiny" onClick={() => act.order('forward')}>
              앞으로
            </button>
            <button className="btn tiny" onClick={() => act.order('backward')}>
              뒤로
            </button>
            <button className="btn tiny" onClick={() => act.order('back')}>
              <Icon name="back" size={16} /> 맨 뒤로
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── 사조 도구 ─────────────────────────
const BG_TYPES: [BgType, string][] = [
  ['solid', '단색'],
  ['linear', '위아래 그라데이션'],
  ['radial', '가운데 그라데이션'],
  ['dots', '점무늬'],
  ['stripes', '줄무늬'],
  ['checker', '체크무늬'],
  ['clouds', '구름 하늘'],
  ['night', '밤하늘'],
  ['floor', '꿈속 바닥'],
];

function StyleTab() {
  const { state, dispatch } = useStore();
  const act = useActions();
  const { doc, selection, settings } = state;
  if (!state.style) {
    return (
      <div className="panel-body">
        <Card title="사조를 먼저 골라 주세요">
          <div className="style-chips">
            {STYLE_ORDER.map((id) => (
              <button key={id} className="btn small" onClick={() => dispatch({ type: 'style', style: id })}>
                {ART_STYLES[id].name}
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }
  const st = ART_STYLES[state.style];
  const targets = selection.length ? selection : doc.shapes.map((s) => s.id);
  const targetText = selection.length ? '고른 도형' : '모든 도형';
  const setBg = (patch: Partial<typeof doc.background>) => act.setDoc({ ...doc, background: { ...doc.background, ...patch } });
  const fillColors = st.palette;

  const Tool = ({ icon, label, onClick, title }: { icon: string; label: string; onClick: () => void; title?: string }) => (
    <button className="tool-btn wide" onClick={onClick} title={title ?? label}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );

  const scatter = () =>
    act.editSel((s) => {
      const c = shapeCenter(s);
      const deg = Math.round((Math.random() - 0.5) * 30);
      const d = vec((Math.random() - 0.5) * settings.gridSize * 0.8, (Math.random() - 0.5) * settings.gridSize * 0.8);
      return translateShape(transformShape(s, (p) => rotateAround(p, c, deg), { rotate: deg }), d);
    }, '흩뜨릴');

  const recolor = (colors: string[]) => {
    if (!doc.shapes.length) return;
    const want = new Set(targets);
    let i = 0;
    act.setDoc({
      ...doc,
      shapes: doc.shapes.map((s) => {
        if (!want.has(s.id) || s.kind === 'text' || s.kind === 'bubble') return s;
        const c = colors[i++ % colors.length];
        return s.fill === 'none' || s.kind === 'segment' || s.kind === 'line' || s.kind === 'point' ? { ...s, stroke: c } : { ...s, fill: c };
      }),
    });
  };

  return (
    <div className="panel-body">
      <Card>
        <div className="style-head" style={{ borderColor: st.accent }}>
          <strong style={{ color: st.accent }}>{st.name}</strong>
          <select value={st.id} onChange={(e) => dispatch({ type: 'style', style: e.target.value as typeof st.id })} aria-label="사조 바꾸기">
            {STYLE_ORDER.map((id) => (
              <option key={id} value={id}>
                {ART_STYLES[id].name}
              </option>
            ))}
          </select>
        </div>
        <p className="guide-text">{st.guide}</p>
      </Card>

      <Card title={`${st.name} 색 팔레트`}>
        <p className="muted small">누르면 {selection.length ? '고른 도형의 채우기 색' : '앞으로 그릴 도형의 색'}이 바뀌어요.</p>
        <div className="swatches big">
          {fillColors.map((c) => (
            <button key={c} className="swatch" style={{ background: c }} onClick={() => act.applyStyle({ fill: c })} aria-label={`색 ${c}`} />
          ))}
        </div>
      </Card>

      <Card title="배경">
        <div className="bg-grid">
          {st.backgrounds.map((b) => (
            <button key={b.name} className="bg-chip" onClick={() => act.setDoc({ ...doc, background: { ...b.bg } })}>
              <span className="bg-sample" style={{ background: `linear-gradient(135deg, ${b.bg.c1}, ${b.bg.c2})` }} />
              {b.name}
            </button>
          ))}
        </div>
        <div className="bg-custom">
          <select value={doc.background.type} onChange={(e) => setBg({ type: e.target.value as BgType })} aria-label="배경 종류">
            {BG_TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label title="배경 색 1">
            <input type="color" value={toInputColor(doc.background.c1)} onChange={(e) => setBg({ c1: e.target.value })} aria-label="배경 색 1" />
          </label>
          <label title="배경 색 2">
            <input type="color" value={toInputColor(doc.background.c2)} onChange={(e) => setBg({ c2: e.target.value })} aria-label="배경 색 2" />
          </label>
        </div>
      </Card>

      <Card title={`${st.name} 도구`}>
        <div className="tool-grid">
          {st.id === 'surreal' && (
            <>
              <Tool icon="bigger" label="크게 과장 ×2" onClick={() => act.scaleSel(2)} />
              <Tool icon="smaller" label="작게 ×½" onClick={() => act.scaleSel(0.5)} />
              <Tool icon="flipV" label="위아래 뒤집기" onClick={() => act.editSel((s) => flipShape(s, false), '뒤집을')} />
              <Tool icon="flipH" label="좌우 뒤집기" onClick={() => act.editSel((s) => flipShape(s, true), '뒤집을')} />
              <Tool icon="shadow" label="떠 있게 하기" onClick={() => selection.length ? act.setDoc(styleShapes(doc, selection, { shadow: true })) : act.toast('떠 있게 할 도형을 먼저 골라 주세요.')} />
              <Tool icon="opacity" label="반투명 겹치기" onClick={() => act.applyStyle({ opacity: 0.6 })} />
            </>
          )}
          {st.id === 'cubism' && (
            <>
              <Tool
                icon="split"
                label="도형 나누기"
                title="삼각형·사각형·다각형을 가운데에서 잘라 삼각형 조각으로 나눠요"
                onClick={() => {
                  if (!selection.length) return act.toast('나눌 도형을 먼저 골라 주세요.');
                  const r = splitShapes(doc, selection);
                  if (!r.count) return act.toast('삼각형·사각형·다각형만 나눌 수 있어요.', 'warn');
                  act.setDoc(r.doc, r.newIds);
                  act.toast('도형을 조각으로 나눴어요. 대칭 짝도 같은 모양으로 나눠졌어요.', 'good');
                }}
              />
              <Tool icon="scatter" label="조각 흩뜨리기" onClick={scatter} />
              <Tool icon="opacity" label="반투명 색면" onClick={() => act.applyStyle({ opacity: 0.65 })} />
              <Tool icon="outline" label="굵은 외곽선" onClick={() => targets.length && act.setDoc(styleShapes(doc, targets, { stroke: '#2B2B2B', strokeWidth: 7 }))} title={`${targetText}에 굵은 외곽선`} />
              <Tool icon="rotate" label="45° 돌리기" onClick={() => act.rotateSel(45)} />
              <Tool icon="copy" label="복제" onClick={act.duplicate} />
            </>
          )}
          {st.id === 'pop' && (
            <>
              <Tool icon="outline" label="만화 외곽선" title={`${targetText}에 굵은 검은 외곽선`} onClick={() => targets.length && act.setDoc(styleShapes(doc, targets, { stroke: '#111111', strokeWidth: 9, lineStyle: 'solid' }))} />
              <Tool icon="bubble" label="말풍선 넣기" onClick={() => dispatch({ type: 'tool', tool: 'bubble' })} />
              <Tool icon="text" label="글자 넣기" onClick={() => dispatch({ type: 'tool', tool: 'text' })} />
              <Tool icon="grid" label="점무늬 배경" onClick={() => act.setDoc({ ...doc, background: { type: 'dots', c1: '#FFE14D', c2: '#FF4FA3' } })} />
              <Tool icon="palette" label="원색으로 칠하기" onClick={() => recolor(['#E10600', '#FFD400', '#0057E7', '#FF4FA3', '#00A86B'])} title={`${targetText}을 원색으로`} />
              <Tool icon="copy" label="복제" onClick={act.duplicate} />
            </>
          )}
        </div>
      </Card>

      {st.id === 'pop' && (
        <Card title="반복 배치 (앤디 워홀처럼)">
          <div className="seg">
            {([1, 2, 3] as const).map((n) => (
              <button key={n} className={doc.popGrid === n ? 'on' : ''} onClick={() => act.setDoc({ ...doc, popGrid: n })}>
                {n === 1 ? '한 장' : `${n}×${n}`}
              </button>
            ))}
          </div>
          {doc.popGrid > 1 && (
            <button className="btn small block" onClick={() => dispatch({ type: 'ui', patch: { popPreview: !state.popPreview } })}>
              <Icon name="eye" size={18} /> {state.popPreview ? '미리보기 끄기 (계속 고치기)' : '반복 미리보기 보기'}
            </button>
          )}
          <p className="muted small">반복 배치는 칸마다 색이 바뀌어 저장 그림과 인쇄에 나타나요.</p>
        </Card>
      )}

      <Card title="스티커 도형">
        <p className="muted small">스티커도 도형이라서 대칭 복사를 할 수 있어요.</p>
        <div className="tool-grid">
          {STICKERS[st.id].map((sd) => (
            <button key={sd.name} className="tool-btn wide" onClick={() => act.place(sd.make(vec(0, 0), { fill: state.drawStyle.fill === 'none' ? st.defaults.fill : state.drawStyle.fill, stroke: state.drawStyle.stroke }))}>
              <Icon name="star" />
              <span>{sd.name}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function RightPanel() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<'props' | 'style'>(state.step === 3 ? 'style' : 'props');
  useEffect(() => setTab(state.step === 3 ? 'style' : 'props'), [state.step]);

  return (
    <aside className={`right-panel${state.rightOpen ? ' open' : ''}`} aria-label="속성과 꾸미기">
      <div className="panel-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'props'} className={tab === 'props' ? 'on' : ''} onClick={() => setTab('props')}>
          <Icon name="layers" size={18} /> 도형 속성
        </button>
        <button role="tab" aria-selected={tab === 'style'} className={tab === 'style' ? 'on' : ''} onClick={() => setTab('style')}>
          <Icon name="palette" size={18} /> 사조 도구
        </button>
        <button className="panel-close" onClick={() => dispatch({ type: 'ui', patch: { rightOpen: false } })} aria-label="패널 닫기">
          <Icon name="close" size={18} />
        </button>
      </div>
      {tab === 'props' ? <PropertiesTab /> : <StyleTab />}
    </aside>
  );
}

