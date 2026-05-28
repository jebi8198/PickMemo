'use client';
import React from 'react';
import { Button } from '../ui/Button';
import Link from 'next/link';
import styles from './SessionComplete.module.css';

interface SessionCompleteProps {
  totalStudied: number;
  newCards: number;
  reviewCards: number;
  notebookId: string;
}

export const SessionComplete: React.FC<SessionCompleteProps> = ({ totalStudied, newCards, reviewCards, notebookId }) => {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>🎉</div>
      <h1 className={styles.title}>학습 완료!</h1>
      <p className={styles.subtitle}>오늘의 학습 목표를 달성했습니다.</p>
      
      <div className={styles.stats}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>총 학습량</span>
          <span className={styles.statValue}>{totalStudied}</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>새 카드</span>
          <span className={styles.statValue}>{newCards}</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>복습 카드</span>
          <span className={styles.statValue}>{reviewCards}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href={`/notebooks/${notebookId}`}>
          <Button variant="secondary" size="lg">공책으로 돌아가기</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="primary" size="lg">대시보드</Button>
        </Link>
      </div>
    </div>
  );
};