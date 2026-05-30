'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDisplayDate } from '@/lib/date';
import styles from './NotebookCard.module.css';

interface NotebookCardProps {
  id: string;
  title: string;
  description?: string;
  color: string;
  reviewCount?: number;
  createdAt?: string | Date;
  lastStudiedAt?: string | Date | null;
  onStartSession?: () => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  id,
  title,
  description,
  color,
  reviewCount = 0,
  createdAt,
  lastStudiedAt,
  onStartSession,
}) => {
  const router = useRouter();
  const displayColor = color === '#6366f1' ? '#8b5e3c' : color;

  const handleCardClick = () => {
    router.push(`/notebooks/${id}`);
  };

  return (
    <div 
      className={styles.cardWrapper} 
      onClick={handleCardClick}
      style={{ '--accent-color': displayColor } as React.CSSProperties}
    >
      <div className={styles.card3D}>
        <div className={styles.card}>
          <div className={styles.spine} />
          <div className={styles.topAccent} />
          
          <div className={styles.content}>
            <div className={styles.headerRow}>
              <span className={styles.colorDot} />
              {reviewCount > 0 && (
                <div className={styles.badgeWrapper}>
                  <Badge variant="warning">{reviewCount}개 복습</Badge>
                </div>
              )}
            </div>
            
            <div className={styles.labelSticker}>
              <h3 className={styles.title}>{title}</h3>
              {description && <p className={styles.description}>{description}</p>}
            </div>

            <div className={styles.actionRow}>
              <dl className={styles.dateList}>
                <div>
                  <dt>생성일</dt>
                  <dd>{formatDisplayDate(createdAt)}</dd>
                </div>
                <div>
                  <dt>마지막 학습</dt>
                  <dd>{formatDisplayDate(lastStudiedAt)}</dd>
                </div>
              </dl>
              <Button
                variant="primary"
                size="sm"
                className={styles.studyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onStartSession?.();
                }}
              >
                🎯 학습하기
              </Button>
            </div>
          </div>
        </div>
        <div className={styles.shadow} />
      </div>
    </div>
  );
};
