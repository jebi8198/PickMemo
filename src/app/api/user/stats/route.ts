import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
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

    // 일시정지된 카드는 망각 곡선에서 제외
    const allPages = await Page.find({ userId, isPaused: { $ne: true } })
      .select('_id notebookId topic lastReviewedAt nextReviewDate intervalDays createdAt difficultyWeight reviewCount')
      .lean();

    // 노트북 id → 이름 매핑 (일시정지된 노트북은 제외해 해당 카드도 그래프에서 빠짐)
    const notebooks = await Notebook.find({ userId, isPaused: { $ne: true } }).select('_id title').lean();
    const notebookTitleMap = new Map(
      notebooks.map((nb) => [String(nb._id), nb.title])
    );

    const pagesWithNotebook = allPages
      .filter((page) => notebookTitleMap.has(String(page.notebookId)))
      .map((page) => ({
        ...page,
        notebookTitle: notebookTitleMap.get(String(page.notebookId)) ?? '이름 없는 공책',
      }));

    return NextResponse.json({
      totalNotebooks,
      totalPages,
      totalReviewed,
      reviewDueToday,
      averageDifficulty: Math.round(averageDifficulty * 100) / 100,
      pages: pagesWithNotebook
    }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
