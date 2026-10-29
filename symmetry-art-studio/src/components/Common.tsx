/** 여러 화면에서 함께 쓰는 작은 부품: 알림, 창(모달), 사용 방법 */
import { useEffect, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { SHORTCUTS, STUDENT_HOWTO } from '../data/texts';

export function ToastView() {
  const { state, dispatch } = useStore();
  const t = state.toast;
  useEffect(() => {
    if (!t) return;
    const ms = Math.min(9000, 2600 + t.text.length * 55);
    const timer = setTimeout(() => dispatch({ type: 'clearToast', id: t.id }), ms);
    return () => clearTimeout(timer);
  }, [t, dispatch]);
  if (!t) return null;
  return (
    <div className={`toast ${t.tone}`} role="status" aria-live="polite">
      <Icon name={t.tone === 'good' ? 'check' : t.tone === 'warn' ? 'warn' : 'info'} />
      <span>{t.text}</span>
      <button className="icon-btn" onClick={() => dispatch({ type: 'clearToast', id: t.id })} aria-label="알림 닫기">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function HowToModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="학생용 사용 방법" onClose={onClose} wide>
      <div className="howto-grid">
        {STUDENT_HOWTO.map((h) => (
          <div key={h.title} className="howto-item">
            <h3>{h.title}</h3>
            <p>{h.body}</p>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="lg-axis" /> 파란 점선 = 대칭축
        </span>
        <span>
          <i className="lg-center" /> 보라색 십자 = 대칭의 중심
        </span>
        <span>
          <i className="lg-copy" /> 빨간 점선 = 대칭이 어긋난 도형 (눌러서 힌트 보기)
        </span>
      </div>
      <h3 className="mt">키보드로 더 빠르게</h3>
      <div className="shortcuts">
        {SHORTCUTS.map(([k, v]) => (
          <span key={k}>
            <kbd>{k}</kbd> {v}
          </span>
        ))}
      </div>
    </Modal>
  );
}
