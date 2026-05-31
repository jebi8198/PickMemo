'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import styles from './page.module.css';

export default function ForgettingCurvePage() {
  const sectionRefs = {
    what: useRef<HTMLElement>(null),
    how: useRef<HTMLElement>(null),
    spaced: useRef<HTMLElement>(null),
    chart: useRef<HTMLElement>(null),
  };

  function scrollTo(ref: React.RefObject<HTMLElement | null>) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>학습 과학</p>
          <h1 className={styles.heroTitle}>에빙하우스 망각 곡선</h1>
          <p className={styles.heroDesc}>
            왜 배운 것을 금방 잊을까? 그리고 어떻게 하면 오래 기억할 수 있을까.
            <br />
            1885년 헤르만 에빙하우스의 실험이 밝혀낸 기억의 원리를 알아봅니다.
          </p>
          <div className={styles.pickmemoBanner}>
            <span className={styles.pickmemoLogo}>PickMemo</span>는 에빙하우스의 망각 곡선 원리를 기반으로,{' '}
            복습 최적 시점을 자동 계산해 <strong>배운 것을 장기 기억으로 전환</strong>하도록 돕는 서비스입니다.
          </div>
          <nav className={styles.toc}>
            <button className={styles.tocItem} onClick={() => scrollTo(sectionRefs.what)}>망각 곡선이란</button>
            <span className={styles.tocDot} />
            <button className={styles.tocItem} onClick={() => scrollTo(sectionRefs.how)}>망각이 일어나는 방식</button>
            <span className={styles.tocDot} />
            <button className={styles.tocItem} onClick={() => scrollTo(sectionRefs.spaced)}>간격 반복 학습</button>
            <span className={styles.tocDot} />
            <button className={styles.tocItem} onClick={() => scrollTo(sectionRefs.chart)}>PickMemo 차트 읽기</button>
          </nav>
        </section>

        <div className={styles.content}>

          {/* 1. 망각 곡선이란 */}
          <section ref={sectionRefs.what} className={styles.section}>
            <div className={styles.sectionLabel}>01</div>
            <h2 className={styles.sectionTitle}>망각 곡선이란?</h2>
            <p className={styles.body}>
              독일의 심리학자 <strong>헤르만 에빙하우스(Hermann Ebbinghaus)</strong>는 1885년에 자기 자신을 실험 대상으로
              삼아 수천 개의 무의미 음절을 암기한 뒤, 시간이 지남에 따라 얼마나 기억이 남는지 측정했습니다.
            </p>
            <p className={styles.body}>
              그 결과 기억은 처음 배운 직후 급격히 감소하다가 점차 완만해지는 곡선을 그린다는 사실을 발견했습니다.
              이를 <strong>망각 곡선(Forgetting Curve)</strong>이라 부릅니다.
            </p>

            {/* 시각화 — 순수 SVG */}
            <div className={styles.chartBox}>
              <p className={styles.chartCaption}>기억 유지율 변화 (복습 없음)</p>
              <svg viewBox="0 0 480 200" className={styles.illustSvg} aria-hidden="true">
                {/* 격자 */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = 20 + (1 - pct / 100) * 155;
                  return (
                    <g key={pct}>
                      <line x1="50" y1={y} x2="450" y2={y} stroke="#e5e0d8" strokeWidth="1" />
                      <text x="44" y={y + 4} textAnchor="end" fontSize="10" fill="#948b82">{pct}%</text>
                    </g>
                  );
                })}
                {/* 축 */}
                <line x1="50" y1="20" x2="50" y2="175" stroke="#c4bdb4" strokeWidth="1.5" />
                <line x1="50" y1="175" x2="450" y2="175" stroke="#c4bdb4" strokeWidth="1.5" />
                {/* x축 라벨 */}
                {['학습 직후', '20분', '1시간', '1일', '1주'].map((label, i) => {
                  const x = 50 + (i / 4) * 400;
                  return <text key={i} x={x} y="188" textAnchor="middle" fontSize="9.5" fill="#948b82">{label}</text>;
                })}
                {/* 망각 곡선 */}
                <path
                  d="M50,20 C90,28 130,60 180,100 C230,135 280,152 350,162 C390,166 420,168 450,169"
                  fill="none"
                  stroke="#c0392b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* 음영 */}
                <path
                  d="M50,20 C90,28 130,60 180,100 C230,135 280,152 350,162 C390,166 420,168 450,169 L450,175 L50,175 Z"
                  fill="rgba(192,57,43,0.07)"
                />
                {/* 포인트 */}
                {[
                  [50, 20], [100, 52], [180, 100], [290, 148], [450, 169]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="4" fill="#c0392b" opacity="0.8" />
                ))}
              </svg>
              <p className={styles.chartNote}>
                학습 후 20분이면 기억의 약 42%가, 하루가 지나면 약 67%가 사라집니다.
              </p>
            </div>

            <div className={styles.callout}>
              <span className={styles.calloutIcon}>💡</span>
              <p>
                에빙하우스 공식: <code>R = e^(−t/S)</code><br />
                R = 기억 유지율, t = 경과 시간, S = 기억의 안정성(강도).
                S가 클수록 잊는 속도가 느립니다.
              </p>
            </div>
          </section>

          {/* 2. 망각이 일어나는 방식 */}
          <section ref={sectionRefs.how} className={styles.section}>
            <div className={styles.sectionLabel}>02</div>
            <h2 className={styles.sectionTitle}>망각이 일어나는 방식</h2>
            <p className={styles.body}>
              기억은 단번에 사라지지 않습니다. 단기 기억에서 장기 기억으로 이동하지 못한 정보가
              먼저 손실되고, 장기 기억에 저장된 정보도 인출 기회가 없으면 점점 희미해집니다.
            </p>

            <div className={styles.stepList}>
              <div className={styles.step}>
                <div className={styles.stepNum}>1</div>
                <div>
                  <strong>감각 기억 (Sensory Memory)</strong>
                  <p>보고 들은 정보가 1~4초간 유지됩니다. 주의를 기울이지 않으면 즉시 소멸합니다.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>2</div>
                <div>
                  <strong>단기 기억 (Short-term Memory)</strong>
                  <p>주의를 기울인 정보가 약 20~30초간 유지됩니다. 반복 시연 없이는 장기 기억으로 전환되지 않습니다.</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNum}>3</div>
                <div>
                  <strong>장기 기억 (Long-term Memory)</strong>
                  <p>의미 있게 처리되거나 반복적으로 인출된 정보만 장기 기억에 안착합니다. 그러나 인출하지 않으면 경로가 약해집니다.</p>
                </div>
              </div>
            </div>

            <div className={styles.callout}>
              <span className={styles.calloutIcon}>🧠</span>
              <p>
                잊는다는 것은 정보가 완전히 사라진 게 아니라, 인출 경로가 약해진 것입니다.
                복습은 그 경로를 다시 강화하는 과정입니다.
              </p>
            </div>
          </section>

          {/* 3. 간격 반복 학습 */}
          <section ref={sectionRefs.spaced} className={styles.section}>
            <div className={styles.sectionLabel}>03</div>
            <h2 className={styles.sectionTitle}>간격 반복 학습 (Spaced Repetition)</h2>
            <p className={styles.body}>
              복습 시점을 전략적으로 늘려가면 같은 시간으로 훨씬 오래 기억할 수 있습니다.
              기억이 막 희미해지기 직전에 복습하는 것이 핵심입니다.
            </p>

            {/* 톱니 파형 SVG */}
            <div className={styles.chartBox}>
              <p className={styles.chartCaption}>복습을 반복할수록 기억 유지 기간이 늘어남</p>
              <svg viewBox="0 0 480 200" className={styles.illustSvg} aria-hidden="true">
                {/* 격자 */}
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = 20 + (1 - pct / 100) * 155;
                  return (
                    <g key={pct}>
                      <line x1="50" y1={y} x2="450" y2={y} stroke="#e5e0d8" strokeWidth="1" />
                      <text x="44" y={y + 4} textAnchor="end" fontSize="10" fill="#948b82">{pct}%</text>
                    </g>
                  );
                })}
                <line x1="50" y1="20" x2="50" y2="175" stroke="#c4bdb4" strokeWidth="1.5" />
                <line x1="50" y1="175" x2="450" y2="175" stroke="#c4bdb4" strokeWidth="1.5" />

                {/* 톱니 파형 — 4번 복습 */}
                {/* 복습 없는 기준선 (faint) */}
                <path
                  d="M50,20 C90,28 130,60 180,100 C230,135 280,152 350,162 C390,166 420,168 450,169"
                  fill="none"
                  stroke="#d9d3cc"
                  strokeWidth="1.5"
                  strokeDasharray="4,3"
                />
                {/* 세그먼트 1: 학습 → 1일 후 복습 */}
                <path d="M50,20 C70,30 90,55 110,85" fill="none" stroke="#5a8a4a" strokeWidth="2.5" strokeLinecap="round" />
                {/* 복습 수직선 1 */}
                <line x1="110" y1="20" x2="110" y2="85" stroke="#5a8a4a" strokeDasharray="3,3" strokeWidth="1.5" opacity="0.6" />
                {/* 세그먼트 2: 1일 → 3일 */}
                <path d="M110,20 C140,32 160,60 185,95" fill="none" stroke="#5a8a4a" strokeWidth="2.5" strokeLinecap="round" />
                {/* 복습 수직선 2 */}
                <line x1="185" y1="20" x2="185" y2="95" stroke="#5a8a4a" strokeDasharray="3,3" strokeWidth="1.5" opacity="0.6" />
                {/* 세그먼트 3: 3일 → 8일 */}
                <path d="M185,20 C225,35 255,65 290,100" fill="none" stroke="#5a8a4a" strokeWidth="2.5" strokeLinecap="round" />
                {/* 복습 수직선 3 */}
                <line x1="290" y1="20" x2="290" y2="100" stroke="#5a8a4a" strokeDasharray="3,3" strokeWidth="1.5" opacity="0.6" />
                {/* 세그먼트 4: 8일 → (예측) */}
                <path d="M290,20 C340,38 380,70 450,112" fill="none" stroke="#5a8a4a" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5,3" opacity="0.55" />

                {/* 복습 포인트 (원형) */}
                {[[110, 85], [185, 95], [290, 100]].map(([cx, cy], i) => (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="5" fill="#5a8a4a" opacity="0.9" />
                    <circle cx={cx} cy={20} r="3.5" fill="#5a8a4a" opacity="0.7" />
                  </g>
                ))}
                {/* 현재 위치 점 */}
                <circle cx={50} cy={20} r="5" fill="#5a8a4a" />

                {/* 범례 */}
                <line x1="60" y1="192" x2="82" y2="192" stroke="#5a8a4a" strokeWidth="2" />
                <text x="86" y="196" fontSize="9" fill="#58504a">간격 반복 복습</text>
                <line x1="170" y1="192" x2="192" y2="192" stroke="#d9d3cc" strokeWidth="1.5" strokeDasharray="4,3" />
                <text x="196" y="196" fontSize="9" fill="#948b82">복습 없을 때</text>
              </svg>
              <p className={styles.chartNote}>
                복습할 때마다 망각 속도가 느려지고, 기억이 유지되는 기간이 기하급수적으로 늘어납니다.
              </p>
            </div>

            <div className={styles.keyPointGrid}>
              <div className={styles.keyPoint}>
                <div className={styles.keyPointValue}>1일</div>
                <div className={styles.keyPointLabel}>첫 복습 권장 시점</div>
              </div>
              <div className={styles.keyPoint}>
                <div className={styles.keyPointValue}>3일</div>
                <div className={styles.keyPointLabel}>두 번째 복습 시점</div>
              </div>
              <div className={styles.keyPoint}>
                <div className={styles.keyPointValue}>7일</div>
                <div className={styles.keyPointLabel}>세 번째 복습 시점</div>
              </div>
              <div className={styles.keyPoint}>
                <div className={styles.keyPointValue}>×2.2</div>
                <div className={styles.keyPointLabel}>복습마다 늘어나는 간격 배수</div>
              </div>
            </div>
          </section>

          {/* 4. PickMemo 차트 읽기 */}
          <section ref={sectionRefs.chart} className={styles.section}>
            <div className={styles.sectionLabel}>04</div>
            <h2 className={styles.sectionTitle}>PickMemo 차트 읽기</h2>
            <p className={styles.body}>
              대시보드의 <strong>에빙하우스 망각 곡선 분포도</strong>는 내 카드들이 현재 망각 곡선 어느 지점에 있는지를 보여줍니다.
            </p>

            <div className={styles.guideGrid}>
              <div className={styles.guideItem}>
                <div className={styles.guideDot} style={{ background: 'var(--color-success)' }} />
                <div>
                  <strong>초록 (안전)</strong>
                  <p>복습 주기의 80% 미만 경과. 아직 여유가 있습니다.</p>
                </div>
              </div>
              <div className={styles.guideItem}>
                <div className={styles.guideDot} style={{ background: 'var(--color-warning)' }} />
                <div>
                  <strong>노랑 (주의)</strong>
                  <p>복습 주기의 80~100% 경과. 곧 복습하는 것이 좋습니다.</p>
                </div>
              </div>
              <div className={styles.guideItem}>
                <div className={styles.guideDot} style={{ background: 'var(--color-danger)' }} />
                <div>
                  <strong>빨강 (위험)</strong>
                  <p>복습 기한이 지났습니다. 기억이 많이 희미해진 상태입니다.</p>
                </div>
              </div>
            </div>

            <div className={styles.guideList}>
              <div className={styles.guideRow}>
                <span className={styles.guideIcon}>📍</span>
                <div>
                  <strong>점의 위치 (X축 / Y축)</strong>
                  <p>
                    X축은 처음 학습한 날로부터 경과한 일수, Y축은 현재 예상 기억 유지율입니다.
                    오른쪽 아래에 있을수록 더 오래 전에 배웠고 기억이 더 희미합니다.
                  </p>
                </div>
              </div>
              <div className={styles.guideRow}>
                <span className={styles.guideIcon}>🔍</span>
                <div>
                  <strong>점 클릭 — 세부 복습 곡선</strong>
                  <p>
                    점을 클릭하면 해당 카드의 <em>실제 복습 기록</em>을 기반으로 재구성한 세부 곡선이 표시됩니다.
                    실선은 실제 기억 경로, 점선은 앞으로의 예측입니다.
                  </p>
                </div>
              </div>
              <div className={styles.guideRow}>
                <span className={styles.guideIcon}>📅</span>
                <div>
                  <strong>세로 점선 — 복습 시점</strong>
                  <p>
                    세부 곡선의 세로 점선은 실제로 복습한 날짜를 나타냅니다.
                    복습하면 기억이 100%로 초기화되고, 이후 서서히 망각됩니다.
                  </p>
                </div>
              </div>
              <div className={styles.guideRow}>
                <span className={styles.guideIcon}>📈</span>
                <div>
                  <strong>복습 난이도 피드백</strong>
                  <p>
                    복습 시 <em>EASY / GOOD / HARD / AGAIN</em> 피드백을 주면 다음 복습 간격이 자동으로 조정됩니다.
                    쉬울수록 더 긴 간격, 어려울수록 더 짧은 간격이 부여됩니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className={styles.cta}>
            <p>지금 내 카드들의 복습 상태를 확인해보세요.</p>
            <Link href="/dashboard" className={styles.ctaButton}>
              대시보드로 돌아가기
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
