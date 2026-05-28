import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';

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
    const notebooks = await Notebook.find({ userId: session.user.id }).lean();
    
    const now = new Date();
    const notebooksWithDue = await Promise.all(
      (notebooks as LeanNotebook[]).map(async (notebook) => {
        const reviewDueCount = await Page.countDocuments({
          notebookId: notebook._id,
          nextReviewDate: { $lte: now },
        });
        return { ...notebook, reviewDueCount };
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
    const { title, description, color } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

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
