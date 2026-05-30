import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';
import { validateNotebookInput } from '@/lib/validation';

type LeanNotebook = {
  _id: unknown;
  userId: unknown;
  title: string;
  description?: string;
  color: string;
  isPublic: boolean;
  pageCount: number;
  reviewDueCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const userId = session.user.id;
    const notebooks = await Notebook.find({ userId }).lean();
    
    const now = new Date();
    const notebooksWithDue = await Promise.all(
      (notebooks as LeanNotebook[]).map(async (notebook) => {
        const [pageCount, reviewDueCount, lastReviewedPage] = await Promise.all([
          Page.countDocuments({
            notebookId: notebook._id,
            userId,
          }),
          Page.countDocuments({
            notebookId: notebook._id,
            userId,
            nextReviewDate: { $lte: now },
          }),
          Page.findOne({
            notebookId: notebook._id,
            userId,
            lastReviewedAt: { $exists: true },
          })
            .sort({ lastReviewedAt: -1 })
            .select('lastReviewedAt')
            .lean(),
        ]);
        return { ...notebook, pageCount, reviewDueCount, lastStudiedAt: lastReviewedPage?.lastReviewedAt };
      })
    );

    return NextResponse.json({ notebooks: notebooksWithDue }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const validation = validateNotebookInput(await req.json());

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { title, description, color } = validation.value;
    const notebook = await Notebook.create({
      userId: session.user.id,
      title,
      description,
      color,
    });

    return NextResponse.json({ notebook }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
