'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { NotebookCard } from '@/components/notebook/NotebookCard';
import { NotebookForm } from '@/components/notebook/NotebookForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SessionSetup } from '@/components/session/SessionSetup';
import { Header } from '@/components/layout/Header';
import { useToast } from '@/components/providers/ToastProvider';
import { getResponseError } from '@/lib/http';
import ForgettingCurveChart, { ForgettingCurveCard, NotebookOption } from '@/components/dashboard/ForgettingCurveChart';
import styles from './page.module.css';

interface INotebook {
  _id: string;
  title: string;
  description?: string;
  color: string;
  pageCount: number;
  reviewDueCount: number;
  createdAt?: string;
  lastStudiedAt?: string | null;
}

interface IUserStats {
  totalNotebooks: number;
  totalPages: number;
  totalReviewed: number;
  reviewDueToday: number;
  averageDifficulty: number;
  pages: ForgettingCurveCard[];
}

type ActiveModal = 'newNotebook' | 'session' | null;
type NotebookSort = 'recent' | 'title' | 'due';

async function fetchDashboardPayload(): Promise<{
  notebooks: INotebook[];
  stats: IUserStats | null;
  unauthorized: boolean;
}> {
  const [notebooksRes, statsRes] = await Promise.all([
    fetch('/api/notebooks'),
    fetch('/api/user/stats'),
  ]);

  if (notebooksRes.status === 401 || statsRes.status === 401) {
    return { notebooks: [], stats: null, unauthorized: true };
  }

  const notebooksData = notebooksRes.ok ? await notebooksRes.json() : null;
  const statsData = statsRes.ok ? await statsRes.json() as IUserStats : null;

  return {
    notebooks: Array.isArray(notebooksData) ? notebooksData : (notebooksData?.notebooks ?? []),
    stats: statsData,
    unauthorized: false,
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [notebooks, setNotebooks] = useState<INotebook[]>([]);
  const [stats, setStats] = useState<IUserStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const [sessionNotebookId, setSessionNotebookId] = useState<string>('');
  const [notebookSearch, setNotebookSearch] = useState('');
  const [notebookSort, setNotebookSort] = useState<NotebookSort>('recent');

  // 미인증 시 로그인 리다이렉트
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoadingData(true);
      }
      const payload = await fetchDashboardPayload();

      if (payload.unauthorized) {
        router.push('/auth/login');
        return;
      }

      setNotebooks(payload.notebooks);
      setStats(payload.stats);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('대시보드 데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;

    void fetchDashboardPayload()
      .then((payload) => {
        if (cancelled) return;

        if (payload.unauthorized) {
          router.push('/auth/login');
          return;
        }

        setNotebooks(payload.notebooks);
        setStats(payload.stats);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
        showToast('대시보드 데이터를 불러오지 못했습니다.', 'error');
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingData(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status, router, showToast]);

  // ── 새 공책 생성 ──
  const handleCreateNotebook = async (data: { title: string; description: string; color: string }) => {
    try {
      setIsCreatingNotebook(true);
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await getResponseError(res, '공책 생성 실패'));
      setActiveModal(null);
      await loadDashboardData(); // 목록 갱신
      showToast('새 공책을 만들었습니다.', 'success');
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : '공책을 생성하지 못했습니다.', 'error');
    } finally {
      setIsCreatingNotebook(false);
    }
  };

  // ── 학습 시작 (SessionSetup → play 페이지로 이동) ──
  const handleSessionStart = (notebookId: string, count: number, mode: 'review' | 'all') => {
    setActiveModal(null);
    router.push(`/session/play?notebookId=${notebookId}&count=${count}&mode=${mode}`);
  };

  // notebooks를 SessionSetup 형식으로 변환
  const notebookOptions = notebooks.map((nb) => ({
    id: nb._id,
    title: nb.title,
    reviewCount: nb.reviewDueCount ?? 0,
    pageCount: nb.pageCount ?? 0,
  }));
  const chartNotebookOptions = useMemo<NotebookOption[]>(() => notebooks.map((nb) => ({
    id: nb._id,
    title: nb.title,
    color: nb.color,
  })), [notebooks]);

  const visibleNotebooks = useMemo(() => {
    const query = notebookSearch.trim().toLowerCase();

    return notebooks
      .filter((notebook) => {
        if (!query) return true;
        return `${notebook.title} ${notebook.description ?? ''}`.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        switch (notebookSort) {
          case 'title':
            return a.title.localeCompare(b.title, 'ko');
          case 'due':
            return (b.reviewDueCount ?? 0) - (a.reviewDueCount ?? 0);
          case 'recent':
          default:
            return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
      });
  }, [notebookSearch, notebookSort, notebooks]);

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
            안녕하세요, {session?.user?.name || '학습자'}님!
          </h1>
          <p className={styles.welcomeSubtitle}>
            {reviewDueCount > 0
              ? `오늘 복습할 카드가 ${reviewDueCount}개 준비되어 있습니다.`
              : '오늘 복습할 카드를 모두 완료했습니다!'}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          <Button
            variant="primary"
            onClick={() => {
              setSessionNotebookId('all');
              setActiveModal('session');
            }}
            disabled={notebooks.length === 0}
          >
            🎯 전체 복습 시작
          </Button>
          <Button variant="secondary" className={styles.createBtn} onClick={() => setActiveModal('newNotebook')}>
            ➕ 새 공책 만들기
          </Button>
        </div>
      </div>

      {/* ── 통계 그리드 ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            📚 총 공책
            <span className={styles.helpIcon} data-tooltip="생성한 학습 공책의 총 개수입니다.">?</span>
          </span>
          <span className={styles.statValue}>{stats?.totalNotebooks ?? notebooks.length}개</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            📑 총 학습 카드
            <span className={styles.helpIcon} data-tooltip="모든 공책에 들어있는 총 개념 카드의 수입니다.">?</span>
          </span>
          <span className={styles.statValue}>{stats?.totalPages ?? 0}장</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            🔄 복습 완료 카드
            <span className={styles.helpIcon} data-tooltip="복습을 최소 1회 이상 진행한 카드의 수입니다.">?</span>
          </span>
          <span className={styles.statValue}>{stats?.totalReviewed ?? 0}장</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>
            🔥 평균 난이도 가중치
            <span className={styles.helpIcon} data-tooltip="AGAIN/HARD 선택이 많을수록 올라가는 지식 난이도 지수입니다.">?</span>
          </span>
          <span className={styles.statValue}>
            {stats?.averageDifficulty ? `${stats.averageDifficulty.toFixed(2)}x` : '1.00x'}
          </span>
        </div>
      </div>

      {/* ── 망각 곡선 차트 ── */}
      {stats?.pages && stats.pages.length > 0 && (
        <section className={styles.chartSection}>
          <ForgettingCurveChart
            cards={stats.pages}
            mode="dashboard"
            notebookOptions={chartNotebookOptions}
          />
        </section>
      )}

      {/* ── 내 공책 목록 ── */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📓 내 공책 목록</h2>
          <Button 
            variant="secondary" 
            size="sm" 
            className={styles.createBtn}
            onClick={() => setActiveModal('newNotebook')}
          >
            ➕ 새 공책 만들기
          </Button>
        </div>
        <div className={styles.notebookToolbar}>
          <div className={styles.searchBox}>
            <label className={styles.controlLabel} htmlFor="notebook-search">공책 검색</label>
            <input
              id="notebook-search"
              className={styles.searchInput}
              value={notebookSearch}
              onChange={(event) => setNotebookSearch(event.target.value)}
              placeholder="공책 이름 또는 설명 검색"
            />
          </div>
          <div className={styles.sortBox}>
            <label className={styles.controlLabel} htmlFor="notebook-sort">정렬</label>
            <select
              id="notebook-sort"
              className={styles.select}
              value={notebookSort}
              onChange={(event) => setNotebookSort(event.target.value as NotebookSort)}
            >
              <option value="recent">기본순</option>
              <option value="title">이름순</option>
              <option value="due">복습 많은순</option>
            </select>
          </div>
        </div>
        <div className={styles.notebooksGrid}>
          {visibleNotebooks.length > 0 ? (
            visibleNotebooks.map((nb) => (
              <NotebookCard
                key={nb._id}
                id={nb._id}
                title={nb.title}
                description={nb.description}
                color={nb.color}
                reviewCount={nb.reviewDueCount}
                createdAt={nb.createdAt}
                lastStudiedAt={nb.lastStudiedAt}
                onStartSession={() => {
                  setSessionNotebookId(nb._id);
                  setActiveModal('session');
                }}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span style={{ fontSize: '3rem' }}>📭</span>
              <h3 className={styles.emptyTitle}>{notebooks.length === 0 ? '생성된 공책이 없습니다' : '검색 결과가 없습니다'}</h3>
              <p>{notebooks.length === 0 ? '기억하고 싶은 지식을 기록할 첫 번째 공책을 만들어 보세요.' : '검색어를 바꾸거나 정렬 조건을 조정해보세요.'}</p>
              {notebooks.length === 0 && (
                <Button variant="primary" onClick={() => setActiveModal('newNotebook')}>
                  첫 공책 만들기
                </Button>
              )}
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
          initialNotebookId={sessionNotebookId}
          onStart={handleSessionStart}
        />
      </Modal>
    </div>
    </>
  );
}
