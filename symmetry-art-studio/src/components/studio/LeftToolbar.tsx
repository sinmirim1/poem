/** 왼쪽 도구 모음: 도형 그리기 / 고르고 바꾸기 / 대칭 만들기 */
import { useState, type ReactNode } from 'react';
import type { ToolId } from '../../types';
import { useStore } from '../../state/store';
import { Icon } from '../Icon';
import { TOOL_INFO } from '../../data/texts';
import { useActions } from './useActions';

function Section({ title, children, defaultOpen = true, accent }: { title: string; children: ReactNode; defaultOpen?: boolean; accent?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="tb-section">
      <button className="tb-title" onClick={() => setOpen(!open)} aria-expanded={open} style={accent ? { color: accent } : undefined}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        {title}
      </button>
      {open && <div className="tb-body">{children}</div>}
    </section>
  );
}

function ToolBtn({ id, icon }: { id: ToolId; icon: string }) {
  const { state, dispatch } = useStore();
  const active = state.tool === id;
  return (
    <button className={`tool-btn${active ? ' active' : ''}`} onClick={() => dispatch({ type: 'tool', tool: id })} aria-pressed={active} title={TOOL_INFO[id].hint}>
      <Icon name={icon} />
      <span>{TOOL_INFO[id].name}</span>
    </button>
  );
}

function ActBtn({ icon, label, onClick, title, disabled }: { icon: string; label: string; onClick: () => void; title?: string; disabled?: boolean }) {
  return (
    <button className="tool-btn" onClick={onClick} title={title ?? label} disabled={disabled}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function Toggle({ label, on, onChange, icon }: { label: string; on: boolean; onChange: (v: boolean) => void; icon?: string }) {
  return (
    <label className={`toggle${on ? ' on' : ''}`}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      {icon && <Icon name={icon} size={18} />}
      <span>{label}</span>
      <i aria-hidden="true" />
    </label>
  );
}

export function LeftToolbar() {
  const { state, dispatch } = useStore();
  const act = useActions();
  const { settings } = state;
  const set = (patch: Partial<typeof settings>) => dispatch({ type: 'settings', patch });
  const symFirst = state.step === 2;

  return (
    <aside className="left-toolbar" aria-label="도구 모음">
      <Section title="도형 그리기">
        <div className="tool-grid">
          <ToolBtn id="point" icon="point" />
          <ToolBtn id="segment" icon="segment" />
          <ToolBtn id="line" icon="line" />
          <ToolBtn id="triangle" icon="triangle" />
          <ToolBtn id="rect" icon="rect" />
          <ToolBtn id="polygon" icon="polygon" />
          <ToolBtn id="circle" icon="circle" />
          <ToolBtn id="freehand" icon="freehand" />
          <ToolBtn id="text" icon="text" />
          <ToolBtn id="bubble" icon="bubble" />
        </div>
      </Section>

      <Section title="대칭 만들기" accent="#2F6FED" defaultOpen={symFirst || state.step === 3}>
        <div className="sym-group line">
          <div className="sym-head">선대칭</div>
          <div className="tool-grid">
            <ActBtn icon="axisV" label="세로 대칭축" onClick={() => act.addAxis('v')} />
            <ActBtn icon="axisH" label="가로 대칭축" onClick={() => act.addAxis('h')} />
          </div>
          <ToolBtn id="axis" icon="axisDraw" />
          <button className="big-btn line" onClick={() => act.mirror('line')}>
            <Icon name="mirrorLine" size={26} />
            <span>
              선대칭 복사
              <small>고른 도형을 대칭축 반대쪽에</small>
            </span>
          </button>
        </div>
        <div className="sym-group point">
          <div className="sym-head">점대칭</div>
          <ToolBtn id="center" icon="center" />
          <button className="big-btn point" onClick={() => act.mirror('point')}>
            <Icon name="mirrorPoint" size={26} />
            <span>
              점대칭 복사
              <small>중심을 기준으로 180° 돌려서</small>
            </span>
          </button>
        </div>
        <div className="toggles">
          <Toggle label="대칭축 보이기" on={settings.showAxes} onChange={(v) => set({ showAxes: v })} />
          <Toggle label="중심점 보이기" on={settings.showCenters} onChange={(v) => set({ showCenters: v })} />
        </div>
        <button className="btn small block" onClick={act.checkAll}>
          <Icon name="check" size={18} /> 대칭 모두 검사하기
        </button>
      </Section>

      <Section title="고르고 바꾸기">
        <div className="tool-grid">
          <ToolBtn id="select" icon="select" />
          <ToolBtn id="move" icon="move" />
          <ToolBtn id="rotate" icon="rotate" />
          <ToolBtn id="scale" icon="scale" />
          <ToolBtn id="pan" icon="pan" />
          <button className={`tool-btn${state.multi ? ' active' : ''}`} onClick={() => dispatch({ type: 'ui', patch: { multi: !state.multi } })} aria-pressed={state.multi} title="켜 두면 누르는 도형이 계속 함께 골라져요">
            <Icon name="multi" />
            <span>여러 개 고르기</span>
          </button>
          <ActBtn icon="copy" label="복제" onClick={act.duplicate} title="고른 도형 복제 (Ctrl+D)" />
          <ActBtn icon="trash" label="지우기" onClick={act.remove} title="고른 도형 지우기 (Delete)" />
        </div>
        <button className="btn small block danger-outline" onClick={act.clearAll} title="도화지의 도형·대칭축·중심점을 모두 지워요">
          <Icon name="trash" size={18} /> 전체 그림 지우기
        </button>
      </Section>
    </aside>
  );
}
