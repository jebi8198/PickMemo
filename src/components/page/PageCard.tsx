'use client';
import React from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import styles from './PageCard.module.css';

interface PageCardProps {
  topic: string;
  keywords: string[];
  status: 'new' | 'learning' | 'review' | 'graduated';
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PageCard: React.FC<PageCardProps> = ({ topic, keywords, status, onEdit, onDelete }) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'new': return <Badge variant="default">새 페이지</Badge>;
      case 'learning': return <Badge variant="warning">학습 중</Badge>;
      case 'review': return <Badge variant="danger">복습 필요</Badge>;
      case 'graduated': return <Badge variant="success">마스터</Badge>;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h4 className={styles.topic}>{topic}</h4>
        {getStatusBadge()}
      </div>
      <div className={styles.keywords}>
        {keywords.map((kw, i) => (
          <span key={i} className={styles.keyword}>#{kw}</span>
        ))}
      </div>
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onEdit}>편집</Button>
        <Button variant="danger" size="sm" onClick={onDelete}>삭제</Button>
      </div>
    </div>
  );
};
