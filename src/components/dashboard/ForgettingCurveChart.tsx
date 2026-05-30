'use client';

import { useState, useMemo, useRef } from 'react';
import { formatDisplayDate } from '@/lib/date';
import styles from './ForgettingCurveChart.module.css';

export interface ForgettingCurveCard {
  _id: string;
  notebookId?: string;
  notebookTitle?: string;
  topic: string;
  lastReviewedAt?: string | Date;
  nextReviewDate: string | Date;
  intervalDays: number;
  createdAt: string | Date;
  difficultyWeight: number;
  reviewCount: number;
}

type ChartMode = 'dashboard' | 'notebook';

export interface NotebookOption {
  id: string;
  title: string;
  color: string;
}

interface ForgettingCurveChartProps {
  cards: ForgettingCurveCard[];
  mode?: ChartMode;
  notebookOptions?: NotebookOption[];
  notebookColor?: string;
}

interface DotPoint {
  cardId: string;
  notebookId: string;
  notebookTitle: string;
  topic: string;
  elapsedDays: number;
  intervalDays: number;
  nextReviewDate: Date;
  ratio: number; // t / I
  retention: number; // normalized retention (%)
  cx: number;
  cy: number;
  status: 'safe' | 'warning' | 'danger';
  difficulty: number;
  reviewCount: number;
}

interface DotCluster {
  id: string;
  kind: 'card' | 'notebook';
  notebookId: string;
  notebookTitle: string;
  dots: DotPoint[];
  primary: DotPoint;
  topics: string[];
  count: number;
  cx: number;
  cy: number;
  retention: number;
  elapsedDays: number;
  intervalDays: number;
  nextReviewDate: Date;
  progressPercent: number;
  reviewCount: number;
  status: DotPoint['status'];
}

interface CurvePath {
  id: string;
  path: string;
  color?: string;
  opacity?: number;
}

interface TooltipPosition {
  x: number;
  y: number;
}

const MIN_STABILITY_DAYS = 0.5;
const MIN_CHART_DAYS = 7.5;
const DEFAULT_NOTEBOOK_COLOR = '#2563eb';
const DASHBOARD_CURVE_COLOR = '#64748b';

function getRetention(elapsedDays: number, intervalDays: number) {
  const safeElapsedDays = Math.max(0, elapsedDays);
  const stability = Math.max(MIN_STABILITY_DAYS, intervalDays);

  return 100 * Math.pow(1 + safeElapsedDays / (9 * stability), -1);
}

function getScheduleStatus(nextReviewDate: Date, now: Date, progressRatio: number): DotPoint['status'] {
  const diffMs = nextReviewDate.getTime() - now.getTime();
  const warningProgressRatio = 0.8;

  if (diffMs <= 0) return 'danger';
  if (progressRatio >= warningProgressRatio) return 'warning';
  return 'safe';
}

function getNotebookOffset(notebookId: string) {
  let hash = 0;
  for (const char of notebookId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }

  return {
    x: (hash % 5 - 2) * 2.5,
    y: (Math.floor(hash / 5) % 5 - 2) * 2.5,
  };
}

function formatAxisDay(day: number) {
  return Number.isInteger(day) ? String(day) : day.toFixed(1);
}

function formatIntervalDays(day: number) {
  return `${Math.round(day * 10) / 10}일`;
}

function formatProgressPercent(ratio: number) {
  return `${Math.round(Math.max(0, ratio) * 100)}%`;
}

function getAverageInterval(cards: ForgettingCurveCard[] | DotPoint[]) {
  const validIntervals = cards
    .map((card) => Number(card.intervalDays))
    .filter((interval) => Number.isFinite(interval) && interval > 0);

  if (validIntervals.length === 0) return MIN_STABILITY_DAYS;

  return validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
}

function buildCurvePath({
  maxDays,
  stability,
  chartWidth,
  chartHeight,
  paddingLeft,
  paddingTop,
  minRetention,
  maxRetention,
}: {
  maxDays: number;
  stability: number;
  chartWidth: number;
  chartHeight: number;
  paddingLeft: number;
  paddingTop: number;
  minRetention: number;
  maxRetention: number;
}) {
  const pathPoints: string[] = [];
  const stepSize = Math.max(0.05, maxDays / 180);

  for (let t = 0; t <= maxDays; t += stepSize) {
    const retention = getRetention(t, stability);
    const cx = paddingLeft + (t / maxDays) * chartWidth;
    const cy = paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;

    pathPoints.push(`${t === 0 ? 'M' : 'L'} ${cx} ${cy}`);
  }

  return pathPoints.join(' ');
}

export default function ForgettingCurveChart({
  cards = [],
  mode = 'dashboard',
  notebookOptions = [],
  notebookColor = DEFAULT_NOTEBOOK_COLOR,
}: ForgettingCurveChartProps) {
  const [hoveredCluster, setHoveredCluster] = useState<DotCluster | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState('all');
  const svgContainerRef = useRef<HTMLDivElement | null>(null);

  // SVG 크기 정의
  const svgWidth = 600;
  const svgHeight = 320;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const filteredCards = useMemo(() => {
    if (mode !== 'dashboard' || selectedNotebookId === 'all') return cards;
    return cards.filter((card) => card.notebookId === selectedNotebookId);
  }, [cards, mode, selectedNotebookId]);

  // 필터 전 카드 묶음을 기준으로 X축 범위를 고정해 선택 옵션 간 스케일 차이를 없앤다.
  const maxDays = useMemo(() => {
    const maxInterval = Math.max(0, ...cards.map((card) => Number(card.intervalDays) || 0));
    return Math.max(MIN_CHART_DAYS, Math.ceil(maxInterval * 1.2));
  }, [cards]);

  const averageStability = useMemo(() => {
    return getAverageInterval(filteredCards);
  }, [filteredCards]);

  const xAxisDays = useMemo(() => {
    const step = 2;
    const days: number[] = [];

    for (let day = 0; day <= maxDays; day += step) {
      days.push(day);
    }

    if (days[days.length - 1] !== maxDays) {
      days.push(maxDays);
    }

    return days;
  }, [maxDays]);

  const minRetention = 20; // Y축 하단 한계
  const maxRetention = 100; // Y축 상단 한계

  const updateTooltipPosition = (clientX: number, clientY: number) => {
    const rect = svgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTooltipPosition({
      x: Math.min(rect.width - 8, Math.max(8, clientX - rect.left)),
      y: Math.min(rect.height - 8, Math.max(8, clientY - rect.top)),
    });
  };

  // 카드 위치 및 망각 상태 연산
  const dots = useMemo<DotPoint[]>(() => {
    const now = new Date();

    return filteredCards.map((card) => {
      const createdAt = new Date(card.createdAt);
      const lastReviewedAt = card.lastReviewedAt ? new Date(card.lastReviewedAt) : null;
      const nextReviewDate = new Date(card.nextReviewDate);
      const notebookId = card.notebookId || 'unknown';

      // 1. 마지막 학습 시점(t0) 결정 (학습 이력 없으면 생성일 기준)
      const t0 = lastReviewedAt || createdAt;

      // 2. 경과 시간 계산 (t, 일 단위)
      const elapsedMs = Math.max(0, now.getTime() - t0.getTime());
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

      // 3. 복습 주기 결정 (I, 최소 0.5일로 보정)
      const intervalDays = card.intervalDays > 0 ? card.intervalDays : 0.5;

      // 4. 경과 비율 계산 (x = t / I)
      const ratio = elapsedDays / intervalDays;

      // 5. 기억 유지도 계산: FSRS 계열의 안정성 기반 유지율
      const retentionVal = getRetention(elapsedDays, intervalDays);
      const retention = Math.round(Math.max(0, Math.min(100, retentionVal)) * 10) / 10;

      // 6. X, Y 좌표 매핑
      const baseCx = paddingLeft + (Math.min(elapsedDays, maxDays) / maxDays) * chartWidth;
      const baseCy = paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;
      const offset = getNotebookOffset(notebookId);
      const cx = Math.min(paddingLeft + chartWidth, Math.max(paddingLeft, baseCx + offset.x));
      const cy = Math.min(paddingTop + chartHeight, Math.max(paddingTop, baseCy + offset.y));

      // 7. 상태 설정: 실제 복습 예정일 기준
      const status = getScheduleStatus(nextReviewDate, now, ratio);

      return {
        cardId: card._id,
        notebookId,
        notebookTitle: card.notebookTitle || '이름 없는 공책',
        topic: card.topic,
        elapsedDays: Math.round(elapsedDays * 10) / 10,
        intervalDays,
        nextReviewDate,
        ratio,
        retention,
        cx,
        cy,
        status,
        difficulty: card.difficultyWeight,
        reviewCount: card.reviewCount,
      };
    });
  }, [filteredCards, chartWidth, chartHeight, paddingTop, maxDays, minRetention, maxRetention]);

  const dotClusters = useMemo<DotCluster[]>(() => {
    const byNotebook = new Map<string, DotPoint[]>();

    for (const dot of dots) {
      const items = byNotebook.get(dot.notebookId) || [];
      items.push(dot);
      byNotebook.set(dot.notebookId, items);
    }

    const proximityX = 34;
    const proximityY = 24;

    const makeCluster = (items: DotPoint[], clusterIndex: number): DotCluster => {
      const count = items.length;
      const cx = items.reduce((sum, item) => sum + item.cx, 0) / count;
      const cy = items.reduce((sum, item) => sum + item.cy, 0) / count;
      const retention = items.reduce((sum, item) => sum + item.retention, 0) / count;
      const elapsedDays = items.reduce((sum, item) => sum + item.elapsedDays, 0) / count;
      const intervalDays = items.reduce((sum, item) => sum + item.intervalDays, 0) / count;
      const progressPercent = items.reduce((sum, item) => sum + item.ratio, 0) / count;
      const nextReviewDate = items
        .slice()
        .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime())[0].nextReviewDate;
      const reviewCount = items.reduce((sum, item) => sum + item.reviewCount, 0) / count;
      const primary = items
        .slice()
        .sort((a, b) => b.retention - a.retention || a.elapsedDays - b.elapsedDays)[0];
      const status: DotPoint['status'] = items.some((item) => item.status === 'danger')
        ? 'danger'
        : items.some((item) => item.status === 'warning')
          ? 'warning'
          : 'safe';

      return {
        id: count === 1 ? primary.cardId : `${primary.notebookId}-${clusterIndex}`,
        kind: count === 1 ? 'card' : 'notebook',
        notebookId: primary.notebookId,
        notebookTitle: primary.notebookTitle,
        dots: items,
        primary,
        topics: items.slice(0, 4).map((item) => item.topic),
        count,
        cx,
        cy,
        retention: Math.round(retention * 10) / 10,
        elapsedDays: Math.round(elapsedDays * 10) / 10,
        intervalDays: Math.round(intervalDays * 10) / 10,
        nextReviewDate,
        progressPercent,
        reviewCount: Math.round(reviewCount * 10) / 10,
        status,
      };
    };

    return Array.from(byNotebook.values()).flatMap((items) => {
      const sorted = items.slice().sort((a, b) => a.cx - b.cx || a.cy - b.cy);
      const clusters: DotPoint[][] = [];

      for (const dot of sorted) {
        const candidate = clusters.find((cluster) => {
          const cx = cluster.reduce((sum, item) => sum + item.cx, 0) / cluster.length;
          const cy = cluster.reduce((sum, item) => sum + item.cy, 0) / cluster.length;
          return Math.abs(dot.cx - cx) <= proximityX && Math.abs(dot.cy - cy) <= proximityY;
        });

        if (candidate) {
          candidate.push(dot);
        } else {
          clusters.push([dot]);
        }
      }

      return clusters.map(makeCluster);
    });
  }, [dots]);

  const curvesToRender = useMemo<CurvePath[]>(() => {
    const curveArgs = {
      maxDays,
      chartWidth,
      chartHeight,
      paddingLeft,
      paddingTop,
      minRetention,
      maxRetention,
    };

    return [{
      id: 'average',
      path: buildCurvePath({ ...curveArgs, stability: averageStability }),
      color: mode === 'notebook' ? notebookColor : DASHBOARD_CURVE_COLOR,
      opacity: mode === 'notebook' ? 0.85 : 0.75,
    }];
  }, [averageStability, chartWidth, chartHeight, maxDays, minRetention, maxRetention, mode, notebookColor, paddingTop]);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartHeaderRow}>
          <h2 className={styles.chartTitle}>에빙하우스 망각 곡선 분포도</h2>
          {mode === 'dashboard' && notebookOptions.length > 0 && (
            <select
              className={styles.notebookSelect}
              value={selectedNotebookId}
              onChange={(event) => {
                setSelectedNotebookId(event.target.value);
                setHoveredCluster(null);
                setTooltipPosition(null);
              }}
              aria-label="망각 곡선 노트북 필터"
            >
              <option value="all">전체 평균</option>
              {notebookOptions.map((notebook) => (
                <option key={notebook.id} value={notebook.id}>
                  {notebook.title}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className={styles.chartSubtitle}>
          배경선은 평균 기억 유지율 기준선이며, 점의 색은 실제 다음 복습일 기준 상태입니다.
        </p>
      </div>

      <div className={styles.svgContainer} ref={svgContainerRef}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={styles.chartSvg}>
          <defs>
            {/* 곡선 채우기 그라디언트 */}
            <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="52%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
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

          {/* ── 수직 그리드 ── */}
          {xAxisDays.map((day) => {
            const x = paddingLeft + (day / maxDays) * chartWidth;
            return (
              <g key={day}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartHeight}
                  className={styles.gridLine}
                />
                <text x={x} y={paddingTop + chartHeight + 15} textAnchor="middle" className={styles.axisText}>
                  {formatAxisDay(day)}일
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
            {curvesToRender.map((curve) => (
              <path
                key={curve.id}
                d={curve.path}
                fill="none"
                stroke={curve.color ?? DASHBOARD_CURVE_COLOR}
                strokeWidth={mode === 'notebook' ? '3' : '3.5'}
                strokeOpacity={curve.opacity ?? 1}
                className={styles.mainCurve}
              />
            ))}
          </g>

          {/* ── 모든 카드 점(Dot) 렌더링 ── */}
          {dotClusters.map((cluster) => {
            const isHovered = hoveredCluster?.id === cluster.id;
            return (
              <g
                key={cluster.id}
                className={styles.dotGroup}
                onMouseEnter={(event) => {
                  setHoveredCluster(cluster);
                  updateTooltipPosition(event.clientX, event.clientY);
                }}
                onMouseMove={(event) => updateTooltipPosition(event.clientX, event.clientY)}
                onMouseLeave={() => {
                  setHoveredCluster(null);
                  setTooltipPosition(null);
                }}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  setHoveredCluster(cluster);
                  updateTooltipPosition(touch.clientX, touch.clientY);
                }}
                onTouchMove={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  updateTooltipPosition(touch.clientX, touch.clientY);
                }}
                onTouchEnd={() => {
                  setHoveredCluster(null);
                  setTooltipPosition(null);
                }}
              >
                {/* 글로우 백그라운드 링 */}
                <circle
                  cx={cluster.cx}
                  cy={cluster.cy}
                  r={isHovered ? 12 : cluster.kind === 'notebook' ? 9 : 7}
                  className={`${styles.dotGlow} ${styles[cluster.status]}`}
                />
                {/* 핵심 센터 서클 */}
                <circle
                  cx={cluster.cx}
                  cy={cluster.cy}
                  r={isHovered ? 6 : cluster.kind === 'notebook' ? 5 : 4}
                  className={`${styles.dotCore} ${styles[cluster.status]}`}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {cluster.kind === 'notebook' && (
                  <text x={cluster.cx + 9} y={cluster.cy - 9} className={styles.groupCount}>
                    {cluster.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── 툴팁 (Tooltip) ── */}
        {hoveredCluster && tooltipPosition && (
          <div
            className={styles.tooltip}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 12}px`,
            }}
          >
            <div className={styles.tooltipTopic}>
              {hoveredCluster.kind === 'notebook' ? hoveredCluster.notebookTitle : hoveredCluster.primary.topic}
            </div>
            <div className={styles.tooltipGrid}>
              <span>기억 유지도:</span>
              <strong className={styles[hoveredCluster.status]}>{hoveredCluster.retention}%</strong>

              {hoveredCluster.kind === 'notebook' ? (
                <>
                  <span>묶인 카드:</span>
                  <span>{hoveredCluster.count}개</span>

                  <span>평균 복습:</span>
                  <span>{hoveredCluster.reviewCount === 0 ? '최초 학습' : `${hoveredCluster.reviewCount}회`}</span>
                </>
              ) : (
                <>
                  <span>복습 단계:</span>
                  <span>
                    {hoveredCluster.primary.reviewCount === 0
                      ? '최초 학습'
                      : `${hoveredCluster.primary.reviewCount}회 복습`}
                  </span>
                </>
              )}

              <span>{hoveredCluster.kind === 'notebook' ? '가장 빠른 복습일:' : '다음 복습일:'}</span>
              <span>{formatDisplayDate(hoveredCluster.nextReviewDate)}</span>

              <span>{hoveredCluster.kind === 'notebook' ? '평균 주기:' : '복습 주기:'}</span>
              <span>{formatIntervalDays(hoveredCluster.intervalDays)}</span>

              <span>{hoveredCluster.kind === 'notebook' ? '평균 진행률:' : '주기 진행률:'}</span>
              <span>{formatProgressPercent(hoveredCluster.progressPercent)}</span>

              <span>경과 시간:</span>
              <span>{hoveredCluster.elapsedDays}일 지남</span>
            </div>
            {hoveredCluster.kind === 'notebook' && (
              <div className={styles.tooltipTopics}>
                {hoveredCluster.topics.join(', ')}
                {hoveredCluster.count > hoveredCluster.topics.length ? ` 외 ${hoveredCluster.count - hoveredCluster.topics.length}개` : ''}
              </div>
            )}
            <div className={styles.tooltipStatusText}>
              {hoveredCluster.status === 'safe' && '✓ 안전: 복습 주기 여유 있음'}
              {hoveredCluster.status === 'warning' && '⚠ 경고: 곧 복습 주기 도달'}
              {hoveredCluster.status === 'danger' && '! 위험: 망각 방지 복습 권장'}
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
        {mode === 'dashboard' && dots.length === 0 && (
          <div className={styles.legendItem}>
            <span>선택한 공책에 표시할 카드가 없습니다.</span>
          </div>
        )}
        {mode === 'notebook' && dots.length === 0 && (
          <div className={styles.legendItem}>
            <span>표시할 복습 기록이 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}
