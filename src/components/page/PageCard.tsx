'use client';
import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import styles from './PageCard.module.css';

interface PageCardProps {
  topic: string;
  keywords: string[];
  status: 'new' | 'learning' | 'review' | 'graduated';
  selected?: boolean;
  selectionVisible?: boolean;
  onSelectChange?: (selected: boolean, shiftKey: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  topic,
  keywords,
  status,
  selected = false,
  selectionVisible = false,
  onSelectChange,
  onEdit,
  onDelete,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'new': return <Badge variant="default">새 페이지</Badge>;
      case 'learning': return <Badge variant="warning">학습 중</Badge>;
      case 'review': return <Badge variant="danger">복습 필요</Badge>;
      case 'graduated': return <Badge variant="success">마스터</Badge>;
    }
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onSelectChange?.(!selected, event.shiftKey);
  };

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''} ${selectionVisible ? styles.selectionVisible : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelectChange?.(!selected, event.shiftKey);
        }
      }}
    >
      <div className={styles.header}>
        <label className={styles.selectControl} onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectChange?.(event.target.checked, event.nativeEvent instanceof MouseEvent ? event.nativeEvent.shiftKey : false)}
            aria-label={`${topic} 선택`}
          />
          <span className={styles.checkmark} />
        </label>
        <div className={styles.titleBlock}>
          <h4 className={styles.topic}>{topic}</h4>
          {getStatusBadge()}
        </div>
      </div>
      <div className={styles.keywords}>
        {keywords.map((kw, i) => (
          <span key={i} className={styles.keyword}>#{kw}</span>
        ))}
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}>편집</Button>
        <Button variant="danger" size="sm" onClick={(event) => {
          event.stopPropagation();
          onDelete?.();
        }}>삭제</Button>
      </div>
    </div>
  );
};
