'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageCard } from '@/components/page/PageCard';
import { PageForm, PageFormData } from '@/components/page/PageForm';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';
import styles from './page.module.css';

type PageStatus = 'new' | 'learning' | 'review' | 'graduated';

interface NotebookDetail {
  _id: string;
  title: string;
  description?: string;
  color: string;
}

interface PageItem {
  _id: string;
  topic: string;
  description: string;
  keywords: string[];
  reviewCount: number;
  nextReviewDate: string;
}

export default function NotebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = useMemo(() => {
    const id = params.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params.id]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!notebookId) return;

    async function loadNotebook() {
      try {
        setIsLoading(true);
        const [notebookRes, pagesRes] = await Promise.all([
          fetch(`/api/notebooks/${notebookId}`),
          fetch(`/api/notebooks/${notebookId}/pages`),
        ]);

        if (notebookRes.status === 401 || pagesRes.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (!notebookRes.ok || !pagesRes.ok) {
          throw new Error('공책 데이터를 불러오지 못했습니다.');
        }

        const notebookData = (await notebookRes.json()) as { notebook: NotebookDetail };
        const pagesData = (await pagesRes.json()) as { pages: PageItem[] };
        setNotebook(notebookData.notebook);
        setPages(pagesData.pages);
      } catch (error) {
        console.error('Failed to load notebook:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadNotebook();
  }, [notebookId, router]);

  const getPageStatus = (page: PageItem): PageStatus => {
    if (page.reviewCount === 0) return 'new';
    if (new Date(page.nextReviewDate) <= new Date()) return 'review';
    if (page.reviewCount >= 5) return 'graduated';
    return 'learning';
  };

  const handleCreatePage = async (data: PageFormData) => {
    if (!notebookId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('페이지를 생성하지 못했습니다.');
      }

      const result = (await res.json()) as { page: PageItem };
      setPages((current) => [result.page, ...current]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePages = async (items: PageFormData[]) => {
    if (!notebookId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: items }),
      });

      if (!res.ok) {
        throw new Error('페이지를 일괄 생성하지 못했습니다.');
      }

      const result = (await res.json()) as { pages: PageItem[] };
      setPages((current) => [...result.pages, ...current]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create pages:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeletePage = async (pageId: string) => {
    const confirmed = window.confirm('이 페이지를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('페이지를 삭제하지 못했습니다.');
      }
      setPages((current) => current.filter((page) => page._id !== pageId));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className={styles.container}>공책을 불러오는 중...</div>
      </>
    );
  }

  if (!notebook) {
    return (
      <>
        <Header />
        <div className={styles.container}>공책을 찾을 수 없습니다.</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <div className={styles.colorBadge} style={{ backgroundColor: notebook.color }} />
            <div>
              <h1 className={styles.title}>{notebook.title}</h1>
              <p className={styles.description}>{notebook.description}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href={`/session?notebookId=${notebook._id}`}>
              <Button variant="primary">학습하기</Button>
            </Link>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>새 페이지 추가</Button>
          </div>
        </div>

        <div className={styles.grid}>
          {pages.map(page => (
            <PageCard 
              key={page._id}
              topic={page.topic} 
              keywords={page.keywords} 
              status={getPageStatus(page)}
              onDelete={() => handleDeletePage(page._id)}
            />
          ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="새 페이지 추가">
          <PageForm onSubmit={handleCreatePage} onSubmitMany={handleCreatePages} isLoading={isSubmitting} />
        </Modal>
      </div>
    </>
  );
}
