import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { buildSessionQueue, fisherYatesShuffle } from '@/lib/shuffle';
import { getErrorMessage } from '@/lib/api';
import type { IPage, SessionQueueItem } from '@/types';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { notebookId, count, mode = 'review' } = await req.json();

    if (!count) {
      return NextResponse.json({ error: 'Count is required' }, { status: 400 });
    }

    const limit = Number(count);
    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json({ error: 'Count must be a positive number' }, { status: 400 });
    }

    const now = new Date();

    // 1. 전체 복습 (notebookId가 없거나 'all'인 경우)
    if (!notebookId || notebookId === 'all') {
      const allNotebooks = await Notebook.find({ userId: session.user.id });
      const combinedQueue: SessionQueueItem[] = [];
      let totalDueCount = 0;

      for (const nb of allNotebooks) {
        const nbPages = await Page.find({ notebookId: nb._id, userId: session.user.id }).lean();
        const typedNbPages = nbPages as unknown as IPage[];
        const duePages = typedNbPages.filter(p => new Date(p.nextReviewDate) <= now);
        totalDueCount += duePages.length;

        if (duePages.length > 0) {
          const shuffledDue = fisherYatesShuffle(duePages);
          
          // 이미 큐에 카드가 있다면, 새로운 노트북으로 넘어갈 때 Separator 추가
          if (combinedQueue.length > 0) {
            combinedQueue.push({
              _id: `separator-${nb._id}-${Date.now()}`,
              isSeparator: true,
              nextNotebookTitle: nb.title,
              topic: '노트북 변경 알림',
              description: `다음은 "${nb.title}" 공책의 카드 학습이 시작됩니다.`,
              keywords: [],
              reviewCount: 0,
              intervalDays: 0,
              difficultyWeight: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
          combinedQueue.push(...shuffledDue);
        }
      }

      // 지정한 개수만큼 자름
      const sessionPages = combinedQueue.slice(0, limit);

      // 만약 잘린 세션의 맨 마지막 카드가 하필 separator라면 의미가 없으므로 제거
      const lastSessionItem = sessionPages[sessionPages.length - 1];
      if (lastSessionItem && 'isSeparator' in lastSessionItem && lastSessionItem.isSeparator) {
        sessionPages.pop();
      }

      return NextResponse.json({
        pages: sessionPages,
        totalAvailable: totalDueCount,
        reviewDueCount: totalDueCount,
      }, { status: 200 });
    }

    // 2. 특정 노트북 복습
    if (!mongoose.isValidObjectId(notebookId)) {
      return NextResponse.json({ error: 'Invalid notebookId' }, { status: 400 });
    }

    const notebook = await Notebook.findOne({ _id: notebookId, userId: session.user.id });
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const pages = await Page.find({ notebookId, userId: session.user.id }).lean();
    const typedPages = pages as unknown as IPage[];
    const reviewDueCount = typedPages.filter((page) => new Date(page.nextReviewDate) <= now).length;

    const sessionPages = mode === 'all'
      ? fisherYatesShuffle(typedPages).slice(0, limit)
      : buildSessionQueue(typedPages, limit);

    const result = {
      pages: sessionPages,
      totalAvailable: pages.length,
      reviewDueCount,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
