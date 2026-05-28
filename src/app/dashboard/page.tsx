'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NotebookCard } from '@/components/notebook/NotebookCard';
import { NotebookForm } from '@/components/notebook/NotebookForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SessionSetup } from '@/components/session/SessionSetup';
import { Header } from '@/components/layout/Header';
import ForgettingCurveChart from '@/components/dashboard/ForgettingCurveChart';
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
  pages: any[];
}

type ActiveModal = 'newNotebook' | 'session' | null;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [notebooks, setNotebooks] = useState<INotebook[]>([]);
  const [stats, setStats] = useState<IUserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  // 미인증 시 로그인 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      const [notebooksRes, statsRes] = await Promise.all([
        fetch('/api/notebooks'),
        fetch('/api/user/stats'),
      ]);

      if (notebooksRes.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (notebooksRes.ok) {
        const data = await notebooksRes.json();
        // API가 배열 또는 { notebooks: [] } 형태로 반환할 수 있으므로 양쪽 처리
        setNotebooks(Array.isArray(data) ? data : (data.notebooks ?? []));
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (status !== 'authenticated') return;
    loadDashboardData();
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 새 공책 생성 ──
  const handleCreateNotebook = async (data: { title: string; description: string; color: string }) => {
    try {
      setIsCreatingNotebook(true);
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('공책 생성 실패');
      setActiveModal(null);
      await loadDashboardData(); // 목록 갱신
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingNotebook(false);
    }
  };

  // ── 학습 시작 (SessionSetup → play 페이지로 이동) ──
  const handleSessionStart = (notebookId: string, count: number) => {
    setActiveModal(null);
    router.push(`/session/play?notebookId=${notebookId}&count=${count}`);
  };

  // notebooks를 SessionSetup 형식으로 변환
  const notebookOptions = notebooks.map((nb) => ({
    id: nb._id,
    title: nb.title,
    reviewCount: nb.reviewDueCount ?? nb.pageCount ?? 0,
  }));

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

  if (status === 'unauthenticated') return null;

  const reviewDueCount = stats?.reviewDueToday ?? 0;

  return (
    <>
      <Header />
      <div className={styles.container}>
      {/* ── 상단 배너 ── */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1 className={styles.welcomeTitle}>
            🧠 안녕하세요, {session?.user?.name || '학습자'}님!
          </h1>
          <p className={styles.welcomeSubtitle}>
            {reviewDueCount > 0
              ? `오늘 복습할 제비가 ${reviewDueCount}개 준비되어 있습니다.`
              : '오늘 복습할 카드를 모두 완료했습니다!'}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          <Button
            variant="primary"
            onClick={() => setActiveModal('session')}
            disabled={notebooks.length === 0}
          >
            🎯 전체 복습 시작
          </Button>
          <Button variant="secondary" onClick={() => setActiveModal('newNotebook')}>
            ➕ 새 공책 만들기
          </Button>
        </div>
      </div>

      {/* ── 통계 그리드 ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>📚 총 공책</span>
          <span className={styles.statValue}>{stats?.totalNotebooks ?? notebooks.length}개</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>📑 총 학습 카드</span>
          <span className={styles.statValue}>{stats?.totalPages ?? 0}장</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>🔄 복습 완료 카드</span>
          <span className={styles.statValue}>{stats?.totalReviewed ?? 0}장</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>🔥 평균 난이도 가중치</span>
          <span className={styles.statValue}>
            {stats?.averageDifficulty ? `${stats.averageDifficulty.toFixed(2)}x` : '1.00x'}
          </span>
        </div>
      </div>

      {/* ── 망각 곡선 차트 ── */}
      {stats?.pages && stats.pages.length > 0 && (
        <section className={styles.chartSection}>
          <ForgettingCurveChart cards={stats.pages} />
        </section>
      )}

      {/* ── 내 공책 목록 ── */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📓 내 공책 목록</h2>
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
              <Button variant="primary" onClick={() => setActiveModal('newNotebook')}>
                첫 공책 만들기
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 새 공책 만들기 모달 ── */}
      <Modal
        isOpen={activeModal === 'newNotebook'}
        onClose={() => setActiveModal(null)}
        title="새 공책 만들기"
      >
        <NotebookForm onSubmit={handleCreateNotebook} isLoading={isCreatingNotebook} />
      </Modal>

      {/* ── 전체 복습 시작 모달 ── */}
      <Modal
        isOpen={activeModal === 'session'}
        onClose={() => setActiveModal(null)}
        title="학습 설정"
        size="lg"
      >
        <SessionSetup
          notebooks={notebookOptions}
          onStart={handleSessionStart}
        />
      </Modal>
    </div>
    </>
  );
}
