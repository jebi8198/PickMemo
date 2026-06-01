import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';
import { validateObjectIdList } from '@/lib/validation';

interface BulkPauseBody {
  pageIds?: unknown;
  paused?: unknown;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json()) as BulkPauseBody;
    const validation = validateObjectIdList(body.pageIds, 'pageIds', 200);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    if (typeof body.paused !== 'boolean') {
      return NextResponse.json({ error: 'paused must be a boolean' }, { status: 400 });
    }
    const pageIds = validation.value;
    const paused = body.paused;

    await dbConnect();
    const now = new Date();

    if (paused) {
      // 일시정지: 아직 정지되지 않은 카드만 동결 시점 기록
      await Page.updateMany(
        { _id: { $in: pageIds }, userId, isPaused: { $ne: true } },
        { $set: { isPaused: true, pausedAt: now } }
      );
    } else {
      // 재개(동결 해제): 정지 기간만큼 nextReviewDate를 이월해 복습 폭탄 방지
      const pausedPages = await Page.find({ _id: { $in: pageIds }, userId, isPaused: true })
        .select('_id pausedAt nextReviewDate')
        .lean();

      const ops = pausedPages.map((page) => {
        const pausedDurationMs = page.pausedAt
          ? Math.max(0, now.getTime() - new Date(page.pausedAt).getTime())
          : 0;
        const shiftedNextReview = new Date(
          new Date(page.nextReviewDate).getTime() + pausedDurationMs
        );
        return {
          updateOne: {
            filter: { _id: page._id, userId },
            update: {
              $set: { isPaused: false, nextReviewDate: shiftedNextReview },
              $unset: { pausedAt: '' },
            },
          },
        };
      });

      if (ops.length > 0) {
        await Page.bulkWrite(ops);
      }
    }

    return NextResponse.json({ updatedIds: pageIds, paused }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
