import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';

interface BulkDeleteBody {
  pageIds?: unknown;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json()) as BulkDeleteBody;
    const pageIds = Array.isArray(body.pageIds)
      ? body.pageIds.filter((id): id is string => typeof id === 'string')
      : [];

    if (pageIds.length === 0) {
      return NextResponse.json({ error: 'pageIds is required' }, { status: 400 });
    }

    if (pageIds.length > 200) {
      return NextResponse.json({ error: 'You can delete up to 200 pages at once' }, { status: 400 });
    }

    if (pageIds.some((id) => !mongoose.isValidObjectId(id))) {
      return NextResponse.json({ error: 'Invalid page id' }, { status: 400 });
    }

    await dbConnect();

    const pages = await Page.find({ _id: { $in: pageIds }, userId })
      .select('_id notebookId')
      .lean();

    if (pages.length === 0) {
      return NextResponse.json({ deletedCount: 0, deletedIds: [] }, { status: 200 });
    }

    const ownedPageIds = pages.map((page) => page._id.toString());
    const deleteResult = await Page.deleteMany({ _id: { $in: ownedPageIds }, userId });

    const notebookDeleteCounts = new Map<string, number>();
    for (const page of pages) {
      const notebookId = page.notebookId.toString();
      notebookDeleteCounts.set(notebookId, (notebookDeleteCounts.get(notebookId) ?? 0) + 1);
    }

    await Promise.all(
      Array.from(notebookDeleteCounts.entries()).map(([notebookId, count]) =>
        Notebook.findOneAndUpdate(
          { _id: notebookId, userId },
          { $inc: { pageCount: -count } }
        )
      )
    );

    return NextResponse.json({
      deletedCount: deleteResult.deletedCount ?? ownedPageIds.length,
      deletedIds: ownedPageIds,
    }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
