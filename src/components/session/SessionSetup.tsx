'use client';
import React, { useState } from 'react';
import { Button } from '../ui/Button';
import styles from './SessionSetup.module.css';

interface SessionSetupProps {
  notebooks: { id: string; title: string; reviewCount: number }[];
  initialNotebookId?: string;
  onStart: (notebookId: string, limit: number) => void;
}

export const SessionSetup: React.FC<SessionSetupProps> = ({ notebooks, initialNotebookId = '', onStart }) => {
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(initialNotebookId);
  const [limit, setLimit] = useState<number>(20);

  const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>학습 설정</h2>
      
      <div className={styles.section}>
        <label className={styles.label}>학습할 공책 선택</label>
        <select 
          className={styles.select}
          value={selectedNotebookId} 
          onChange={(e) => setSelectedNotebookId(e.target.value)}
        >
          <option value="" disabled>공책을 선택하세요</option>
          {notebooks.map(nb => (
            <option key={nb.id} value={nb.id}>
              {nb.title} ({nb.reviewCount}개 복습 필요)
            </option>
          ))}
        </select>
      </div>

      <div className={styles.section}>
        <label className={styles.label}>학습량 설정 (최대 카드 수)</label>
        <div className={styles.limitOptions}>
          {[10, 20, 30, 50].map(val => (
            <button
              key={val}
              className={`${styles.limitBtn} ${limit === val ? styles.limitBtnActive : ''}`}
              onClick={() => setLimit(val)}
            >
              {val}개
            </button>
          ))}
        </div>
      </div>

      <div className={styles.preview}>
        {selectedNotebook ? (
          <p>최대 <strong>{Math.min(selectedNotebook.reviewCount, limit)}</strong>개의 카드를 학습합니다.</p>
        ) : (
          <p>공책을 선택해주세요.</p>
        )}
      </div>

      <Button 
        size="lg" 
        onClick={() => onStart(selectedNotebookId, limit)}
        disabled={!selectedNotebookId || !selectedNotebook || selectedNotebook.reviewCount === 0}
        className={styles.startBtn}
      >
        학습 시작
      </Button>
    </div>
  );
};
