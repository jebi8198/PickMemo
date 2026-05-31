import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await dbConnect();

    const notebook = await Notebook.findOne({ _id: id, isPublic: true }).lean();
    if (!notebook) {
      return NextResponse.json({ error: 'Notebook not found' }, { status: 404 });
    }

    const pages = await Page.find({ notebookId: id })
      .select('_id topic description keywords reviewCount intervalDays difficultyWeight createdAt')
      .lean();

    return NextResponse.json({ notebook, pages }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
