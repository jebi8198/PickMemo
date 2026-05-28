'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotebookForm } from '@/components/notebook/NotebookForm';

interface NotebookFormData {
  title: string;
  description: string;
  color: string;
}

export default function NewNotebookPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: NotebookFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('공책을 생성하지 못했습니다.');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create notebook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '2rem', color: '#282421', marginBottom: '2rem', textAlign: 'center' }}>
        새 공책 만들기
      </h1>
      <NotebookForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
