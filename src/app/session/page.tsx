'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { SessionSetup } from '@/components/session/SessionSetup';
import styles from './session.module.css';

interface NotebookOption {
  id: string;
  title: string;
  reviewCount: number;
}

interface NotebookResponseItem {
  _id: string;
  title: string;
  reviewDueCount?: number;
  pageCount?: number;
}

function SessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialNotebookId = searchParams.get('notebookId') || '';
  const [notebooks, setNotebooks] = useState<NotebookOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadNotebooks() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/notebooks');

        if (res.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (!res.ok) {
          throw new Error('공책 목록을 불러오지 못했습니다.');
        }

        const data = (await res.json()) as { notebooks: NotebookResponseItem[] };
        setNotebooks(
          data.notebooks.map((notebook) => ({
            id: notebook._id,
            title: notebook.title,
            reviewCount: notebook.reviewDueCount ?? notebook.pageCount ?? 0,
          }))
        );
      } catch (error) {
        console.error('Failed to load session notebooks:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNotebooks();
  }, [router]);

  const handleStart = (notebookId: string, count: number) => {
    router.push(`/session/play?notebookId=${notebookId}&count=${count}`);
  };

  return (
    <>
      <Header />
      <div className={styles.main}>
        {isLoading ? (
          <div className={styles.container}>
            <div className={styles.loadingContainer}>공책을 불러오는 중...</div>
          </div>
        ) : (
          <div className={styles.container}>
            <SessionSetup notebooks={notebooks} initialNotebookId={initialNotebookId} onStart={handleStart} />
          </div>
        )}
      </div>
    </>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className={styles.main}>
          <div className={styles.container}>
            <div className={styles.loadingContainer}>공책을 불러오는 중...</div>
          </div>
        </div>
      </>
    }>
      <SessionContent />
    </Suspense>
  );
}
