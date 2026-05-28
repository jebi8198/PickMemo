'use client';

import { useMemo } from 'react';
import { FeedbackType } from '@/types';
import styles from './FeedbackSimulation.module.css';

interface FeedbackSimulationProps {
  currentIntervalDays: number;
  lastReviewedAt?: string | Date;
  createdAt: string | Date;
  hoveredFeedback: FeedbackType | null;
}

export default function FeedbackSimulation({
  currentIntervalDays,
  lastReviewedAt,
  createdAt,
  hoveredFeedback,
}: FeedbackSimulationProps) {
  // SVG 크기 정의
  const svgWidth = 420;
  const svgHeight = 160;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 25;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // 톱니바퀴 계량 상수 (0 ~ 7.5일 범위)
  const maxDays = 7.5;
  const minRetention = 60;
  const maxRetention = 100;

  // 카드 현재 망각 수치 계산
  const cardStats = useMemo(() => {
    const now = new Date();
    const t0 = lastReviewedAt ? new Date(lastReviewedAt) : new Date(createdAt);
    const elapsedMs = Math.max(0, now.getTime() - t0.getTime());
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    
    // 현재 주기 (0일이면 0.5일로 간주)
    const interval = currentIntervalDays > 0 ? currentIntervalDays : 0.5;
    const ratio = elapsedDays / interval; // x = t / I
    const retention = 100 * Math.exp(-ratio / 2); // R = 100 * e^(-x / 2)

    return {
      elapsedDays: Math.round(elapsedDays * 10) / 10,
      interval,
      ratio,
      retention: Math.round(Math.max(0, Math.min(100, retention)) * 10) / 10,
    };
  }, [currentIntervalDays, lastReviewedAt, createdAt]);

  // 호버 중인 피드백에 따른 새로운 주기 계산
  const newIntervalDays = useMemo(() => {
    if (!hoveredFeedback) return cardStats.interval;
    const I = currentIntervalDays;
    
    switch (hoveredFeedback) {
      case 'AGAIN':
        return 0.5;
      case 'HARD':
        return Math.max(1, Math.round(I * 1.2));
      case 'GOOD':
        return I === 0 ? 1 : Math.max(1, Math.round(I * 2.0));
      case 'EASY':
        return I === 0 ? 3 : Math.max(1, Math.round(I * 2.5));
      default:
        return I || 0.5;
    }
  }, [hoveredFeedback, currentIntervalDays, cardStats.interval]);

  // 현재 감쇠 곡선 패스 생성
  const currentCurvePath = useMemo(() => {
    const points: string[] = [];
    const step = 0.05;
    const interval = cardStats.interval;
    
    for (let t = 0; t <= Math.min(cardStats.elapsedDays, maxDays); t += step) {
      const ratio = t / interval;
      const retention = 100 * Math.exp(-ratio / 2);
      
      const cx = paddingLeft + (t / maxDays) * chartWidth;
      const cy = paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
      points.push(`${t === 0 ? 'M' : 'L'} ${cx} ${cy}`);
    }
    
    // 만약 현재 경과 시점이 maxDays보다 작다면 끝점 명시
    if (cardStats.elapsedDays < maxDays) {
      const cx = paddingLeft + (cardStats.elapsedDays / maxDays) * chartWidth;
      const cy = paddingTop + chartHeight - ((Math.max(minRetention, cardStats.retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
      points.push(`L ${cx} ${cy}`);
    }

    return points.join(' ');
  }, [cardStats, chartWidth, chartHeight, paddingTop]);

  // 피드백 선택 시 시뮬레이션 프리뷰 곡선 패스 연산
  const previewSimulation = useMemo(() => {
    if (!hoveredFeedback) return null;

    const te = cardStats.elapsedDays; // 현재 경과 시점
    const newInterval = newIntervalDays;
    const points: string[] = [];
    const step = 0.05;

    // 반등 점의 좌표 (리셋 지점: 100% 회복)
    const cx_bounce = paddingLeft + (Math.min(te, maxDays) / maxDays) * chartWidth;
    const cy_bounce = paddingTop; // 100%이므로 최상단

    points.push(`M ${cx_bounce} ${cy_bounce}`);

    // 리셋 시점부터 7.5일까지 미래 시뮬레이션 곡선 생성
    for (let t = te; t <= maxDays; t += step) {
      const simRatio = (t - te) / newInterval;
      const simRetention = 100 * Math.exp(-simRatio / 2);
      
      const cx = paddingLeft + (t / maxDays) * chartWidth;
      const cy = paddingTop + chartHeight - ((Math.max(minRetention, simRetention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
      points.push(`L ${cx} ${cy}`);
    }

    // 끝점 보정
    const cx_end = paddingLeft + chartWidth;
    const finalSimRatio = (maxDays - te) / newInterval;
    const finalSimRetention = 100 * Math.exp(-finalSimRatio / 2);
    const cy_end = paddingTop + chartHeight - ((Math.max(minRetention, finalSimRetention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
    points.push(`L ${cx_end} ${cy_end}`);

    return {
      previewPath: points.join(' '),
      x_bounce: cx_bounce,
      y_bounce: cy_bounce,
      newInterval,
    };
  }, [hoveredFeedback, cardStats, newIntervalDays, chartWidth, chartHeight, paddingTop]);

  // 점들의 기본 좌표
  const dotCoords = useMemo(() => {
    const cx = paddingLeft + (Math.min(cardStats.elapsedDays, maxDays) / maxDays) * chartWidth;
    const cy = paddingTop + chartHeight - ((Math.max(minRetention, cardStats.retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
    return { cx, cy };
  }, [cardStats, chartWidth, chartHeight, paddingTop]);

  return (
    <div className={styles.simWrapper}>
      <div className={styles.simHeader}>
        <span className={styles.simTitle}>📈 복습 피드백 기억 시뮬레이션</span>
        <span className={styles.simStatus}>
          현재 유지도: <span className={styles.simTextHighlight}>{cardStats.retention}%</span>
          {hoveredFeedback && (
            <>
              {' '}→ 예정 주기:{' '}
              <span className={styles.simTextHighlight} style={{ color: 'var(--color-success)' }}>
                {newIntervalDays}일
              </span>
            </>
          )}
        </span>
      </div>

      <div className={styles.svgContainer}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={styles.simSvg}>
          <defs>
            {/* 시뮬레이션 채우기 그라디언트 */}
            <linearGradient id="simAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0.0" />
            </linearGradient>
            
            {/* 글로우 효과 */}
            <filter id="simGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* 차트 영역 클리핑 패스 */}
            <clipPath id="simClip">
              <rect x={paddingLeft} y={paddingTop} width={chartWidth} height={chartHeight} />
            </clipPath>
          </defs>

          {/* ── 수평 가이드 라인 ── */}
          {[60, 80, 100].map((val) => {
            const y = paddingTop + chartHeight - ((val - minRetention) / (maxRetention - minRetention)) * chartHeight;
            return (
              <g key={val}>
                <line x1={paddingLeft} y1={y} x2={paddingLeft + chartWidth} y2={y} className={styles.gridLine} />
                <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className={styles.axisText}>
                  {val}%
                </text>
              </g>
            );
          })}

          {/* ── 수직 가이드 라인 (경과 시간축) ── */}
          {[0, 2.5, 5, 7.5].map((val) => {
            const x = paddingLeft + (val / maxDays) * chartWidth;
            return (
              <g key={val}>
                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartHeight} className={styles.gridLine} />
                <text x={x} y={paddingTop + chartHeight + 12} textAnchor="middle" className={styles.axisText}>
                  {val}일
                </text>
              </g>
            );
          })}

          {/* 기본 테두리 라인 */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartHeight} stroke="var(--border-default)" strokeWidth="0.8" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={paddingLeft + chartWidth} y2={paddingTop + chartHeight} stroke="var(--border-default)" strokeWidth="0.8" />

          {/* ── 현재까지의 망각 감쇠 곡선 ── */}
          <g clipPath="url(#simClip)">
            <path
              d={currentCurvePath}
              fill="none"
              className={hoveredFeedback ? styles.currentCurveDimmed : styles.currentCurve}
            />
          </g>

          {/* ── 호버 시뮬레이션 곡선 (바스락 반등 효과) ── */}
          {hoveredFeedback && previewSimulation && (
            <g clipPath="url(#simClip)">
              {/* 면적 채우기 */}
              <path
                d={`${previewSimulation.previewPath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${previewSimulation.x_bounce} ${paddingTop + chartHeight} Z`}
                fill="url(#simAreaGrad)"
                className={styles.fadeIn}
              />
              {/* 시뮬레이션 점선 */}
              <path
                d={previewSimulation.previewPath}
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="2"
                strokeDasharray="4, 2"
                className={styles.previewCurve}
              />
            </g>
          )}

          {/* ── 현재 카드 점(Dot) ── */}
          <circle
            cx={dotCoords.cx}
            cy={dotCoords.cy}
            r="4.5"
            fill={cardStats.retention < 70 ? 'var(--color-danger)' : cardStats.retention < 80 ? 'var(--color-warning)' : 'var(--color-success)'}
            className={hoveredFeedback ? styles.dotDimmed : ''}
            filter={!hoveredFeedback ? 'url(#simGlow)' : undefined}
          />

          {/* ── 호버 시 새로 생길 리셋/반등 점 ── */}
          {hoveredFeedback && previewSimulation && (
            <circle
              cx={previewSimulation.x_bounce}
              cy={previewSimulation.y_bounce}
              r="6.5"
              fill="var(--color-success)"
              className={styles.pulseDot}
              filter="url(#simGlow)"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
