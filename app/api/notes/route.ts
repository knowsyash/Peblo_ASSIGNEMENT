import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const tag = url.searchParams.get('tag');
    const sort = url.searchParams.get('sort') || 'updated';

    const whereClause: Record<string, unknown> = {
      userId: payload.userId,
      isArchived: false,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      whereClause.tags = {
        some: {
          tag: {
            name: tag,
          },
        },
      };
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        aiSummary: true,
      },
      orderBy: sort === 'created' ? { createdAt: 'desc' } : sort === 'title' ? { title: 'asc' } : { updatedAt: 'desc' },
    });

    // Transform NoteTag[] to Tag[]
    const formattedNotes = notes.map((note) => ({
      ...note,
      tags: note.tags.map((nt) => nt.tag),
    }));

    return NextResponse.json({ data: formattedNotes });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const title = body.title || 'Untitled';
    const content = body.content || '';
    const incomingTags: string[] = body.tags || [];

    const newNote = await prisma.note.create({
      data: {
        title,
        content,
        userId: payload.userId,
      },
    });

    if (incomingTags.length > 0) {
      for (const tagName of incomingTags) {
        let tag = await prisma.tag.findFirst({
          where: { name: tagName, userId: payload.userId },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName, userId: payload.userId },
          });
        }

        await prisma.noteTag.create({
          data: {
            noteId: newNote.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch the fully constructed note
    const createdNote = await prisma.note.findUnique({
      where: { id: newNote.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        aiSummary: true,
      },
    });

    const formattedNote = {
      ...createdNote,
      tags: createdNote?.tags.map((nt) => nt.tag) || [],
    };

    return NextResponse.json({ data: formattedNote }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
