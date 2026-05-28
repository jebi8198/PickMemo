'use client';
import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './NotebookForm.module.css';

interface NotebookFormProps {
  initialData?: { title: string; description: string; color: string };
  onSubmit: (data: { title: string; description: string; color: string }) => void;
  isLoading?: boolean;
}

export const NotebookForm: React.FC<NotebookFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || '#8b5e3c');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, color });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input 
        label="공책 이름" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        required 
        placeholder="예: 자바스크립트 핵심 개념"
      />
      <div className={styles.field}>
        <label className={styles.label}>설명</label>
        <textarea 
          className={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이 공책에 대한 설명을 입력하세요"
          rows={4}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>공책 색상</label>
        <input 
          type="color" 
          value={color} 
          onChange={(e) => setColor(e.target.value)}
          className={styles.colorPicker}
        />
      </div>
      <Button type="submit" loading={isLoading} className={styles.submitBtn}>
        {initialData ? '수정하기' : '생성하기'}
      </Button>
    </form>
  );
};