/** 작품 제작 화면: 왼쪽 도구 / 가운데 도화지 / 오른쪽 속성 / 아래 도움말 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { CanvasView } from './CanvasView';
import { LeftToolbar } from './LeftToolbar';
import { RightPanel } from './RightPanel';
import { Icon } from '../Icon';
import { useActions } from './useActions';
import { LEARN_LINE, LEARN_POINT, STEPS } from '../../data/texts';
import { ART_STYLES } from '../../data/artStyles';

function CanvasTopBar() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const set = (patch: Partial<typeof settings>) => dispatch({ type: 'settings', patch });
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [menu]);

  const Chk = ({ k, label, icon }: { k: 'grid' | 'snapGrid' | 'snapPoints' | 'snapAngle' | 'showCoords' | 'showAngles'; label: string; icon?: string }) => (
    <label className={`chip-toggle${settings[k] ? ' on' : ''}`}>
      <input type="checkbox" checked={settings[k]} onChange={(e) => set({ [k]: e.target.checked })} />
      {icon && <Icon name={icon} size={18} />}
      {label}
    </label>
  );

  return (
    <div className="canvas-topbar">
      <button className="btn small" onClick={() => dispatch({ type: 'undo' })} disabled={!state.past.length} title="되돌리기 (Ctrl+Z)">
        <Icon name="undo" size={18} /> 되돌리기
      </button>
      <button className="btn small" onClick={() => dispatch({ type: 'redo' })} disabled={!state.future.length} title="다시 하기 (Ctrl+Y)">
        <Icon name="redo" size={18} /> 다시 하기
      </button>
      <span className="sep" />
      <Chk k="grid" label="격자" icon="grid" />
      <Chk k="snapGrid" label="격자점에 딱 맞추기" icon="magnet" />
      <div className="menu-wrap" ref={menuRef}>
        <button className={`btn small${menu ? ' on' : ''}`} onClick={() => setMenu(!menu)} aria-expanded={menu}>
          작도 도우미 <Icon name="chevronDown" size={16} />
        </button>
        {menu && (
          <div className="menu-pop" role="menu">
            <label className="menu-row">
              격자 간격
              <select value={settings.gridSize} onChange={(e) => set({ gridSize: Number(e.target.value) })}>
                <option value={24}>촘촘하게</option>
                <option value={40}>보통</option>
                <option value={60}>넓게</option>
                <option value={80}>아주 넓게</option>
              </select>
            </label>
            <Chk k="snapPoints" label="꼭짓점·중점·중심에 딱 맞추기" />
            <Chk k="snapAngle" label="수평·수직·평행 방향과 15° 회전에 맞추기" />
            <Chk k="showCoords" label="좌표(몇 번째 칸인지) 보기" icon="coords" />
            <Chk k="showAngles" label="각도 보기" icon="angle" />
          </div>
        )}
      </div>
      <span className="grow" />
      <button className="btn small panel-toggle" onClick={() => dispatch({ type: 'ui', patch: { rightOpen: !state.rightOpen } })}>
        <Icon name="panel" size={18} /> 속성·꾸미기
      </button>
    </div>
  );
}

function HelpBar() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(true);
  const info = STEPS[state.step - 1];
  const style = state.style ? ART_STYLES[state.style] : null;
  const selSet = new Set(state.selection);
  const selFig = state.doc.figures.find((f) => f.pairs.some((p) => selSet.has(p.orig) || selSet.has(p.copy)));
  const learnLines = state.settings.learning ? (selFig ? (selFig.type === 'line' ? LEARN_LINE : LEARN_POINT) : null) : null;

  return (
    <div className={`help-bar${open ? '' : ' closed'}`}>
      <button className="help-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Icon name={open ? 'chevronDown' : 'help'} size={18} /> {open ? '도움말 접기' : '도움말'}
      </button>
      {open && (
        <div className="help-content">
          <div className="help-main">
            <span className="step-pill">{info.step}단계</span>
            <strong>{info.todo}</strong>
            {state.step === 3 && style && <p className="muted">{style.guide}</p>}
            {state.step === 2 && <p className="muted">도형을 그리고 → 대칭축(또는 중심점)을 놓고 → 도형을 고른 뒤 "선대칭 복사"·"점대칭 복사"를 눌러요.</p>}
          </div>
          {state.settings.learning && (
            <div className={`learn-box${selFig ? ' ' + selFig.type : ''}`}>
              <b>학습 모드</b>
              {learnLines ? (
                <ul>
                  {learnLines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p>대칭 도형을 하나 눌러 보세요. 대응점(ㄱ과 ㄱ′), 대응변(같은 색), 거리가 보여요.</p>
              )}
            </div>
          )}
          <div className="help-nav">
            {state.step === 3 && (
              <button className="btn" onClick={() => dispatch({ type: 'step', step: 2 })}>
                <Icon name="chevronLeft" size={18} /> 대칭 도형 만들기
              </button>
            )}
            {state.step === 2 ? (
              <button className="btn primary" onClick={() => dispatch({ type: 'step', step: 3 })}>
                다음: 작품 구성하기 <Icon name="chevronRight" size={18} />
              </button>
            ) : (
              <button className="btn primary" onClick={() => dispatch({ type: 'step', step: 4 })}>
                다음: 작품 설명 쓰기 <Icon name="chevronRight" size={18} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Studio() {
  const { state, dispatch } = useStore();
  const act = useActions();
  const actRef = useRef(act);
  actRef.current = act;
  const stateRef = useRef(state);
  stateRef.current = state;

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const a = actRef.current;
      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (ctrl && key === 'd') {
        e.preventDefault();
        a.duplicate();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        a.remove();
      } else if (e.key.startsWith('Arrow')) {
        const st = stateRef.current;
        if (!st.selection.length) return;
        e.preventDefault();
        const step = st.settings.snapGrid ? st.settings.gridSize : e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        a.nudge(dx, dy);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className="studio">
      <LeftToolbar />
      <main className="canvas-col">
        <CanvasTopBar />
        <CanvasView />
        <HelpBar />
      </main>
      <RightPanel />
    </div>
  );
}
