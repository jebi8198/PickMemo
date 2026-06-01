'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  reviewLogs?: ForgettingCurveReviewLog[];
}

export interface ForgettingCurveReviewLog {
  _id?: string;
  pageId?: string;
  reviewedAt: string | Date;
  feedback: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
  previousIntervalDays: number;
  nextIntervalDays: number;
  previousDifficultyWeight: number;
  nextDifficultyWeight: number;
  previousReviewCount: number;
  nextReviewCount: number;
  nextReviewDate: string | Date;
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
  reviewLogs: NormalizedReviewLog[];
}

interface NormalizedReviewLog {
  reviewedAt: Date;
  feedback: ForgettingCurveReviewLog['feedback'];
  previousIntervalDays: number;
  nextIntervalDays: number;
  previousDifficultyWeight: number;
  nextDifficultyWeight: number;
  previousReviewCount: number;
  nextReviewCount: number;
  nextReviewDate: Date;
}

interface SawtoothSegment {
  durationDays: number;
  stabilityDays: number;
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

interface ReviewMarker {
  x: number;
  yTop: number;    // 100% 지점 (점선 상단)
  yBottom: number; // 복습 직전 유지율 지점 (점선 하단)
  feedback?: NormalizedReviewLog['feedback'];
  reviewedAt?: Date;
}

interface DetailCurve {
  id: string;
  topic: string;
  status: DotPoint['status'];
  actualPath: string;    // 현재 시점까지의 실제 복습 이력 (실선)
  predictedPath: string; // 현재 시점 이후의 망각 예측 (점선)
  resetXs: number[];
  reviewMarkers: ReviewMarker[];
  firstLearnedX: number;       // 처음 학습 지점 (day 0)의 x좌표
  firstLearnedDate?: Date;     // 처음 학습일 (첫 복습 기록 기준)
  currentX: number;
  currentY: number;
  color: string;
  retention: number;
  progressPercent: string;
  nextReviewDate: Date;
}

interface DetailPoint {
  id: string;
  topics: string[];
  status: DotPoint['status'];
  x: number;
  y: number;
  color: string;
  retention: number;
  progressPercent: string;
  nextReviewDate: Date;
  elapsedDays: number;
  intervalDays: number;
  reviewCount: number;
  feedback?: NormalizedReviewLog['feedback'];
  count: number;
}

interface HoveredMarker {
  marker: ReviewMarker;
  x: number;
  y: number;
}

interface DetailChart {
  maxDays: number;
  paddingTop: number;
  chartHeight: number;
  axisDays: number[];
  curve: DetailCurve;
  points: DetailPoint[];
}

interface TooltipPosition {
  x: number;
  y: number;
  above: boolean;
}

const MIN_STABILITY_DAYS = 0.5;
const MIN_CHART_DAYS = 7.5;
const DEFAULT_NOTEBOOK_COLOR = '#2563eb';
const DASHBOARD_CURVE_COLOR = '#64748b';
const STATUS_COLORS: Record<DotPoint['status'], string> = {
  safe: '#16a34a',
  warning: '#f59e0b',
  danger: '#ef4444',
};

function getRetention(elapsedDays: number, intervalDays: number) {
  const safeElapsedDays = Math.max(0, elapsedDays);
  const stability = Math.max(MIN_STABILITY_DAYS, intervalDays);

  return 100 * Math.pow(1 + safeElapsedDays / (9 * stability), -1);
}

function getScheduleStatus(progressRatio: number): DotPoint['status'] {
  if (progressRatio >= 1) return 'danger';
  if (progressRatio >= 0.8) return 'warning';
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

function formatShortDate(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatIntervalDays(day: number) {
  return `${Math.round(day * 10) / 10}일`;
}

function formatProgressPercent(ratio: number) {
  return `${Math.round(Math.max(0, ratio) * 100)}%`;
}

function getStatusLabel(status: DotPoint['status']) {
  if (status === 'danger') return '복습 필요';
  if (status === 'warning') return '복습 임박';
  return '안전';
}

function getAverageInterval(cards: ForgettingCurveCard[] | DotPoint[]) {
  const validIntervals = cards
    .map((card) => Number(card.intervalDays))
    .filter((interval) => Number.isFinite(interval) && interval > 0);

  if (validIntervals.length === 0) return MIN_STABILITY_DAYS;

  return validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
}

function normalizeReviewLogs(logs?: ForgettingCurveReviewLog[]): NormalizedReviewLog[] {
  return (logs ?? [])
    .map((log) => ({
      reviewedAt: new Date(log.reviewedAt),
      feedback: log.feedback,
      previousIntervalDays: Number(log.previousIntervalDays) || 0,
      nextIntervalDays: Number(log.nextIntervalDays) || 0,
      previousDifficultyWeight: Number(log.previousDifficultyWeight) || 1,
      nextDifficultyWeight: Number(log.nextDifficultyWeight) || 1,
      previousReviewCount: Number(log.previousReviewCount) || 0,
      nextReviewCount: Number(log.nextReviewCount) || 0,
      nextReviewDate: new Date(log.nextReviewDate),
    }))
    .filter((log) => Number.isFinite(log.reviewedAt.getTime()))
    .sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime());
}

function getFallbackSawtoothSegments(dot: DotPoint): SawtoothSegment[] {
  const completedReviews = Math.min(Math.max(dot.reviewCount, 0), 6);
  // 실제 알고리즘의 GOOD 배율(2.2/difficulty)로 역산
  const growthFactor = Math.max(1.2, 2.2 / Math.max(0.5, dot.difficulty));
  const historicalIntervals = Array.from({ length: completedReviews }, (_, index) => {
    const divisor = Math.pow(growthFactor, completedReviews - index);
    return Math.max(MIN_STABILITY_DAYS, dot.intervalDays / divisor);
  });
  const currentInterval = Math.max(MIN_STABILITY_DAYS, dot.intervalDays, dot.elapsedDays);

  return [...historicalIntervals, currentInterval].map((interval) => ({
    durationDays: interval,
    stabilityDays: interval,
  }));
}

function getDayDelta(from: Date, to: Date) {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function getSawtoothSegments(dot: DotPoint): SawtoothSegment[] {
  if (dot.reviewLogs.length > 0) {
    return dot.reviewLogs.map((log, index) => {
      const nextLog = dot.reviewLogs[index + 1];
      const stabilityDays = Math.max(MIN_STABILITY_DAYS, log.nextIntervalDays);
      const durationDays = nextLog
        ? getDayDelta(log.reviewedAt, nextLog.reviewedAt)
        : Math.max(dot.elapsedDays, stabilityDays);

      return {
        durationDays,
        stabilityDays,
      };
    });
  }

  return getFallbackSawtoothSegments(dot);
}


function getFeedbackLabel(feedback?: NormalizedReviewLog['feedback']) {
  if (feedback === 'AGAIN') return '다시';
  if (feedback === 'HARD') return '어려움';
  if (feedback === 'GOOD') return '좋음';
  if (feedback === 'EASY') return '쉬움';
  return '기록 없음';
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

function buildDetailCurvePath({
  dot,
  maxDays,
  chartWidth,
  chartHeight,
  paddingLeft,
  paddingTop,
  minRetention,
  maxRetention,
}: {
  dot: DotPoint;
  maxDays: number;
  chartWidth: number;
  chartHeight: number;
  paddingLeft: number;
  paddingTop: number;
  minRetention: number;
  maxRetention: number;
}): DetailCurve {
  const resetXs: number[] = [];
  const reviewMarkers: ReviewMarker[] = [];
  const segments = getSawtoothSegments(dot);
  const toX = (day: number) => paddingLeft + (Math.min(day, maxDays) / maxDays) * chartWidth;
  const toY = (retention: number) => paddingTop + chartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * chartHeight;

  const currentSegmentStart = segments.slice(0, -1).reduce((sum, s) => sum + s.durationDays, 0);
  const currentDay = currentSegmentStart + dot.elapsedDays;

  // 현재 시점을 기준으로 좌측(실제 이력)·우측(미래 예측) 경로를 나눠 그린다.
  type PathPoint = { x: number; y: number; reset: boolean };
  const allPoints: PathPoint[] = [];
  let cursor = 0;

  segments.forEach((segment, segmentIndex) => {
    const stepSize = Math.max(0.03, segment.durationDays / 36);

    for (let t = 0; t <= segment.durationDays; t += stepSize) {
      const day = cursor + Math.min(t, segment.durationDays);
      allPoints.push({ x: toX(day), y: toY(getRetention(t, segment.stabilityDays)), reset: false });
    }

    allPoints.push({
      x: toX(cursor + segment.durationDays),
      y: toY(getRetention(segment.durationDays, segment.stabilityDays)),
      reset: false,
    });
    cursor += segment.durationDays;

    if (segmentIndex < segments.length - 1) {
      const resetX = toX(cursor);
      const preReviewRetention = getRetention(segment.durationDays, segment.stabilityDays);
      allPoints.push({ x: resetX, y: toY(100), reset: true });
      resetXs.push(resetX);

      // 이 리셋(100% 점프)은 다음 세그먼트를 시작시킨 복습 시점이다
      const log = dot.reviewLogs[segmentIndex + 1];
      reviewMarkers.push({
        x: resetX,
        yTop: toY(100),
        yBottom: toY(preReviewRetention),
        feedback: log?.feedback,
        reviewedAt: log?.reviewedAt,
      });
    }
  });

  const currentX = toX(currentDay);
  const currentY = toY(dot.retention);

  // 현재 위치를 기준으로 분할 (경계 점을 양쪽에 공유해 곡선이 끊기지 않게 함)
  const actualPts: PathPoint[] = [];
  const predictedPts: PathPoint[] = [];
  for (const point of allPoints) {
    if (point.x <= currentX + 0.01) {
      actualPts.push(point);
    } else {
      predictedPts.push(point);
    }
  }
  const boundary: PathPoint = { x: currentX, y: currentY, reset: false };
  actualPts.push(boundary);
  predictedPts.unshift(boundary);

  const toPath = (pts: PathPoint[]) =>
    pts.map((p, i) => `${i === 0 || p.reset ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return {
    id: dot.cardId,
    topic: dot.topic,
    status: dot.status,
    actualPath: toPath(actualPts),
    predictedPath: predictedPts.length > 1 ? toPath(predictedPts) : '',
    resetXs,
    reviewMarkers,
    firstLearnedX: toX(0),
    firstLearnedDate: dot.reviewLogs[0]?.reviewedAt,
    currentX,
    currentY,
    color: STATUS_COLORS[dot.status],
    retention: dot.retention,
    progressPercent: formatProgressPercent(dot.ratio),
    nextReviewDate: dot.nextReviewDate,
  };
}

export default function ForgettingCurveChart({
  cards = [],
  mode = 'dashboard',
  notebookOptions = [],
  notebookColor = DEFAULT_NOTEBOOK_COLOR,
}: ForgettingCurveChartProps) {
  const [hoveredCluster, setHoveredCluster] = useState<DotCluster | null>(null);
  const [hoveredDetailPoint, setHoveredDetailPoint] = useState<DetailPoint | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<HoveredMarker | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState('all');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
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
    // 레이블이 8~12개 사이가 되도록 step을 동적으로 선택
    const rawStep = maxDays / 10;
    const step = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : rawStep <= 10 ? 10 : Math.ceil(rawStep / 5) * 5;
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

    const halfTooltipW = 100; // 툴팁 너비의 절반 근사값 (translate -50% 보정)
    const tooltipH = 140;     // 툴팁 높이 근사값
    const cursorY = clientY - rect.top;
    const above = cursorY >= tooltipH; // 위쪽 공간이 충분하면 커서 위에, 아니면 아래에 표시

    setTooltipPosition({
      x: Math.min(rect.width - halfTooltipW, Math.max(halfTooltipW, clientX - rect.left)),
      y: Math.min(rect.height - 8, Math.max(0, cursorY)),
      above,
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
      const reviewLogs = normalizeReviewLogs(card.reviewLogs);

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
      const status = getScheduleStatus(ratio);

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
        reviewLogs,
      };
    });
  }, [filteredCards, chartWidth, chartHeight, paddingTop, maxDays, minRetention, maxRetention]);

  const dotClusters = useMemo<DotCluster[]>(() => {
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

      const notebookIds = new Set(items.map((item) => item.notebookId));
      const notebookTitle = notebookIds.size > 1 ? '여러 공책' : primary.notebookTitle;

      return {
        id: count === 1 ? primary.cardId : `cluster-${clusterIndex}`,
        kind: count === 1 ? 'card' : 'notebook',
        notebookId: primary.notebookId,
        notebookTitle,
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

    const sorted = dots.slice().sort((a, b) => a.cx - b.cx || a.cy - b.cy);
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

  const selectedCluster = useMemo(() => {
    if (!selectedClusterId) return null;
    return dotClusters.find((cluster) => cluster.id === selectedClusterId) ?? null;
  }, [dotClusters, selectedClusterId]);

  const detailChart = useMemo<DetailChart | null>(() => {
    if (!selectedCluster) return null;

    // dot별 segments를 한 번만 계산해 재사용 (중복 호출 제거)
    const dotSegmentsMap = new Map<string, SawtoothSegment[]>();
    const getSegments = (dot: DotPoint) => {
      if (!dotSegmentsMap.has(dot.cardId)) {
        dotSegmentsMap.set(dot.cardId, getSawtoothSegments(dot));
      }
      return dotSegmentsMap.get(dot.cardId)!;
    };
    const getSawtoothTotalDays = (dot: DotPoint) =>
      getSegments(dot).reduce((sum, segment) => sum + segment.durationDays, 0);

    // notebook 클러스터도 primary 카드의 실제 reviewLogs 사용
    const representativeDot: DotPoint = {
      ...selectedCluster.primary,
      elapsedDays: selectedCluster.elapsedDays,
      intervalDays: selectedCluster.intervalDays,
      nextReviewDate: selectedCluster.nextReviewDate,
      ratio: selectedCluster.progressPercent,
      retention: selectedCluster.retention,
      status: selectedCluster.status,
      reviewCount: Math.round(selectedCluster.reviewCount),
      reviewLogs: selectedCluster.primary.reviewLogs,
    };

    const detailMaxDays = Math.max(
      2,
      Math.ceil(Math.max(
        getSawtoothTotalDays(representativeDot),
        ...selectedCluster.dots.map(getSawtoothTotalDays)
      ) * 1.1)
    );
    const detailPaddingTop = paddingTop + 14;
    const detailChartHeight = chartHeight - 18;
    const curve = buildDetailCurvePath({
      dot: representativeDot,
      maxDays: detailMaxDays,
      chartWidth,
      chartHeight: detailChartHeight,
      paddingLeft,
      paddingTop: detailPaddingTop,
      minRetention,
      maxRetention,
    });
    const toX = (day: number) => paddingLeft + (Math.min(day, detailMaxDays) / detailMaxDays) * chartWidth;
    const toY = (retention: number) => detailPaddingTop + detailChartHeight - ((Math.max(minRetention, retention) - minRetention) / (maxRetention - minRetention)) * detailChartHeight;
    const rawPoints = selectedCluster.dots.map((dot) => {
      const segments = getSegments(dot);
      const segmentStart = segments.slice(0, -1).reduce((sum, s) => sum + s.durationDays, 0);
      const latestLog = dot.reviewLogs[dot.reviewLogs.length - 1];
      return {
        id: dot.cardId,
        topic: dot.topic,
        status: dot.status,
        x: toX(segmentStart + dot.elapsedDays),
        y: toY(dot.retention),
        color: STATUS_COLORS[dot.status],
        retention: dot.retention,
        progressPercent: formatProgressPercent(dot.ratio),
        nextReviewDate: dot.nextReviewDate,
        elapsedDays: dot.elapsedDays,
        intervalDays: dot.intervalDays,
        reviewCount: dot.reviewCount,
        feedback: latestLog?.feedback,
      };
    });

    // 위치가 가까운 점들을 하나로 병합
    const overlapThreshold = 8;
    const merged: typeof rawPoints = [];
    const used = new Set<string>();

    for (const point of rawPoints) {
      if (used.has(point.id)) continue;
      const group = rawPoints.filter(
        (p) => !used.has(p.id) && Math.abs(p.x - point.x) <= overlapThreshold && Math.abs(p.y - point.y) <= overlapThreshold
      );
      group.forEach((p) => used.add(p.id));
      if (group.length === 1) {
        merged.push(point);
      } else {
        // 평균 위치, 가장 나쁜 상태를 대표 상태로
        const avgX = group.reduce((s, p) => s + p.x, 0) / group.length;
        const avgY = group.reduce((s, p) => s + p.y, 0) / group.length;
        const avgRetention = group.reduce((s, p) => s + p.retention, 0) / group.length;
        const repStatus: DotPoint['status'] = group.some((p) => p.status === 'danger')
          ? 'danger'
          : group.some((p) => p.status === 'warning')
            ? 'warning'
            : 'safe';
        merged.push({
          ...point,
          x: avgX,
          y: avgY,
          retention: Math.round(avgRetention * 10) / 10,
          status: repStatus,
          color: STATUS_COLORS[repStatus],
        });
      }
    }

    const points = merged.map((p) => {
      const group = rawPoints.filter(
        (r) => Math.abs(r.x - p.x) <= overlapThreshold && Math.abs(r.y - p.y) <= overlapThreshold
      );
      return {
        ...p,
        topics: group.map((r) => r.topic),
        count: group.length,
      };
    });

    // 세부 X축 눈금: maxDays에 비례해 4~6개 생성
    const rawStep = detailMaxDays / 5;
    const detailStep = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : rawStep <= 10 ? 10 : Math.ceil(rawStep / 5) * 5;
    const axisDays: number[] = [];
    for (let day = 0; day <= detailMaxDays; day += detailStep) {
      axisDays.push(day);
    }
    if (axisDays[axisDays.length - 1] !== detailMaxDays) {
      axisDays.push(detailMaxDays);
    }

    return {
      maxDays: detailMaxDays,
      paddingTop: detailPaddingTop,
      chartHeight: detailChartHeight,
      curve,
      points,
      axisDays,
    };
  }, [chartHeight, chartWidth, maxRetention, minRetention, paddingLeft, paddingTop, selectedCluster]);

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartHeader}>
        <div className={styles.chartHeaderRow}>
          <h2 className={styles.chartTitle}>
            {selectedCluster
              ? `${selectedCluster.kind === 'notebook' ? selectedCluster.notebookTitle : selectedCluster.primary.topic} 복습 곡선`
              : (
                <>
                  에빙하우스 망각 곡선 분포도
                  <Link
                    href="/learn/forgetting-curve"
                    className={styles.helpLink}
                    title="망각 곡선이란?"
                    aria-label="망각 곡선 설명 보기"
                  >
                    ?
                  </Link>
                </>
              )}
          </h2>
          <div className={styles.chartHeaderControls}>
            {!selectedCluster && mode === 'dashboard' && notebookOptions.length > 0 && (
              <select
                className={styles.notebookSelect}
                value={selectedNotebookId}
                onChange={(event) => {
                  setSelectedNotebookId(event.target.value);
                  setHoveredCluster(null);
                  setHoveredDetailPoint(null);
                  setTooltipPosition(null);
                  setSelectedClusterId(null);
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
            {selectedCluster && (
              <>
                {selectedCluster.count > 1 && (
                  <div className={styles.detailSummaryBadge} title="비슷한 복습 시점의 카드 묶음입니다.">
                    <span>{selectedCluster.count}개 카드</span>
                    <strong>평균 {formatProgressPercent(selectedCluster.progressPercent)}</strong>
                  </div>
                )}
              <button
                type="button"
                className={styles.chartModeButton}
                onClick={() => {
                  setSelectedClusterId(null);
                  setHoveredDetailPoint(null);
                  setTooltipPosition(null);
                }}
              >
                전체 보기
              </button>
              </>
            )}
          </div>
        </div>
        <p className={styles.chartSubtitle}>
          {selectedCluster
            ? selectedCluster.primary.reviewLogs.length === 0
              ? '저장된 복습 이력이 없어 현재 상태를 근사해 표시한 곡선입니다. 실선은 현재까지, 점선은 앞으로의 망각 예측입니다.'
              : selectedCluster.count > 1
                ? '실선은 실제 복습 이력, 점선은 앞으로의 망각 예측입니다. 각 카드의 현재 위치는 점으로 표시됩니다.'
                : '실선은 실제 복습 이력, 점선은 앞으로의 망각 예측입니다. 세로 점선은 복습 시점입니다.'
            : dots.length > 0
              ? '배경선은 평균 기억 유지율 기준선입니다. 점을 클릭하면 해당 카드의 복습 흐름을 자세히 볼 수 있습니다.'
              : '배경선은 평균 기억 유지율 기준선이며, 점의 색은 복습 주기 진행률 기준 상태입니다.'}
        </p>
      </div>

      <div
        className={styles.svgContainer}
        ref={svgContainerRef}
        onTouchEnd={() => {
          setHoveredDetailPoint(null);
          setHoveredMarker(null);
          setHoveredCluster(null);
          setTooltipPosition(null);
        }}
      >
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className={styles.chartSvg}>
          <defs>
            {/* 곡선 채우기 그라디언트 */}
            <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="52%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* 대시보드 모드 클리핑 패스 */}
            <clipPath id="chartClip">
              <rect x={paddingLeft} y={paddingTop} width={chartWidth} height={chartHeight} />
            </clipPath>

            {/* 세부 모드 클리핑 패스 – strokeWidth(3) 절반만큼 위쪽 여백 추가 */}
            {detailChart && (
              <clipPath id="detailChartClip">
                <rect x={paddingLeft} y={detailChart.paddingTop - 2} width={chartWidth} height={detailChart.chartHeight + 2} />
              </clipPath>
            )}
          </defs>

          {selectedCluster && detailChart ? (
            <>
              {[20, 40, 60, 80, 100].map((retentionValue) => {
                const y = detailChart.paddingTop + detailChart.chartHeight - ((retentionValue - minRetention) / (maxRetention - minRetention)) * detailChart.chartHeight;
                return (
                  <g key={retentionValue}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={paddingLeft + chartWidth}
                      y2={y}
                      className={styles.gridLine}
                    />
                    <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className={styles.axisText}>
                      {retentionValue}%
                    </text>
                  </g>
                );
              })}

              {detailChart.axisDays.map((day) => {
                const x = paddingLeft + (day / detailChart.maxDays) * chartWidth;
                return (
                  <g key={day}>
                    <line
                      x1={x}
                      y1={detailChart.paddingTop}
                      x2={x}
                      y2={detailChart.paddingTop + detailChart.chartHeight}
                      className={styles.gridLine}
                    />
                    <text x={x} y={paddingTop + chartHeight + 15} textAnchor="middle" className={styles.axisText}>
                      {formatAxisDay(day)}일
                    </text>
                  </g>
                );
              })}

              <line
                x1={paddingLeft}
                y1={detailChart.paddingTop}
                x2={paddingLeft}
                y2={detailChart.paddingTop + detailChart.chartHeight}
                stroke="var(--border-default)"
                strokeWidth="1"
              />
              <line
                x1={paddingLeft}
                y1={detailChart.paddingTop + detailChart.chartHeight}
                x2={paddingLeft + chartWidth}
                y2={detailChart.paddingTop + detailChart.chartHeight}
                stroke="var(--border-default)"
                strokeWidth="1"
              />

              {/* 처음 학습일 라벨 – x축 아래에 표시 (곡선과 겹치지 않도록) */}
              {detailChart.curve.firstLearnedDate && (
                <text
                  x={detailChart.curve.firstLearnedX}
                  y={paddingTop + chartHeight + 28}
                  textAnchor="start"
                  className={styles.firstLearnedLabel}
                >
                  처음 학습 {formatShortDate(detailChart.curve.firstLearnedDate)}
                </text>
              )}

              {/* 복습 마커 날짜 라벨 – 클리핑 영역 바깥에 렌더링 */}
              {detailChart.curve.reviewMarkers.map((marker) =>
                marker.reviewedAt ? (
                  <text
                    key={`label-${marker.x}`}
                    x={marker.x}
                    y={paddingTop + 11}
                    textAnchor="middle"
                    className={styles.markerDateLabel}
                  >
                    {formatShortDate(marker.reviewedAt)}
                  </text>
                ) : null
              )}

              {/* 현재 시점 라벨 */}
              <text
                x={detailChart.curve.currentX}
                y={paddingTop + 11}
                textAnchor="middle"
                className={styles.nowLabel}
              >
                현재
              </text>

              <g clipPath="url(#detailChartClip)">
                {/* 처음 학습 지점 강조 점 (day 0, 100%) */}
                {detailChart.curve.firstLearnedDate && (
                  <circle
                    cx={detailChart.curve.firstLearnedX}
                    cy={detailChart.paddingTop}
                    r={3}
                    fill={detailChart.curve.color}
                    className={styles.reviewMarkerCap}
                  />
                )}
                {/* 복습 마커 – 복습 직전 유지율에서 100%까지 올라가는 세로 점선 */}
                {detailChart.curve.reviewMarkers.map((marker) => (
                  <g key={`marker-${marker.x}`}>
                    <line
                      x1={marker.x}
                      y1={marker.yBottom}
                      x2={marker.x}
                      y2={marker.yTop}
                      className={styles.reviewMarker}
                      stroke={detailChart.curve.color}
                    />
                    {/* 100% 지점 강조 점 */}
                    <circle
                      cx={marker.x}
                      cy={marker.yTop}
                      r={2.5}
                      fill={detailChart.curve.color}
                      className={styles.reviewMarkerCap}
                    />
                    {/* 투명 클릭 영역 (피드백 기록이 있을 때만 인터랙션) */}
                    {marker.feedback && (
                      <rect
                        x={marker.x - 8}
                        y={marker.yTop}
                        width={16}
                        height={Math.max(marker.yBottom - marker.yTop, 16)}
                        fill="transparent"
                        className={styles.reviewMarkerHitArea}
                        onMouseEnter={(event) => {
                          setHoveredMarker({ marker, x: event.clientX, y: event.clientY });
                          updateTooltipPosition(event.clientX, event.clientY);
                        }}
                        onMouseMove={(event) => {
                          updateTooltipPosition(event.clientX, event.clientY);
                        }}
                        onMouseLeave={() => {
                          setHoveredMarker(null);
                          setTooltipPosition(null);
                        }}
                      />
                    )}
                  </g>
                ))}
                {/* 실제 복습 이력 구간 (실선) */}
                <path
                  key={`${selectedClusterId}-actual`}
                  d={detailChart.curve.actualPath}
                  fill="none"
                  stroke={selectedCluster.kind === 'notebook' ? notebookColor : detailChart.curve.color}
                  strokeWidth="3"
                  strokeOpacity={selectedCluster.kind === 'notebook' ? 0.7 : 0.9}
                  className={styles.detailCurve}
                />
                {/* 미래 망각 예측 구간 (점선) */}
                {detailChart.curve.predictedPath && (
                  <path
                    key={`${selectedClusterId}-predicted`}
                    d={detailChart.curve.predictedPath}
                    fill="none"
                    stroke={selectedCluster.kind === 'notebook' ? notebookColor : detailChart.curve.color}
                    strokeWidth="2.5"
                    strokeOpacity={0.45}
                    strokeDasharray="5 5"
                    className={styles.detailPredictedCurve}
                  />
                )}
                {/* 현재 시점 세로 가이드 */}
                <line
                  x1={detailChart.curve.currentX}
                  y1={detailChart.paddingTop}
                  x2={detailChart.curve.currentX}
                  y2={detailChart.paddingTop + detailChart.chartHeight}
                  className={styles.nowGuide}
                />
                {detailChart.points.map((point) => (
                  <circle
                    key={point.id}
                    className={styles.detailPoint}
                    cx={point.x}
                    cy={point.y}
                    r={selectedCluster.kind === 'notebook' ? 4.5 : 5}
                    fill={point.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseEnter={(event) => {
                      setHoveredDetailPoint(point);
                      setHoveredMarker(null);
                      updateTooltipPosition(event.clientX, event.clientY);
                    }}
                    onMouseMove={(event) => {
                      updateTooltipPosition(event.clientX, event.clientY);
                    }}
                    onMouseLeave={() => {
                      setHoveredDetailPoint(null);
                      setTooltipPosition(null);
                    }}
                    onTouchStart={(event) => {
                      const touch = event.touches[0];
                      if (!touch) return;
                      event.stopPropagation();
                      setHoveredDetailPoint(point);
                      updateTooltipPosition(touch.clientX, touch.clientY);
                    }}
                    onTouchMove={(event) => {
                      const touch = event.touches[0];
                      if (!touch) return;
                      updateTooltipPosition(touch.clientX, touch.clientY);
                    }}
                  />
                ))}
              </g>
            </>
          ) : (
            <>
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
                    onClick={() => {
                      setSelectedClusterId(cluster.id);
                      setHoveredCluster(null);
                      setHoveredDetailPoint(null);
                      setTooltipPosition(null);
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
            </>
          )}

          {/* ── 축 제목 (공통) ── */}
          <text
            x={paddingLeft + chartWidth / 2}
            y={svgHeight - 3}
            textAnchor="middle"
            className={styles.axisTitle}
          >
            경과 일수 (마지막 복습 기준)
          </text>
          <text
            x={13}
            y={paddingTop + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 13 ${paddingTop + chartHeight / 2})`}
            className={styles.axisTitle}
          >
            기억 유지도
          </text>
        </svg>

        {/* ── 툴팁 (Tooltip) ── */}
        {hoveredMarker && tooltipPosition && !hoveredDetailPoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.above ? tooltipPosition.y - 12 : tooltipPosition.y + 12}px`,
              transform: tooltipPosition.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
            }}
          >
            <div className={styles.tooltipTopic}>복습 기록</div>
            <div className={styles.tooltipGrid}>
              <span>복습일:</span>
              <span>{formatDisplayDate(hoveredMarker.marker.reviewedAt)}</span>

              <span>피드백:</span>
              <strong>{getFeedbackLabel(hoveredMarker.marker.feedback)}</strong>
            </div>
          </div>
        )}
        {hoveredDetailPoint && tooltipPosition && (
          <div
            className={styles.tooltip}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.above ? tooltipPosition.y - 12 : tooltipPosition.y + 12}px`,
              transform: tooltipPosition.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
            }}
          >
            <div className={styles.tooltipTopic}>
              {hoveredDetailPoint.count > 1
                ? `${hoveredDetailPoint.count}개 카드`
                : hoveredDetailPoint.topics[0]}
            </div>
            <div className={styles.tooltipGrid}>
              <span>상태:</span>
              <strong className={styles[hoveredDetailPoint.status]}>{getStatusLabel(hoveredDetailPoint.status)}</strong>

              <span>기억 유지도:</span>
              <strong className={styles[hoveredDetailPoint.status]}>{hoveredDetailPoint.retention}%</strong>

              <span>복습 단계:</span>
              <span>{hoveredDetailPoint.reviewCount === 0 ? '최초 학습' : `${hoveredDetailPoint.reviewCount}회 복습`}</span>

              {hoveredDetailPoint.count === 1 && (
                <>
                  <span>최근 피드백:</span>
                  <span>{getFeedbackLabel(hoveredDetailPoint.feedback)}</span>
                </>
              )}

              <span>다음 복습일:</span>
              <span>{formatDisplayDate(hoveredDetailPoint.nextReviewDate)}</span>

              <span>복습 주기:</span>
              <span>{formatIntervalDays(hoveredDetailPoint.intervalDays)}</span>

              <span>주기 진행률:</span>
              <span>{hoveredDetailPoint.progressPercent}</span>

              <span>경과 시간:</span>
              <span>{hoveredDetailPoint.elapsedDays}일 지남</span>
            </div>
            {hoveredDetailPoint.count > 1 && (
              <div className={styles.tooltipTopics}>
                {hoveredDetailPoint.topics.join(', ')}
              </div>
            )}
          </div>
        )}
        {!hoveredDetailPoint && hoveredCluster && tooltipPosition && (
          <div
            className={styles.tooltip}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.above ? tooltipPosition.y - 12 : tooltipPosition.y + 12}px`,
              transform: tooltipPosition.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0%)',
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
