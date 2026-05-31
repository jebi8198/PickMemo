import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Page from '@/models/Page';
import ReviewLog from '@/models/ReviewLog';
import { calculateNextReview } from '@/lib/review-algorithm';
import { getErrorMessage } from '@/lib/api';
import { validateFeedbackInput } from '@/lib/validation';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const validation = validateFeedbackInput(await req.json());
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const feedback = validation.value;

    const page = await Page.findOne({ _id: id, userId: session.user.id });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const reviewedAt = new Date();
    const previousIntervalDays = page.intervalDays;
    const previousDifficultyWeight = page.difficultyWeight;
    const previousReviewCount = page.reviewCount;

    const { nextReviewDate, intervalDays, difficultyWeight, reviewCount } = calculateNextReview(
      feedback,
      previousIntervalDays,
      previousDifficultyWeight,
      previousReviewCount,
      reviewedAt
    );

    page.nextReviewDate = nextReviewDate;
    page.intervalDays = intervalDays;
    page.difficultyWeight = difficultyWeight;
    page.reviewCount = reviewCount;
    page.lastReviewedAt = reviewedAt;

    await page.save();
    await ReviewLog.create({
      pageId: page._id,
      notebookId: page.notebookId,
      userId: page.userId,
      reviewedAt,
      feedback,
      previousIntervalDays,
      nextIntervalDays: intervalDays,
      previousDifficultyWeight,
      nextDifficultyWeight: difficultyWeight,
      previousReviewCount,
      nextReviewCount: reviewCount,
      nextReviewDate,
    });

    return NextResponse.json({ page }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
