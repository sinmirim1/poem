/** 화면 바꾸기와 자동 저장 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from './state/store';
import { saveState } from './state/persist';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { StyleSelect } from './components/StyleSelect';
import { Studio } from './components/studio/Studio';
import { Describe } from './components/Describe';
import { Submit } from './components/Submit';
import { Teacher } from './components/Teacher';
import { HowToModal, ToastView } from './components/Common';

export function App() {
  const { state, dispatch } = useStore();
  const [howTo, setHowTo] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 화면이 바뀌면 맨 위부터 보이게 (앞 화면의 스크롤 위치가 남지 않도록)
  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0);
  }, [state.screen]);

  // 작품·설명·설정이 바뀌면 0.6초 뒤에 브라우저에 저장한다.
  useEffect(() => {
    const t = setTimeout(() => {
      if (saveState(state)) dispatch({ type: 'saved', at: Date.now() });
    }, 600);
    return () => clearTimeout(t);
    // 저장할 값이 바뀔 때만 다시 저장
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.doc, state.desc, state.settings, state.style, state.step, state.screen, state.drawStyle]);

  let body;
  switch (state.screen) {
    case 'home':
      body = <Home onHowTo={() => setHowTo(true)} />;
      break;
    case 'style':
      body = <StyleSelect />;
      break;
    case 'studio':
      body = <Studio />;
      break;
    case 'describe':
      body = <Describe />;
      break;
    case 'submit':
      body = <Submit />;
      break;
    case 'teacher':
      body = <Teacher />;
      break;
  }

  return (
    <div className={`app screen-${state.screen}`}>
      {state.screen !== 'home' && <Header onHowTo={() => setHowTo(true)} />}
      <div className="app-body" ref={bodyRef}>
        {body}
      </div>
      <ToastView />
      {howTo && <HowToModal onClose={() => setHowTo(false)} />}
    </div>
  );
}
