import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import ReviewLog from '@/models/ReviewLog';
import { getErrorMessage } from '@/lib/api';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const userId = session.user.id;

    const totalNotebooks = await Notebook.countDocuments({ userId });
    const totalPages = await Page.countDocuments({ userId });
    const totalReviewed = await Page.countDocuments({ userId, reviewCount: { $gt: 0 } });
    
    const now = new Date();
    const reviewDueToday = await Page.countDocuments({ userId, nextReviewDate: { $lte: now } });

    const pages = await Page.find({ userId, reviewCount: { $gt: 0 } }).select('difficultyWeight');
    const averageDifficulty = pages.length > 0
      ? pages.reduce((acc, p) => acc + p.difficultyWeight, 0) / pages.length
      : 0;

    const allPages = await Page.find({ userId })
      .select('_id notebookId topic lastReviewedAt nextReviewDate intervalDays createdAt difficultyWeight reviewCount')
      .lean();
    const pageIds = allPages.map((page) => page._id);
    const reviewLogs = await ReviewLog.find({ userId, pageId: { $in: pageIds } })
      .sort({ reviewedAt: 1 })
      .select('_id pageId reviewedAt feedback previousIntervalDays nextIntervalDays previousDifficultyWeight nextDifficultyWeight previousReviewCount nextReviewCount nextReviewDate')
      .lean();
    const logsByPageId = new Map<string, Record<string, unknown>[]>();

    reviewLogs.forEach((log) => {
      const pageId = log.pageId?.toString();
      if (!pageId) return;

      const items = logsByPageId.get(pageId) ?? [];
      items.push({
        ...log,
        _id: log._id.toString(),
        pageId,
      });
      logsByPageId.set(pageId, items);
    });

    const notebookIds = Array.from(
      new Set(
        allPages
          .map((page) => page.notebookId?.toString())
          .filter((id): id is string => Boolean(id))
      )
    );
    const notebooks = await Notebook.find({ userId, _id: { $in: notebookIds } })
      .select('_id title')
      .lean();
    const notebookTitleMap = new Map(
      notebooks.map((notebook) => [notebook._id.toString(), notebook.title])
    );
    const chartPages = allPages.map((page) => {
      const notebookId = page.notebookId?.toString();
      return {
        ...page,
        _id: page._id.toString(),
        notebookId,
        notebookTitle: notebookId ? notebookTitleMap.get(notebookId) : undefined,
        reviewLogs: logsByPageId.get(page._id.toString()) ?? [],
      };
    });

    return NextResponse.json({
      totalNotebooks,
      totalPages,
      totalReviewed,
      reviewDueToday,
      averageDifficulty: Math.round(averageDifficulty * 100) / 100,
      pages: chartPages
    }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
