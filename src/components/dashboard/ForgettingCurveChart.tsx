'use client';

import { useState, useMemo } from 'react';
import styles from './ForgettingCurveChart.module.css';

export interface NotebookOption {
  value: string;
  label: string;
}

export interface ForgettingCurveCard {
  _id: string;
  notebookId?: string;
  topic: string;
  lastReviewedAt?: string | Date;
  nextReviewDate: string | Date;
  intervalDays: number;
  createdAt: string | Date;
  difficultyWeight: number;
  reviewCount: number;
}

interface ForgettingCurveChartProps {
  cards: ForgettingCurveCard[];
}

interface DotPoint {
  cardId: string;
  notebookId: string;
  topic: string;
  elapsedDays: number;
  intervalDays: number;
  ratio: number; // t / I
  retention: number; // normalized retention (%)
  cx: number;
  cy: number;
  status: 'safe' | 'warning' | 'danger';
  difficulty: number;
  reviewCount: number;
}

function getNormalizedRetention(day: number) {
  const safeDay = Math.max(0, day);
  const exponent = 0.3;
  return 100 / (1 + Math.pow(safeDay, exponent));
}

export default function ForgettingCurveChart({ cards = [] }: ForgettingCurveChartProps) {
  const [hoveredDot, setHoveredDot] = useState<DotPoint | null>(null);

  // SVG 크기 정의 (가로축 0~7.5일 매핑)
  const svgWidth = 600;
  const svgHeight = 320;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Ebbinghaus 계열의 정규화 망각 곡선 상수 (0~7.5일 범위)
  const maxDays = 7.5;
  const minRetention = 20; // Y축 하단 한계
  const maxRetention = 100; // Y축 상단 한계

  // 카드 위치 및 망각 상태 연산
  const dots = useMemo<DotPoint[]>(() => {
    const now = new Date();

    return cards.map((card) => {
      const createdAt = new Date(card.createdAt);
      const lastReviewedAt = card.lastReviewedAt ? new Date(card.lastReviewedAt) : null;

      // 1. 마지막 학습 시점(t0) 결정 (학습 이력 없으면 생성일 기준)
      const t0 = lastReviewedAt || createdAt;

      // 2. 경과 시간 계산 (t, 일 단위)
      const elapsedMs = Math.max(0, now.getTime() - t0.getTime());
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // 3. 복습 주기 결정 (I, 최소 0.5일로 보정)
      const intervalDays = card.intervalDays > 0 ? card.intervalDays : 0.5;

      // 4. 경과 비율 계산 (x = t / I)
      const ratio = elapsedDays / intervalDays;

      // 5. 기억 유지도 계산: 복습 직후 100%에서 시작하는 정규화 power-law 유지율
      const retentionVal = getNormalizedRetention(Math.min(elapsedDays, maxDays));
      const retention = Math.round(Math.max(0, Math.min(100, retentionVal)) * 10) / 10;

      // 6. X, Y 좌표 매핑
      const cx = paddingLeft + (Math.min(elapsedDays, maxDays) / maxDays) * chartWidth;
      const cy = paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;

      // 7. 상태 설정
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (retention < 70) {
        status = 'danger';
      } else if (retention < 80) {
        status = 'warning';
      }

      return {
        cardId: card._id,
        notebookId: card.notebookId || 'unknown',
        topic: card.topic,
        elapsedDays: Math.round(elapsedDays * 10) / 10,
        intervalDays,
        ratio,
        retention,
        cx,
        cy,
        status,
        difficulty: card.difficultyWeight,
        reviewCount: card.reviewCount,
      };
    });
  }, [cards, chartWidth, chartHeight, paddingTop, maxDays, minRetention, maxRetention]);

  const groupedDots = useMemo(() => {
    const groups = new Map<string, DotPoint[]>();

    for (const dot of dots) {
      const items = groups.get(dot.notebookId) || [];
      items.push(dot);
      groups.set(dot.notebookId, items);
    }

    return Array.from(groups.entries()).map(([notebookId, items]) => {
      const total = items.length;
      const avgCx = items.reduce((sum, item) => sum + item.cx, 0) / total;
      const avgCy = items.reduce((sum, item) => sum + item.cy, 0) / total;
      const avgRetention = items.reduce((sum, item) => sum + item.retention, 0) / total;
      const primary = items
        .slice()
        .sort((a, b) => b.retention - a.retention || a.elapsedDays - b.elapsedDays)[0];

      const status: DotPoint['status'] = avgRetention < 70 ? 'danger' : avgRetention < 80 ? 'warning' : 'safe';

      return {
        notebookId,
        count: total,
        topics: items.slice(0, 3).map((item) => item.topic),
        primary,
        cx: avgCx,
        cy: avgCy,
        retention: Math.round(avgRetention * 10) / 10,
        status,
      };
    });
  }, [dots]);

  // Ebbinghaus 계열의 정규화 power-law 곡선
  const chartLines = useMemo(() => {
    const mainPathPoints: string[] = [];
    const stepSize = 0.05;

    for (let t = 0; t <= maxDays; t += stepSize) {
      const retention = getNormalizedRetention(t);
      const cx = paddingLeft + (t / maxDays) * chartWidth;
      const cy = paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;

      mainPathPoints.push(`${t === 0 ? 'M' : 'L'} ${cx} ${cy}`);
    }

    return {
      mainPath: mainPathPoints.join(' ')
    };
  }, [chartWidth, chartHeight, paddingTop, maxDays, minRetention, maxRetention]);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <h2 className={styles.chartTitle}>에빙하우스 망각 곡선 분포도</h2>
        <p className={styles.chartSubtitle}>
          복습 직후 100%에서 시작해, 초기에 급격히 떨어지고 이후 완만해지는 정규화 유지율 곡선입니다.
        </p>
      </div>

      <div className={styles.svgContainer}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={styles.chartSvg}>
          <defs>
            {/* 곡선 채우기 그라디언트 */}
            <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="52%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>

            {/* 차트 영역 클리핑 패스 */}
            <clipPath id="chartClip">
              <rect x={paddingLeft} y={paddingTop} width={chartWidth} height={chartHeight} />
            </clipPath>
          </defs>

          {/* ── 수평 그리드 및 가이드 라인 ── */}
          {Array.from({ length: 5 }).map((_, idx) => {
            const retentionValue = minRetention + idx * 20; // 20, 40, 60, 80, 100
            const y = paddingTop + chartHeight - (idx * 20 / (maxRetention - minRetention)) * chartHeight;
            return (
              <g key={retentionValue}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  className={retentionValue === 80 || retentionValue === 70 ? styles.criticalGridLine : styles.gridLine}
                />
                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className={styles.axisText}>
                  {retentionValue}%
                </text>
              </g>
            );
          })}

          {/* ── 수직 그리드 (복습 주기 1일, 3일, 6일 강조) ── */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => {
            const x = paddingLeft + (day / maxDays) * chartWidth;
            const isCritical = day === 1 || day === 3 || day === 6;
            return (
              <g key={day}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartHeight}
                  className={isCritical ? styles.criticalGridLine : styles.gridLine}
                />
                <text x={x} y={paddingTop + chartHeight + 15} textAnchor="middle" className={styles.axisText}>
                  {day}일
                </text>
              </g>
            );
          })}

          {/* X/Y축 기본 테두리 */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={paddingTop + chartHeight}
            stroke="var(--border-default)"
            strokeWidth="1"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={paddingLeft + chartWidth}
            y2={paddingTop + chartHeight}
            stroke="var(--border-default)"
            strokeWidth="1"
          />

          {/* ── 메인 망각 곡선 패스 (차트 경계 내로 클리핑) ── */}
          <g clipPath="url(#chartClip)">
            <path
              d={chartLines.mainPath}
              fill="none"
              stroke="url(#curveLineGrad)"
              strokeWidth="3.5"
              className={styles.mainCurve}
            />
          </g>

          {/* ── 복습 단계 라벨: 곡선보다 앞 레이어에 배치 ── */}
          {[1, 3, 6].map((day) => {
            const x = paddingLeft + (day / maxDays) * chartWidth;
            const label = day === 1 ? '1차 복습' : day === 3 ? '2차 복습' : '3차 복습';
            return (
              <g key={`review-label-${day}`} className={styles.reviewLabel}>
                <text x={x + 8} y={paddingTop + 15} className={styles.guideText}>
                  {label}
                </text>
              </g>
            );
          })}

          {/* ── 모든 카드 점(Dot) 렌더링 ── */}
          {groupedDots.map((group) => {
            const isHovered = hoveredDot && hoveredDot.notebookId === group.notebookId;
            return (
              <g
                key={group.notebookId}
                className={styles.dotGroup}
                onMouseEnter={() => setHoveredDot(group.primary)}
                onMouseLeave={() => setHoveredDot(null)}
              >
                {/* 글로우 백그라운드 링 */}
                <circle
                  cx={group.cx}
                  cy={group.cy}
                  r={isHovered ? 12 : 7}
                  className={`${styles.dotGlow} ${styles[group.status]}`}
                />
                {/* 핵심 센터 서클 */}
                <circle
                  cx={group.cx}
                  cy={group.cy}
                  r={isHovered ? 6 : 4}
                  className={`${styles.dotCore} ${styles[group.status]}`}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {group.count > 1 && (
                  <text x={group.cx + 9} y={group.cy - 9} className={styles.groupCount}>
                    {group.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── 툴팁 (Tooltip) ── */}
        {hoveredDot && (
          <div
            className={styles.tooltip}
            style={{
              left: `${hoveredDot.cx}px`,
              top: `${hoveredDot.cy - 12}px`,
            }}
          >
            <div className={styles.tooltipTopic}>{hoveredDot.topic}</div>
            <div className={styles.tooltipGrid}>
              <span>기억 유지도:</span>
              <strong className={styles[hoveredDot.status]}>{hoveredDot.retention}%</strong>

              <span>복습 단계:</span>
              <span>{hoveredDot.reviewCount === 0 ? '최초 학습' : `${hoveredDot.reviewCount}회 복습`}</span>

              <span>경과 시간:</span>
              <span>{hoveredDot.elapsedDays}일 지남</span>
            </div>
            <div className={styles.tooltipStatusText}>
              {hoveredDot.status === 'safe' && '✓ 안전: 장기 기억에 안착 중'}
              {hoveredDot.status === 'warning' && '⚠ 경고: 곧 복습 주기 도달'}
              {hoveredDot.status === 'danger' && '! 위험: 망각 방지 복습 권장'}
            </div>
          </div>
        )}
      </div>

      {/* ── 범례 (Legend) ── */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.safeColor}`} />
          <span>안전 ({dots.filter(d => d.status === 'safe').length})</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.warningColor}`} />
          <span>복습 임박 ({dots.filter(d => d.status === 'warning').length})</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendColor} ${styles.dangerColor}`} />
          <span>복습 필요 ({dots.filter(d => d.status === 'danger').length})</span>
        </div>
      </div>
    </div>
  );
}
