import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { buildSessionQueue } from '@/lib/shuffle';
import { getErrorMessage } from '@/lib/api';
import type { IPage } from '@/types';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { notebookId, count } = await req.json();

    if (!notebookId || !count) {
      return NextResponse.json({ error: 'NotebookId and count are required' }, { status: 400 });
    }

    if (!mongoose.isValidObjectId(notebookId)) {
      return NextResponse.json({ error: 'Invalid notebookId' }, { status: 400 });
    }

    const limit = Number(count);
    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json({ error: 'Count must be a positive number' }, { status: 400 });
    }

    const notebook = await Notebook.findOne({ _id: notebookId, userId: session.user.id });
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const pages = await Page.find({ notebookId, userId: session.user.id }).lean();
    
    const now = new Date();
    const typedPages = pages as IPage[];
    const reviewDueCount = typedPages.filter((page) => new Date(page.nextReviewDate) <= now).length;
    
    const sessionPages = buildSessionQueue(typedPages, limit);

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
