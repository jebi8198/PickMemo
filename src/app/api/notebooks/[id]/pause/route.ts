import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';

interface NotebookPauseBody {
  paused?: unknown;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await params;
    const body = (await req.json()) as NotebookPauseBody;
    if (typeof body.paused !== 'boolean') {
      return NextResponse.json({ error: 'paused must be a boolean' }, { status: 400 });
    }
    const paused = body.paused;

    await dbConnect();
    const now = new Date();

    const notebook = await Notebook.findOne({ _id: id, userId });
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    if (paused) {
      if (!notebook.isPaused) {
        notebook.isPaused = true;
        notebook.pausedAt = now;
        await notebook.save();
      }
    } else {
      // 재개: 노트북 정지 기간만큼, 개별 정지가 아닌 카드들의 복습일을 이월(동결 정책)
      const pausedDurationMs = notebook.pausedAt
        ? Math.max(0, now.getTime() - new Date(notebook.pausedAt).getTime())
        : 0;

      if (pausedDurationMs > 0) {
        const pages = await Page.find({ notebookId: id, userId, isPaused: { $ne: true } })
          .select('_id nextReviewDate')
          .lean();
        const ops = pages.map((page) => ({
          updateOne: {
            filter: { _id: page._id, userId },
            update: {
              $set: {
                nextReviewDate: new Date(new Date(page.nextReviewDate).getTime() + pausedDurationMs),
              },
            },
          },
        }));
        if (ops.length > 0) {
          await Page.bulkWrite(ops);
        }
      }

      notebook.isPaused = false;
      notebook.pausedAt = undefined;
      await notebook.save();
    }

    return NextResponse.json({ isPaused: notebook.isPaused }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
