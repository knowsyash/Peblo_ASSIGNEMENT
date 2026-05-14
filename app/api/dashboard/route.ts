import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = payload.userId;

    const totalNotes = await prisma.note.count({ where: { userId, isArchived: false } });
    const archivedNotes = await prisma.note.count({ where: { userId, isArchived: true } });

    const recentNotes = await prisma.note.findMany({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    });

    const userTags = await prisma.noteTag.findMany({
      where: { note: { userId, isArchived: false } },
      include: { tag: true },
    });

    const tagCount: Record<string, number> = {};
    for (const nt of userTags) {
      tagCount[nt.tag.name] = (tagCount[nt.tag.name] || 0) + 1;
    }
    const topTags = Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const aiAggregation = await prisma.note.aggregate({
      where: { userId },
      _sum: { aiCallCount: true },
    });
    const totalCalls = aiAggregation._sum.aiCallCount || 0;

    const notesWithSummary = await prisma.aISummary.count({
      where: { note: { userId } },
    });

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(today.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const weeklyNotes = await prisma.note.findMany({
      where: {
        userId,
        OR: [
          { createdAt: { gte: sevenDaysAgo } },
          { updatedAt: { gte: sevenDaysAgo } },
        ],
      },
      select: { createdAt: true, updatedAt: true },
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyActivity = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;

      const created = weeklyNotes.filter((n) => n.createdAt.getTime() >= dayStart && n.createdAt.getTime() < dayEnd).length;
      const edited = weeklyNotes.filter((n) => {
        const isUpdatedToday = n.updatedAt.getTime() >= dayStart && n.updatedAt.getTime() < dayEnd;
        const isCreatedToday = n.createdAt.getTime() >= dayStart && n.createdAt.getTime() < dayEnd;
        // Only count as edited if it wasn't created on the same day, AND if it was actually modified
        // Prisma sets updatedAt = createdAt on insert. We can assume if it's updated today but not created today, it's an edit.
        return isUpdatedToday && !isCreatedToday;
      }).length;

      return {
        date: days[d.getUTCDay()],
        notesCreated: created,
        notesEdited: edited,
      };
    });

    return NextResponse.json({
      data: {
        totalNotes,
        archivedNotes,
        recentNotes,
        topTags,
        aiUsage: {
          totalCalls,
          notesWithSummary,
        },
        weeklyActivity,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
