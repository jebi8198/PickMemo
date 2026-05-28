'use client';
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './SessionSetup.module.css';

interface SessionSetupProps {
  notebooks: { id: string; title: string; reviewCount: number; pageCount?: number }[];
  initialNotebookId?: string;
  onStart: (notebookId: string, limit: number, mode: 'review' | 'all') => void;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({ notebooks, initialNotebookId = '', onStart }) => {
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(initialNotebookId);
  const [limit, setLimit] = useState<number>(20);
  const [mode, setMode] = useState<'review' | 'all'>('review');

  const isGlobalReview = !initialNotebookId || initialNotebookId === 'all';
  const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId);

  // 전체 복습 시 총 복습 카드 수 계산
  const totalGlobalReviewCount = notebooks.reduce((acc, n) => acc + n.reviewCount, 0);

  // 특정 공책 복습 시 노출할 카드 수
  const getDisplayCount = () => {
    if (isGlobalReview) {
      return Math.min(totalGlobalReviewCount, limit);
    }
    if (!selectedNotebook) return 0;
    
    if (mode === 'review') {
      return Math.min(selectedNotebook.reviewCount, limit);
    } else {
      return Math.min(selectedNotebook.pageCount ?? 0, limit);
    }
  };

  const getStartButtonDisabled = () => {
    if (isGlobalReview) {
      return totalGlobalReviewCount === 0;
    }
    if (!selectedNotebookId || !selectedNotebook) return true;
    
    if (mode === 'review') {
      return selectedNotebook.reviewCount === 0;
    } else {
      return (selectedNotebook.pageCount ?? 0) === 0;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {isGlobalReview ? '전체 공책 복습 설정' : '공책 학습 설정'}
      </h2>
      
      {isGlobalReview ? (
        <div className={styles.globalInfo}>
          <p className={styles.globalLabel}>모든 공책에서 복습이 필요한 카드를 모아 학습합니다.</p>
          <div className={styles.globalStats}>
            <span className={styles.statLabel}>📋 총 복습 대기 카드:</span>
            <span className={styles.statValue}>{totalGlobalReviewCount}장</span>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <label className={styles.label}>학습할 공책</label>
            <select 
              className={styles.select}
              value={selectedNotebookId} 
              onChange={(e) => setSelectedNotebookId(e.target.value)}
              disabled={!!initialNotebookId}
            >
              <option value="" disabled>공책을 선택하세요</option>
              {notebooks.map(nb => (
                <option key={nb.id} value={nb.id}>
                  {nb.title} (복습 {nb.reviewCount}개 / 전체 {nb.pageCount ?? 0}개)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <label className={styles.label}>학습 모드 선택</label>
            <div className={styles.tabContainer}>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'review' ? styles.tabBtnActive : ''}`}
                onClick={() => setMode('review')}
              >
                🔄 복습 예정 카드만 ({selectedNotebook?.reviewCount ?? 0}장)
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'all' ? styles.tabBtnActive : ''}`}
                onClick={() => setMode('all')}
              >
                📚 전체 카드 학습 ({selectedNotebook?.pageCount ?? 0}장)
              </button>
            </div>
          </div>
        </>
      )}

      <div className={styles.section}>
        <label className={styles.label}>학습량 설정 (최대 카드 수)</label>
        <div className={styles.limitOptions}>
          {[10, 20, 30, 50].map(val => (
            <button
              key={val}
              type="button"
              className={`${styles.limitBtn} ${limit === val ? styles.limitBtnActive : ''}`}
              onClick={() => setLimit(val)}
            >
              {val}개
            </button>
          ))}
        </div>
      </div>

      <div className={styles.preview}>
        <p>
          최대 <strong>{getDisplayCount()}</strong>개의 카드를 학습합니다.
          {!isGlobalReview && mode === 'review' && (selectedNotebook?.reviewCount ?? 0) === 0 && (
            <span className={styles.warningText}><br />⚠️ 복습할 카드가 없습니다. 전체 카드 학습을 선택해보세요!</span>
          )}
          {isGlobalReview && totalGlobalReviewCount === 0 && (
            <span className={styles.warningText}><br />⚠️ 현재 모든 공책에 복습할 카드가 없습니다!</span>
          )}
        </p>
      </div>

      <Button 
        size="lg" 
        onClick={() => onStart(isGlobalReview ? 'all' : selectedNotebookId, limit, isGlobalReview ? 'review' : mode)}
        disabled={getStartButtonDisabled()}
        className={styles.startBtn}
      >
        학습 시작
      </Button>
    </div>
  );
};

