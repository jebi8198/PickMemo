import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Notebook from '@/models/Notebook';
import Page from '@/models/Page';
import { getErrorMessage } from '@/lib/api';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    // 공개된 공책인지 확인
    const source = await Notebook.findOne({ _id: id, isPublic: true }).lean();
    if (!source) {
      return NextResponse.json({ error: 'Notebook not found or not public' }, { status: 404 });
    }

    // 자기 자신의 공책은 fork 불가
    if (source.userId.toString() === session.user.id) {
      return NextResponse.json({ error: 'Cannot fork your own notebook' }, { status: 400 });
    }

    const userId = session.user.id;

    // 새 공책 생성 (원본 제목에 "(공유됨)" 접미사)
    const newNotebook = await Notebook.create({
      userId,
      title: `${source.title} (공유됨)`,
      description: source.description,
      color: source.color,
      isPublic: false,
    });

    // 원본 카드들 복사 (복습 기록 초기화)
    const sourcePages = await Page.find({ notebookId: id })
      .select('topic description keywords imageUrl')
      .lean();

    const now = new Date();
    const newPages = sourcePages.map((page) => ({
      notebookId: newNotebook._id,
      userId,
      topic: page.topic,
      description: page.description,
      keywords: page.keywords ?? [],
      imageUrl: page.imageUrl,
      difficultyWeight: 1.0,
      reviewCount: 0,
      nextReviewDate: now,
      intervalDays: 0,
    }));

    if (newPages.length > 0) {
      await Page.insertMany(newPages);
    }

    return NextResponse.json(
      { notebookId: newNotebook._id.toString(), pageCount: newPages.length },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
