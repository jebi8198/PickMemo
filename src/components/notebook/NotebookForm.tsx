'use client';
import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import styles from './NotebookForm.module.css';

export const COLOR_PRESETS = [
  { value: '#8b5e3c', label: '레더 브라운' },
  { value: '#c7925c', label: '라이트 탠' },
  { value: '#4a5240', label: '모스 그린' },
  { value: '#586b7c', label: '슬레이트 블루' },
  { value: '#7c6374', label: '빈티지 플럼' },
  { value: '#a26967', label: '테라코타 로즈' },
  { value: '#c4a46a', label: '골든 허니' },
  { value: '#5c6b68', label: '세이지 그린' },
  { value: '#6e5d53', label: '타우프 그레이' },
  { value: '#4b3c31', label: '에스프레소' },
];

interface NotebookFormProps {
  initialData?: { title: string; description: string; color: string };
  onSubmit: (data: { title: string; description: string; color: string }) => void;
  isLoading?: boolean;
}

export const NotebookForm: React.FC<NotebookFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  
  // 만약 초기 색상이 지정되지 않았거나 프리셋 목록에 없다면 기본값 '#8b5e3c' 적용
  const initialColor = initialData?.color || '#8b5e3c';
  const matchedPreset = COLOR_PRESETS.some(preset => preset.value === initialColor);
  const [color, setColor] = useState(matchedPreset ? initialColor : '#8b5e3c');

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
        <label className={styles.label}>공책 색상 선택</label>
        <div className={styles.colorGrid}>
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={`${styles.colorChip} ${color === preset.value ? styles.activeChip : ''}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => setColor(preset.value)}
              title={preset.label}
            />
          ))}
        </div>
      </div>
      <Button type="submit" loading={isLoading} className={styles.submitBtn}>
        {initialData ? '수정하기' : '생성하기'}
      </Button>
    </form>
  );
};