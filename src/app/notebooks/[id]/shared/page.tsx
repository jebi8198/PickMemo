'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/Header';
import styles from './page.module.css';

interface PublicNotebook {
  _id: string;
  title: string;
  description?: string;
  color: string;
}

interface PublicPage {
  _id: string;
  topic: string;
  description: string;
  keywords: string[];
  reviewCount: number;
  intervalDays: number;
  difficultyWeight: number;
  createdAt: string;
}

export default function SharedNotebookPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [notebook, setNotebook] = useState<PublicNotebook | null>(null);
  const [pages, setPages] = useState<PublicPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isForking, setIsForking] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/notebooks/${id}/public`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
        const data = (await res.json()) as { notebook: PublicNotebook; pages: PublicPage[] };
        setNotebook(data.notebook);
        setPages(data.pages);
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [id]);

  const handleFork = async () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/notebooks/${id}/shared`);
      return;
    }
    try {
      setIsForking(true);
      const res = await fetch(`/api/notebooks/${id}/fork`, { method: 'POST' });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? '가져오기에 실패했습니다.');
      }
      const data = (await res.json()) as { notebookId: string; pageCount: number };
      router.push(`/notebooks/${data.notebookId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : '가져오기에 실패했습니다.');
    } finally {
      setIsForking(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner} />
            <p>공책을 불러오는 중...</p>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !notebook) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.notFoundWrapper}>
            <p>공개된 공책을 찾을 수 없습니다.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.colorBadge} style={{ backgroundColor: notebook.color }} />
          <div className={styles.titleInfo}>
            <h1 className={styles.title}>{notebook.title}</h1>
            {notebook.description && (
              <p className={styles.description}>{notebook.description}</p>
            )}
            <p className={styles.meta}>총 {pages.length}장</p>
          </div>
          <button
            className={styles.forkButton}
            onClick={handleFork}
            disabled={isForking}
          >
            {isForking ? '가져오는 중...' : '📥 내 공책으로 가져오기'}
          </button>
        </div>

        {pages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>이 공책에는 아직 카드가 없습니다.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {pages.map((page) => (
              <div key={page._id} className={styles.card}>
                <p className={styles.cardTopic}>{page.topic}</p>
                <p className={styles.cardDescription}>{page.description}</p>
                {page.keywords.length > 0 && (
                  <div className={styles.keywords}>
                    {page.keywords.map((kw, i) => (
                      <span key={i} className={styles.keyword}>{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
