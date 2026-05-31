import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import ReviewLog from '@/models/ReviewLog';
import { getErrorMessage } from '@/lib/api';
import { validatePagePayloads } from '@/lib/validation';

interface PagePayload {
  topic?: string;
  description?: string;
  keywords?: string[];
  imageUrl?: string;
}

type PagesPostBody = PagePayload | PagePayload[] | {
  pages?: PagePayload[];
  cards?: PagePayload[];
  items?: PagePayload[];
};

function isPageContainer(body: PagesPostBody): body is { pages?: PagePayload[]; cards?: PagePayload[]; items?: PagePayload[] } {
  return !Array.isArray(body) && ('pages' in body || 'cards' in body || 'items' in body);
}

function getPayloads(body: PagesPostBody): PagePayload[] {
  if (Array.isArray(body)) return body;
  if (isPageContainer(body)) {
    if (Array.isArray(body.pages)) return body.pages;
    if (Array.isArray(body.cards)) return body.cards;
    if (Array.isArray(body.items)) return body.items;
    return [];
  }
  return [body];
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    await dbConnect();
    
    const notebook = await Notebook.findOne({ _id: id, userId });
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const pages = await Page.find({ notebookId: id, userId }).lean();
    const pageIds = pages.map((page) => page._id);
    const reviewLogs = await ReviewLog.find({ userId, notebookId: id, pageId: { $in: pageIds } })
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
    const pagesWithLogs = pages.map((page) => ({
      ...page,
      _id: page._id.toString(),
      notebookId: page.notebookId?.toString(),
      userId: page.userId?.toString(),
      reviewLogs: logsByPageId.get(page._id.toString()) ?? [],
    }));

    return NextResponse.json({ pages: pagesWithLogs }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    await dbConnect();
    
    const notebook = await Notebook.findOne({ _id: id, userId });
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const body = (await req.json()) as PagesPostBody;
    const validation = validatePagePayloads(getPayloads(body));

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const documents = validation.value.map((page) => ({
      notebookId: id,
      userId,
      topic: page.topic,
      description: page.description,
      keywords: page.keywords,
      imageUrl: page.imageUrl,
    }));

    if (documents.length === 1) {
      const page = await Page.create(documents[0]);
      await Notebook.findByIdAndUpdate(id, { $inc: { pageCount: 1 } });
      return NextResponse.json({ page }, { status: 201 });
    }

    const pages = await Page.insertMany(documents);
    await Notebook.findByIdAndUpdate(id, { $inc: { pageCount: pages.length } });

    return NextResponse.json({ pages }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
