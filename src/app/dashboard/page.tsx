'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NotebookCard } from '@/components/notebook/NotebookCard';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import ForgettingCurveChart from '@/components/dashboard/ForgettingCurveChart';
import type { ForgettingCurveCard } from '@/components/dashboard/ForgettingCurveChart';
import styles from './page.module.css';

interface INotebook {
  _id: string;
  title: string;
  description?: string;
  color: string;
  pageCount: number;
  reviewDueCount: number;
}

interface IUserStats {
  totalNotebooks: number;
  totalPages: number;
  totalReviewed: number;
  reviewDueToday: number;
  averageDifficulty: number;
  pages: ForgettingCurveCard[];
}

interface NotebooksResponse {
  notebooks: INotebook[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notebooks, setNotebooks] = useState<INotebook[]>([]);
  const [stats, setStats] = useState<IUserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // 미인증 시 로그인 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // 데이터 fetch
  useEffect(() => {
    if (status !== 'authenticated') return;

    async function loadDashboardData() {
      try {
        setLoadingData(true);

        // 1. 공책 목록 로드
        const notebooksRes = await fetch('/api/notebooks');
        if (notebooksRes.ok) {
          const notebooksData = (await notebooksRes.json()) as NotebooksResponse;
          setNotebooks(notebooksData.notebooks);
        }

        // 2. 통계 및 망각 곡선 카드 목록 로드
        const statsRes = await fetch('/api/user/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDashboardData();
  }, [status]);

  if (status === 'loading' || loadingData) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
            <p>학습 데이터를 가져오는 중...</p>
          </div>
        </div>
      </>
    );
  }

  if (status === 'unauthenticated') {
    return null; // 리다이렉트 대기
  }

  const reviewDueCount = stats?.reviewDueToday || 0;

  return (
    <>
      <Header />
      <div className={styles.container}>
        {/* ── 상단 배너 ── */}
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeText}>
            <h1 className={styles.welcomeTitle}>
              안녕하세요, {session?.user?.name || '학습자'}님!
            </h1>
            <p className={styles.welcomeSubtitle}>
              {reviewDueCount > 0
                ? `오늘 복습할 제비가 ${reviewDueCount}개 준비되어 있습니다. 뇌를 가볍게 자극해볼까요?`
                : '오늘 복습할 카드를 모두 완료했거나 복습 주기가 아직 도달하지 않았습니다!'}
            </p>
          </div>
          <div className={styles.welcomeActions}>
            <Link href="/session">
              <Button variant="primary" disabled={notebooks.length === 0}>
                🎯 전체 복습 시작
              </Button>
            </Link>
            <Link href="/notebooks/new">
              <Button variant="secondary">
                ➕ 새 공책 만들기
              </Button>
            </Link>
          </div>
        </div>

        {/* ── 통계 그리드 ── */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              📚 총 공책
              <span className={styles.helpIcon} tabIndex={0} aria-label="총 공책 설명" data-tooltip="현재 계정에 생성된 전체 공책 수입니다.">?</span>
            </span>
            <span className={styles.statValue}>{stats?.totalNotebooks || notebooks.length}개</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              📑 총 학습 카드
              <span className={styles.helpIcon} tabIndex={0} aria-label="총 학습 카드 설명" data-tooltip="모든 공책에 들어 있는 학습 카드의 합계입니다.">?</span>
            </span>
            <span className={styles.statValue}>{stats?.totalPages || 0}장</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              🔄 복습 완료 카드
              <span className={styles.helpIcon} tabIndex={0} aria-label="복습 완료 카드 설명" data-tooltip="피드백을 제출해 한 번 이상 복습한 카드 수입니다.">?</span>
            </span>
            <span className={styles.statValue}>{stats?.totalReviewed || 0}장</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              🔥 평균 난이도 가중치
              <span className={styles.helpIcon} tabIndex={0} aria-label="평균 난이도 가중치 설명" data-tooltip="최근 피드백을 기준으로 계산된 카드들의 평균 난이도입니다. 높을수록 더 어렵게 평가된 카드가 많습니다.">?</span>
            </span>
            <span className={styles.statValue}>
              {stats?.averageDifficulty ? `${stats.averageDifficulty.toFixed(2)}x` : '1.00x'}
            </span>
          </div>
        </div>

        {/* ── 망각 곡선 차트 섹션 ── */}
        {stats?.pages && stats.pages.length > 0 && (
          <section className={styles.chartSection}>
            <ForgettingCurveChart cards={stats.pages} />
          </section>
        )}

        {/* ── 내 공책들 리스트 ── */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📓 내 공책 목록</h2>
            <Link href="/notebooks/new">
              <Button variant="primary">새 공책 만들기</Button>
            </Link>
          </div>

          <div className={styles.notebooksGrid}>
            {notebooks.length > 0 ? (
              notebooks.map((nb) => (
                <NotebookCard
                  key={nb._id}
                  id={nb._id}
                  title={nb.title}
                  description={nb.description}
                  color={nb.color}
                  reviewCount={nb.reviewDueCount}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <span style={{ fontSize: '3rem' }}>📭</span>
                <h3 className={styles.emptyTitle}>생성된 공책이 없습니다</h3>
                <p>기억하고 싶은 지식을 기록할 첫 번째 공책을 만들어 보세요.</p>
                <Link href="/notebooks/new">
                  <Button variant="primary">첫 공책 만들기</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
