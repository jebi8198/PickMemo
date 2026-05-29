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
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { getResponseError } from '@/lib/http';
import styles from './page.module.css';

type PageStatus = 'new' | 'learning' | 'review' | 'graduated';
type ActiveModal = 'addPage' | 'editNotebook' | 'session' | null;
type PageFilter = 'all' | PageStatus;
type PageSort = 'newest' | 'oldest' | 'dueSoon' | 'topic';

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
  createdAt?: string;
}

const pageSize = 24;

export default function NotebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
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
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [lastSelectedPageId, setLastSelectedPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PageFilter>('all');
  const [sortMode, setSortMode] = useState<PageSort>('newest');
  const [currentPage, setCurrentPage] = useState(1);

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
        showToast('공책 데이터를 불러오지 못했습니다.', 'error');
      } finally {
        setIsLoading(false);
      }
    }

    loadNotebook();
  }, [notebookId, router, showToast]);

  const getPageStatus = (page: PageItem): PageStatus => {
    if (page.reviewCount === 0) return 'new';
    if (new Date(page.nextReviewDate) <= new Date()) return 'review';
    if (page.reviewCount >= 5) return 'graduated';
    return 'learning';
  };

  const selectedCount = selectedPageIds.length;
  const selectedPages = useMemo(
    () => pages.filter((page) => selectedPageIds.includes(page._id)),
    [pages, selectedPageIds]
  );
  const visiblePages = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pages
      .filter((page) => {
        const statusMatches = statusFilter === 'all' || getPageStatus(page) === statusFilter;
        if (!statusMatches) return false;
        if (!normalizedQuery) return true;

        const searchableText = [
          page.topic,
          page.description,
          ...page.keywords,
        ].join(' ').toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((a, b) => {
        switch (sortMode) {
          case 'oldest':
            return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
          case 'dueSoon':
            return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
          case 'topic':
            return a.topic.localeCompare(b.topic, 'ko');
          case 'newest':
          default:
            return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        }
      });
  }, [pages, searchQuery, sortMode, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(visiblePages.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedPages = visiblePages.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const visiblePageIds = useMemo(() => new Set(visiblePages.map((page) => page._id)), [visiblePages]);
  const selectedVisibleCount = selectedPageIds.filter((id) => visiblePageIds.has(id)).length;
  const isAllVisibleSelected = visiblePages.length > 0 && selectedVisibleCount === visiblePages.length;

  const updateReviewDueAfterDelete = (deletedPages: PageItem[]) => {
    const deletedDueCount = deletedPages.filter((page) => new Date(page.nextReviewDate) <= new Date()).length;
    if (deletedDueCount === 0) return;

    setNotebook((current) => current
      ? { ...current, reviewDueCount: Math.max(0, (current.reviewDueCount ?? 0) - deletedDueCount) }
      : current
    );
  };

  const togglePageSelection = (pageId: string, selected: boolean, shiftKey = false) => {
    if (shiftKey && lastSelectedPageId) {
      const startIndex = visiblePages.findIndex((page) => page._id === lastSelectedPageId);
      const endIndex = visiblePages.findIndex((page) => page._id === pageId);

      if (startIndex !== -1 && endIndex !== -1) {
        const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangeIds = visiblePages.slice(from, to + 1).map((page) => page._id);

        setSelectedPageIds((current) => {
          if (selected) {
            return Array.from(new Set([...current, ...rangeIds]));
          }

          const rangeSet = new Set(rangeIds);
          return current.filter((id) => !rangeSet.has(id));
        });
        setLastSelectedPageId(pageId);
        return;
      }
    }

    setSelectedPageIds((current) => {
      if (selected) {
        return current.includes(pageId) ? current : [...current, pageId];
      }

      return current.filter((id) => id !== pageId);
    });
    setLastSelectedPageId(pageId);
  };

  const toggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedPageIds((current) => current.filter((id) => !visiblePageIds.has(id)));
    } else {
      setSelectedPageIds((current) => Array.from(new Set([...current, ...visiblePages.map((page) => page._id)])));
    }
    setLastSelectedPageId(null);
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
      if (!res.ok) throw new Error(await getResponseError(res, '페이지를 생성하지 못했습니다.'));
      const result = (await res.json()) as { page: PageItem };
      setPages((current) => [result.page, ...current]);
      setSelectedPageIds([]);
      setLastSelectedPageId(null);
      setActiveModal(null);
      showToast('페이지를 추가했습니다.', 'success');
    } catch (error) {
      console.error('Failed to create page:', error);
      showToast(error instanceof Error ? error.message : '페이지를 생성하지 못했습니다.', 'error');
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
      if (!res.ok) throw new Error(await getResponseError(res, '페이지를 일괄 생성하지 못했습니다.'));
      const result = (await res.json()) as { pages: PageItem[] };
      setPages((current) => [...result.pages, ...current]);
      setSelectedPageIds([]);
      setLastSelectedPageId(null);
      setActiveModal(null);
      showToast(`${result.pages.length}개 페이지를 추가했습니다.`, 'success');
    } catch (error) {
      console.error('Failed to create pages:', error);
      showToast(error instanceof Error ? error.message : '페이지를 일괄 생성하지 못했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 페이지 삭제 ──
  const handleDeletePage = async (pageId: string) => {
    const confirmed = await confirm({
      title: '페이지 삭제',
      message: '이 페이지를 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await getResponseError(res, '페이지를 삭제하지 못했습니다.'));
      const deletedPage = pages.find((page) => page._id === pageId);
      setPages((current) => current.filter((page) => page._id !== pageId));
      setSelectedPageIds((current) => current.filter((id) => id !== pageId));
      setLastSelectedPageId((current) => current === pageId ? null : current);
      if (deletedPage) updateReviewDueAfterDelete([deletedPage]);
      showToast('페이지를 삭제했습니다.', 'success');
    } catch (error) {
      console.error('Failed to delete page:', error);
      showToast(error instanceof Error ? error.message : '페이지를 삭제하지 못했습니다.', 'error');
    }
  };

  const handleDeleteSelectedPages = async () => {
    if (selectedPages.length === 0) return;
    const confirmed = await confirm({
      title: '선택 페이지 삭제',
      message: `선택한 페이지 ${selectedPages.length}개를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
    });
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const res = await fetch('/api/pages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageIds: selectedPages.map((page) => page._id) }),
      });

      if (!res.ok) throw new Error(await getResponseError(res, '선택한 페이지를 삭제하지 못했습니다.'));

      const result = (await res.json()) as { deletedIds?: string[] };
      const selectedIds = new Set(result.deletedIds ?? selectedPages.map((page) => page._id));
      const deletedPages = selectedPages.filter((page) => selectedIds.has(page._id));
      setPages((current) => current.filter((page) => !selectedIds.has(page._id)));
      setSelectedPageIds([]);
      setLastSelectedPageId(null);
      updateReviewDueAfterDelete(deletedPages);
      showToast(`${deletedPages.length}개 페이지를 삭제했습니다.`, 'success');
    } catch (error) {
      console.error('Failed to delete selected pages:', error);
      showToast(error instanceof Error ? error.message : '선택한 페이지를 삭제하지 못했습니다.', 'error');
    } finally {
      setIsDeleting(false);
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
      if (!res.ok) throw new Error(await getResponseError(res, '공책을 수정하지 못했습니다.'));
      const result = (await res.json()) as { notebook: NotebookDetail };
      setNotebook(result.notebook);
      setActiveModal(null);
      showToast('공책 정보를 수정했습니다.', 'success');
    } catch (error) {
      console.error('Failed to update notebook:', error);
      showToast(error instanceof Error ? error.message : '공책을 수정하지 못했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 공책 삭제 ──
  const handleDeleteNotebook = async () => {
    if (!notebookId) return;
    const confirmed = await confirm({
      title: '공책 삭제',
      message: `'${notebook?.title}' 공책을 삭제하시겠습니까?\n이 공책의 모든 페이지도 함께 삭제됩니다.`,
      confirmLabel: '공책 삭제',
      danger: true,
    });
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/notebooks/${notebookId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await getResponseError(res, '공책을 삭제하지 못했습니다.'));
      showToast('공책을 삭제했습니다.', 'success');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete notebook:', error);
      showToast(error instanceof Error ? error.message : '공책을 삭제하지 못했습니다.', 'error');
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
          <>
            <div className={styles.pageToolbar}>
              <div className={styles.searchBox}>
                <label className={styles.controlLabel} htmlFor="page-search">카드 검색</label>
                <input
                  id="page-search"
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="주제, 답변, 키워드 검색"
                />
              </div>
              <div className={styles.toolbarControl}>
                <label className={styles.controlLabel} htmlFor="status-filter">상태</label>
                <select
                  id="status-filter"
                  className={styles.select}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as PageFilter);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">전체</option>
                  <option value="new">새 페이지</option>
                  <option value="learning">학습 중</option>
                  <option value="review">복습 필요</option>
                  <option value="graduated">마스터</option>
                </select>
              </div>
              <div className={styles.toolbarControl}>
                <label className={styles.controlLabel} htmlFor="sort-mode">정렬</label>
                <select
                  id="sort-mode"
                  className={styles.select}
                  value={sortMode}
                  onChange={(event) => {
                    setSortMode(event.target.value as PageSort);
                    setCurrentPage(1);
                  }}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="dueSoon">복습일 빠른순</option>
                  <option value="topic">주제순</option>
                </select>
              </div>
            </div>

            <div className={styles.selectionToolbar}>
              <div className={styles.selectionInfo}>
                <strong>{selectedCount > 0 ? `${selectedCount}개 선택됨` : `${visiblePages.length}개 카드 표시 중`}</strong>
                <span>검색/필터 결과를 기준으로 선택, Shift 범위 선택, 일괄 삭제할 수 있습니다.</span>
              </div>
              <div className={styles.selectionActions}>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {isAllVisibleSelected ? '표시 항목 해제' : '표시 항목 선택'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDeleteSelectedPages}
                  disabled={selectedCount === 0}
                  loading={isDeleting && selectedCount > 0}
                >
                  선택 삭제
                </Button>
              </div>
            </div>
            {pagedPages.length > 0 ? (
              <div className={styles.grid}>
                {pagedPages.map((page) => (
                <PageCard
                  key={page._id}
                  topic={page.topic}
                  keywords={page.keywords}
                  status={getPageStatus(page)}
                  selected={selectedPageIds.includes(page._id)}
                  selectionVisible={selectedCount > 0}
                  onSelectChange={(selected, shiftKey) => togglePageSelection(page._id, selected, shiftKey)}
                  onDelete={() => handleDeletePage(page._id)}
                />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>검색 조건에 맞는 페이지가 없습니다.</p>
              </div>
            )}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                >
                  이전
                </Button>
                <span className={styles.pageIndicator}>{safeCurrentPage} / {totalPages}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                >
                  다음
                </Button>
              </div>
            )}
          </>
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
