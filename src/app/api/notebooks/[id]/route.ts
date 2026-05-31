import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import ReviewLog from '@/models/ReviewLog';
import { getErrorMessage } from '@/lib/api';
import { validateNotebookInput } from '@/lib/validation';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const notebook = await Notebook.findOne({ _id: id, userId: session.user.id }).lean();

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const now = new Date();
    const [pageCount, reviewDueCount, lastReviewedPage] = await Promise.all([
      Page.countDocuments({ notebookId: id, userId: session.user.id }),
      Page.countDocuments({ notebookId: id, userId: session.user.id, nextReviewDate: { $lte: now } }),
      Page.findOne({
        notebookId: id,
        userId: session.user.id,
        lastReviewedAt: { $exists: true },
      })
        .sort({ lastReviewedAt: -1 })
        .select('lastReviewedAt')
        .lean(),
    ]);

    return NextResponse.json({
      notebook: {
        ...notebook,
        pageCount,
        reviewDueCount,
        lastStudiedAt: lastReviewedPage?.lastReviewedAt,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const validation = validateNotebookInput(await req.json());

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description, color } = validation.value;

    const notebook = await Notebook.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { title, description, color },
      { new: true }
    );

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    return NextResponse.json({ notebook }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();
    const notebook = await Notebook.findOneAndDelete({ _id: id, userId: session.user.id });

    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    await Page.deleteMany({ notebookId: id, userId: session.user.id });
    await ReviewLog.deleteMany({ notebookId: id, userId: session.user.id });

    return NextResponse.json({ message: 'Notebook deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
