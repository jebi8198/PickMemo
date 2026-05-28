'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { StudyCard } from '@/components/session/StudyCard';
import { FeedbackPanel } from '@/components/session/FeedbackPanel';
import { SessionComplete } from '@/components/session/SessionComplete';
import FeedbackSimulation from '@/components/session/FeedbackSimulation';
import { Button } from '@/components/ui/Button';
import BrandLogo from '@/components/ui/BrandLogo';
import { FeedbackType, IPage } from '@/types';
import styles from './page.module.css';

function SessionPlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notebookId = searchParams.get('notebookId') || '';
  const countParam = searchParams.get('count') || '10';
  const count = parseInt(countParam, 10);

  const [cards, setCards] = useState<IPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [hoveredFeedback, setHoveredFeedback] = useState<FeedbackType | null>(null);

  // 피드백 타입별 통계 누적
  const [stats, setStats] = useState({
    AGAIN: 0,
    HARD: 0,
    GOOD: 0,
    EASY: 0,
  });

  // 1. 학습 세션 카드 목록 로드
  useEffect(() => {
    async function fetchSession() {
      if (!notebookId) {
        setLoadError('학습할 공책이 지정되지 않았습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError('');
        const res = await fetch('/api/sessions/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notebookId, count }),
        });

        if (!res.ok) {
          const errorData = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorData?.error || 'Failed to fetch session cards');
        }

        const data = await res.json();
        // API가 반환하는 세션 큐 (pages)를 세팅
        setCards(data.pages || []);
      } catch (err) {
        console.error('Failed to fetch session cards:', err);
        setLoadError(err instanceof Error ? err.message : '학습 카드를 불러오지 못했습니다.');
        setCards([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [notebookId, count]);

  const currentCard = cards[currentIndex];

  // 2. 피드백 제출
  const handleFeedback = async (feedback: FeedbackType) => {
    if (!currentCard || submittingFeedback) return;

    try {
      setSubmittingFeedback(true);
      
      // 통계 누적
      setStats(prev => ({
        ...prev,
        [feedback]: prev[feedback] + 1,
      }));

      // API 호출
      const res = await fetch(`/api/pages/${currentCard._id}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });

      if (!res.ok) {
        console.error('Failed to save feedback on server');
      }

      // 다음 카드로 전환 애니메이션 준비
      setHoveredFeedback(null);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
      } else {
        setIsComplete(true);
      }
    } catch (err) {
      console.error(err);
      // 오프라인 상태에서도 데모를 진행할 수 있게 로컬 상태 진행
      setHoveredFeedback(null);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsRevealed(false);
      } else {
        setIsComplete(true);
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleQuit = () => {
    if (confirm('학습을 종료하고 대시보드로 돌아가시겠습니까? 진행 사항은 중간 저장됩니다.')) {
      router.push('/dashboard');
    }
  };

  // 로딩 상태 UI
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <p>바스락 제비를 섞는 중...</p>
        </div>
      </div>
    );
  }

  // 데이터가 없을 때
  if (cards.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <p>{loadError || '학습할 카드가 없습니다. 공책에 카드를 추가해 보세요!'}</p>
          <Button variant="primary" onClick={() => router.push('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 완료 상태 UI
  if (isComplete) {
    const totalStudied = stats.AGAIN + stats.HARD + stats.GOOD + stats.EASY;
    return (
      <div className={styles.container}>
        <SessionComplete
          totalStudied={totalStudied}
          newCards={stats.GOOD + stats.EASY} // 간단 요약 맵핑
          reviewCards={stats.AGAIN + stats.HARD}
          notebookId={notebookId}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ── 학습 헤더 ── */}
      <header className={styles.header}>
        <Link href="/" className={styles.brandLink}>
          <BrandLogo size={30} />
          <span>PickMemo</span>
        </Link>
        <h1 className={styles.title}>복습 중</h1>
        <div className={styles.progressWrapper}>
          <div className={styles.progressBarBg}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${(currentIndex / cards.length) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {currentIndex + 1} / {cards.length}
          </span>
          <Button variant="danger" size="sm" onClick={handleQuit} className={styles.quitButton}>
            종료
          </Button>
        </div>
      </header>

      {/* ── 카드 영역 ── */}
      <main className={styles.cardArea}>
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={currentCard._id}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ type: 'spring', stiffness: 150, damping: 15 }}
              style={{ width: '100%' }}
            >
              <StudyCard
                topic={currentCard.topic}
                description={currentCard.description}
                keywords={currentCard.keywords || []}
                imageUrl={currentCard.imageUrl}
                isRevealed={isRevealed}
                onReveal={handleReveal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── 피드백 & 시뮬레이션 영역 ── */}
      <div className={styles.feedbackArea}>
        <AnimatePresence>
          {isRevealed && currentCard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              style={{ width: '100%' }}
            >
              <FeedbackPanel
                onFeedback={handleFeedback}
                disabled={submittingFeedback}
                currentIntervalDays={currentCard.intervalDays}
                onHoverFeedback={setHoveredFeedback}
              />
              <FeedbackSimulation
                currentIntervalDays={currentCard.intervalDays}
                lastReviewedAt={currentCard.lastReviewedAt}
                createdAt={currentCard.createdAt}
                hoveredFeedback={hoveredFeedback}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function SessionPlayPage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <p>로딩 중...</p>
        </div>
      </div>
    }>
      <SessionPlayContent />
    </Suspense>
  );
}
