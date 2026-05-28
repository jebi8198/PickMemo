'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageCard } from '@/components/page/PageCard';
import { PageForm, PageFormData } from '@/components/page/PageForm';
import { NotebookForm } from '@/components/notebook/NotebookForm';
import { SessionSetup } from '@/components/session/SessionSetup';
import { Header } from '@/components/layout/Header';
import styles from './page.module.css';

type PageStatus = 'new' | 'learning' | 'review' | 'graduated';
type ActiveModal = 'addPage' | 'editNotebook' | 'session' | null;

interface NotebookDetail {
  _id: string;
  title: string;
  description?: string;
  color: string;
  pageCount: number;
  reviewDueCount: number;
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

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // ── 페이지 추가 ──
  const handleCreatePage = async (data: PageFormData) => {
    if (!notebookId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('페이지를 생성하지 못했습니다.');
      const result = (await res.json()) as { page: PageItem };
      setPages((current) => [result.page, ...current]);
      setActiveModal(null);
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
      if (!res.ok) throw new Error('페이지를 일괄 생성하지 못했습니다.');
      const result = (await res.json()) as { pages: PageItem[] };
      setPages((current) => [...result.pages, ...current]);
      setActiveModal(null);
    } catch (error) {
      console.error('Failed to create pages:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 페이지 삭제 ──
  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm('이 페이지를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('페이지를 삭제하지 못했습니다.');
      setPages((current) => current.filter((page) => page._id !== pageId));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  // ── 공책 편집 ──
  const handleEditNotebook = async (data: { title: string; description: string; color: string }) => {
    if (!notebookId) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('공책을 수정하지 못했습니다.');
      const result = (await res.json()) as { notebook: NotebookDetail };
      setNotebook(result.notebook);
      setActiveModal(null);
    } catch (error) {
      console.error('Failed to update notebook:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 공책 삭제 ──
  const handleDeleteNotebook = async () => {
    if (!notebookId) return;
    if (!window.confirm(`'${notebook?.title}' 공책을 삭제하시겠습니까?\n이 공책의 모든 페이지도 함께 삭제됩니다.`)) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/notebooks/${notebookId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('공책을 삭제하지 못했습니다.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete notebook:', error);
      setIsDeleting(false);
    }
  };

  // ── 학습 시작 ──
  const handleSessionStart = (nbId: string, count: number, mode: 'review' | 'all') => {
    setActiveModal(null);
    router.push(`/session/play?notebookId=${nbId}&count=${count}&mode=${mode}`);
  };

  const notebookOption = notebook
    ? [{ id: notebook._id, title: notebook.title, reviewCount: notebook.reviewDueCount ?? 0, pageCount: pages.length }]
    : [];

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
        {/* ── 공책 헤더 ── */}
        <div className={styles.header}>
          <div className={styles.titleInfo}>
            <div className={styles.colorBadge} style={{ backgroundColor: notebook.color }} />
            <div>
              <h1 className={styles.title}>{notebook.title}</h1>
              {notebook.description && (
                <p className={styles.description}>{notebook.description}</p>
              )}
              <p className={styles.meta}>
                총 {pages.length}장 · 복습 대기 {notebook.reviewDueCount ?? 0}장
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => setActiveModal('editNotebook')}>
              ✏️ 편집
            </Button>
            <Button variant="danger" onClick={handleDeleteNotebook} loading={isDeleting}>
              🗑️ 삭제
            </Button>
            <Button variant="secondary" onClick={() => setActiveModal('addPage')}>
              ➕ 페이지 추가
            </Button>
            <Button variant="primary" onClick={() => setActiveModal('session')} disabled={pages.length === 0}>
              🎯 학습하기
            </Button>
          </div>
        </div>

        {/* ── 페이지 그리드 ── */}
        {pages.length === 0 ? (
          <div className={styles.emptyState}>
            <span style={{ fontSize: '3rem' }}>📄</span>
            <p>아직 페이지가 없습니다. 첫 번째 학습 카드를 추가해 보세요!</p>
            <Button variant="primary" onClick={() => setActiveModal('addPage')}>
              첫 페이지 추가하기
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {pages.map((page) => (
              <PageCard
                key={page._id}
                topic={page.topic}
                keywords={page.keywords}
                status={getPageStatus(page)}
                onDelete={() => handleDeletePage(page._id)}
              />
            ))}
          </div>
        )}

        {/* ── 새 페이지 추가 모달 ── */}
        <Modal
          isOpen={activeModal === 'addPage'}
          onClose={() => setActiveModal(null)}
          title="새 페이지 추가"
          size="lg"
        >
          <PageForm
            onSubmit={handleCreatePage}
            onSubmitMany={handleCreatePages}
            isLoading={isSubmitting}
          />
        </Modal>

        {/* ── 공책 편집 모달 ── */}
        <Modal
          isOpen={activeModal === 'editNotebook'}
          onClose={() => setActiveModal(null)}
          title="공책 편집"
        >
          <NotebookForm
            initialData={{
              title: notebook.title,
              description: notebook.description ?? '',
              color: notebook.color,
            }}
            onSubmit={handleEditNotebook}
            isLoading={isSubmitting}
          />
        </Modal>

        {/* ── 학습 시작 모달 ── */}
        <Modal
          isOpen={activeModal === 'session'}
          onClose={() => setActiveModal(null)}
          title="학습 설정"
          size="lg"
        >
          <SessionSetup
            notebooks={notebookOption}
            initialNotebookId={notebook._id}
            onStart={handleSessionStart}
          />
        </Modal>
      </div>
    </>
  );
}
