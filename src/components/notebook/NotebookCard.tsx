'use client';
import React from 'react';
import Link from 'next/link';
import { Badge } from '../ui/Badge';
import styles from './NotebookCard.module.css';

interface NotebookCardProps {
  id: string;
  title: string;
  description?: string;
  color: string;
  reviewCount?: number;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  id,
  title,
  description,
  color,
  reviewCount = 0,
}) => {
  const displayColor = color === '#6366f1' ? '#a57a57' : color;

  return (
    <Link href={`/notebooks/${id}`} className={styles.cardWrapper}>
      <div className={styles.card} style={{ '--accent-color': displayColor } as React.CSSProperties}>
        <div className={styles.spine} />
        <div className={styles.topAccent} />
        <div className={styles.content}>
          <div className={styles.headerRow}>
            <span className={styles.colorDot} />
            {reviewCount > 0 && (
              <div className={styles.badgeWrapper}>
                <Badge variant="warning">{reviewCount}개 복습 예정</Badge>
              </div>
            )}
          </div>
          <div className={styles.labelSticker}>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
          </div>
        </div>
      </div>
    </Link>
  );
};
