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

    const allPages = await Page.find({ userId })
      .select('_id notebookId topic lastReviewedAt nextReviewDate intervalDays createdAt difficultyWeight reviewCount')
      .lean();

    // 노트북 id → 이름 매핑을 만들어 각 카드에 공책 이름 주입
    const notebooks = await Notebook.find({ userId }).select('_id title').lean();
    const notebookTitleMap = new Map(
      notebooks.map((nb) => [String(nb._id), nb.title])
    );

    const pagesWithNotebook = allPages.map((page) => ({
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
