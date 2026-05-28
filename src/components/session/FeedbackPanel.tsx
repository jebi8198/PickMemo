'use client';

import React from 'react';
import { FeedbackType } from '@/types';
import styles from './FeedbackPanel.module.css';

interface FeedbackPanelProps {
  onFeedback: (feedback: FeedbackType) => void;
  onHoverFeedback?: (feedback: FeedbackType | null) => void;
  disabled?: boolean;
  currentIntervalDays?: number;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  onFeedback,
  onHoverFeedback,
  disabled = false,
  currentIntervalDays = 0,
}) => {
  // 각 피드백 버튼에 따른 다음 주기 일수 정보 텍스트 (사용자 안내용)
  const getNextIntervalText = (type: FeedbackType) => {
    const I = currentIntervalDays;
    switch (type) {
      case 'AGAIN':
        return '즉시 복습 (0.5일)';
      case 'HARD':
        return `${Math.max(1, Math.round(I * 1.2))}일 후`;
      case 'GOOD':
        return I === 0 ? '1일 후' : `${Math.max(1, Math.round(I * 2.0))}일 후`;
      case 'EASY':
        return I === 0 ? '3일 후' : `${Math.max(1, Math.round(I * 2.5))}일 후`;
      default:
        return '';
    }
  };

  const handleMouseEnter = (type: FeedbackType) => {
    if (onHoverFeedback && !disabled) {
      onHoverFeedback(type);
    }
  };

  const handleMouseLeave = () => {
    if (onHoverFeedback && !disabled) {
      onHoverFeedback(null);
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.prompt}>카드를 얼마나 잘 떠올렸는지 피드백 버튼을 눌러주세요.</p>
      <div className={styles.panel}>
        <button
          className={`${styles.btn} ${styles.again}`}
          onClick={() => !disabled && onFeedback('AGAIN')}
          onMouseEnter={() => handleMouseEnter('AGAIN')}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
        >
          <span className={styles.label}>🔄 AGAIN</span>
          <span className={styles.desc}>{getNextIntervalText('AGAIN')}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.hard}`}
          onClick={() => !disabled && onFeedback('HARD')}
          onMouseEnter={() => handleMouseEnter('HARD')}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
        >
          <span className={styles.label}>😓 HARD</span>
          <span className={styles.desc}>{getNextIntervalText('HARD')}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.good}`}
          onClick={() => !disabled && onFeedback('GOOD')}
          onMouseEnter={() => handleMouseEnter('GOOD')}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
        >
          <span className={styles.label}>👍 GOOD</span>
          <span className={styles.desc}>{getNextIntervalText('GOOD')}</span>
        </button>

        <button
          className={`${styles.btn} ${styles.easy}`}
          onClick={() => !disabled && onFeedback('EASY')}
          onMouseEnter={() => handleMouseEnter('EASY')}
          onMouseLeave={handleMouseLeave}
          disabled={disabled}
        >
          <span className={styles.label}>🚀 EASY</span>
          <span className={styles.desc}>{getNextIntervalText('EASY')}</span>
        </button>
      </div>
    </div>
  );
};
