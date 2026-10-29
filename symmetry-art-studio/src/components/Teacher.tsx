/** 교사용 안내 화면 (학생 화면과 분리) */
import { useStore } from '../state/store';
import { ART_STYLES, STYLE_ORDER } from '../data/artStyles';
import { TEMPLATE_PREVIEWS, makeTemplate } from '../data/templates';
import { LEARN_LINE, LEARN_POINT } from '../data/texts';
import { ArtworkSvg } from './art/Artwork';
import { Icon } from './Icon';
import { toggleFullscreen } from './Header';
import type { ArtStyleId } from '../types';

const FLOW = [
  {
    name: '도입',
    time: '10분',
    body: '현대미술 사조 3가지(입체파·초현실주의·팝아트)와 대표 작가(피카소·르네 마그리트·앤디 워홀)를 떠올리고, 합동·선대칭·점대칭의 뜻을 짧게 복습합니다. 첫 화면의 세 그림에서 "대칭이 어디에 숨어 있을까?"를 찾아봅니다.',
  },
  {
    name: '탐구',
    time: '25분',
    body: '격자에 딱 맞추기를 켠 채 도형을 그리고 "선대칭 복사·점대칭 복사"로 대칭 도형을 만듭니다. 꼭짓점을 끌어 짝 도형이 거울처럼 함께 바뀌는 모습으로 대응점·대응변 관계를 확인하고, "따로 움직이기"로 일부러 어긋나게 한 뒤 힌트를 보고 고쳐 봅니다.',
  },
  {
    name: '표현',
    time: '35분',
    body: '고른 사조의 도구(색 팔레트, 배경, 효과, 스티커)로 대칭 도형을 조합·변형·배치해 작품을 완성합니다. 선대칭 3개, 점대칭 3개 이상 조건을 상단 표시로 확인합니다.',
  },
  {
    name: '감상',
    time: '10분',
    body: '작품 설명 문장을 완성하고 결과지를 출력하거나 화면으로 발표합니다. "어떤 사조의 특징을 어떻게 표현했나요?", "대칭축/대칭의 중심은 어디인가요?"를 서로 질문합니다.',
  },
];

const TIPS = [
  '선대칭과 점대칭을 헷갈리는 학생에게는 "접어서 겹치나(선대칭)? 돌려서 겹치나(점대칭)?"로 구별하게 합니다.',
  '"대칭 도형 개수"는 대칭이 맞는 도형만 셉니다. 따로 옮겨서 어긋난 도형은 빨간 표시와 힌트가 나타나고, "원본에 맞춰 다시 맞추기"로 고칠 수 있습니다.',
  '"함께 움직이기"가 켜져 있으면 원본·복사본·대칭축이 한 덩어리로 움직이고, 꼭짓점을 끌면 짝도 거울처럼 바뀝니다. 대응점 관계를 실시간으로 보여 주기에 좋습니다.',
  '삼각형처럼 스스로 대칭이 아닌 도형으로 시작하면 대칭 관계가 더 잘 보입니다.',
  '자유선을 처음 점 가까이에서 끝내면 닫힌 도형이 되고, 오른쪽 "채우기 색"으로 색을 칠할 수 있습니다.',
  '작업은 각 컴퓨터의 브라우저에 자동 저장됩니다. 여러 반이 같은 컴퓨터를 쓰면, 수업이 끝난 뒤 결과지를 저장하고 "작품 초기화"를 눌러 주세요.',
];

export function Teacher() {
  const { state, dispatch } = useStore();

  const load = (id: ArtStyleId) => {
    if (state.doc.shapes.length && !window.confirm('지금 작품을 예시 템플릿으로 바꿀까요? 지금 작품은 사라져요. (되돌리기로 되살릴 수는 있어요)')) return;
    dispatch({ type: 'style', style: id });
    dispatch({ type: 'doc', doc: makeTemplate(id), record: true, select: [] });
    dispatch({ type: 'step', step: 3 });
    dispatch({ type: 'toast', text: `${ART_STYLES[id].name} 예시 템플릿을 불러왔어요. (선대칭 2개 + 점대칭 1개)`, tone: 'good' });
  };

  return (
    <div className="page teacher-page">
      <div className="page-head teacher-head">
        <div>
          <h2>교사용 안내</h2>
          <p className="muted">5학년 2학기 수학 「합동과 대칭」 × 미술 「현대미술 표현」 융합 프로젝트</p>
        </div>
        <div className="row-btns">
          <button className="btn" onClick={toggleFullscreen}>
            <Icon name="fullscreen" /> 전체 화면 (교실 시연)
          </button>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', screen: state.style ? (state.step === 1 ? 'style' : 'studio') : 'home' })}>
            학생 화면으로 <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      <div className="teacher-grid">
        <section className="t-card">
          <h3>수업 목표</h3>
          <ul>
            <li>선대칭도형과 점대칭도형의 성질(대응점, 대응변, 대칭축, 대칭의 중심)을 이용해 대칭 도형을 정확하게 만들 수 있다.</li>
            <li>현대미술 사조의 특징을 살려 대칭 도형을 조합·변형·배치하여 작품을 표현할 수 있다.</li>
            <li>자기 작품에 쓰인 대칭 원리와 미술 사조를 근거를 들어 설명할 수 있다.</li>
          </ul>
        </section>

        <section className="t-card">
          <h3>학생 활동 조건</h3>
          <ol>
            <li>현대미술 사조 1가지 고르기</li>
            <li>선대칭 도형 3개 이상 만들기</li>
            <li>점대칭 도형 3개 이상 만들기</li>
            <li>대칭 도형을 조합·변형·배치하여 작품 완성하기</li>
            <li>작품 설명 문장 7개 완성하기</li>
            <li>PNG 저장 또는 결과지 인쇄로 제출하기</li>
          </ol>
        </section>

        <section className="t-card wide">
          <h3>대칭 개념 핵심 문장</h3>
          <div className="two-col">
            <div className="concept line">
              <h4>선대칭도형</h4>
              <p>한 직선을 따라 접었을 때 완전히 겹치는 도형. 그 직선이 대칭축입니다.</p>
              <ul>
                {LEARN_LINE.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="concept point">
              <h4>점대칭도형</h4>
              <p>한 점을 중심으로 180° 돌렸을 때 처음 도형과 완전히 겹치는 도형. 그 점이 대칭의 중심입니다.</p>
              <ul>
                {LEARN_POINT.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="muted small">공통: 대칭인 두 부분은 서로 합동이며, 대응변의 길이와 대응각의 크기가 각각 같습니다.</p>
        </section>

        <section className="t-card wide">
          <h3>사조별 핵심 특징</h3>
          <table className="t-table">
            <thead>
              <tr>
                <th>사조</th>
                <th>핵심 특징</th>
                <th>앱 속 도구</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>입체파</td>
                <td>{ART_STYLES.cubism.features.join(' · ')}</td>
                <td>도형 나누기, 조각 흩뜨리기, 반투명 색면, 굵은 외곽선, 정다각형</td>
              </tr>
              <tr>
                <td>초현실주의</td>
                <td>{ART_STYLES.surreal.features.join(' · ')}</td>
                <td>크게 과장, 뒤집기, 떠 있는 그림자, 꿈속 바닥·구름 배경, 눈·달·집 스티커</td>
              </tr>
              <tr>
                <td>팝아트</td>
                <td>{ART_STYLES.pop.features.join(' · ')}</td>
                <td>원색, 만화 외곽선, 2×2·3×3 반복 배치, 말풍선·글자, 점무늬</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="t-card wide">
          <h3>수업 진행 예시 (2차시, 80분)</h3>
          <div className="flow">
            {FLOW.map((f) => (
              <div key={f.name} className="flow-item">
                <div className="flow-name">
                  {f.name}
                  <small>{f.time}</small>
                </div>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="t-card wide">
          <h3>지도 팁</h3>
          <ul>
            {TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="t-card wide">
          <h3>학생 작품 예시용 템플릿</h3>
          <p className="muted small">시연용 예시입니다. 대칭 도형이 3개(선대칭 2 + 점대칭 1)만 들어 있어서 학생이 직접 더 만들어야 조건을 채울 수 있습니다.</p>
          <div className="template-row">
            {STYLE_ORDER.map((id) => (
              <div key={id} className="template">
                <ArtworkSvg doc={TEMPLATE_PREVIEWS[id]} prefix={`tp-${id}`} className="thumb" />
                <button className="btn small block" onClick={() => load(id)}>
                  {ART_STYLES[id].name} 예시 불러오기
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="t-card wide danger">
          <h3>작품 초기화</h3>
          <p className="muted small">이 컴퓨터에 저장된 작품과 작품 설명을 모두 지우고 처음 상태로 돌립니다.</p>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('정말 작품과 설명을 모두 지울까요? 지운 뒤에는 되돌릴 수 없어요.')) dispatch({ type: 'resetWork' });
            }}
          >
            <Icon name="trash" /> 작품 초기화
          </button>
        </section>
      </div>
    </div>
  );
}
