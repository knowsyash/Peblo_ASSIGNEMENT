import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: payload.userId,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        aiSummary: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const formattedNote = {
      ...note,
      tags: note.tags.map((nt) => nt.tag),
    };

    return NextResponse.json({ data: formattedNote });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingNote = await prisma.note.findFirst({
      where: { id: params.id, userId: payload.userId },
      include: { tags: { include: { tag: true } }, aiSummary: true },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
    if (body.isPublic !== undefined) {
      updateData.isPublic = body.isPublic;
      if (body.isPublic === true && !existingNote.shareId) {
        updateData.shareId = nanoid(10);
      } else if (body.isPublic === false) {
        updateData.shareId = null;
      }
    }

    // Update note core properties
    if (Object.keys(updateData).length > 0) {
      await prisma.note.update({
        where: { id: params.id },
        data: updateData,
      });
    }

    // Handle tag updates if provided
    if (body.tags && Array.isArray(body.tags)) {
      const incomingTagNames: string[] = body.tags;
      const currentTags = existingNote.tags.map((nt) => nt.tag.name);

      const tagsToAdd = incomingTagNames.filter((name) => !currentTags.includes(name));
      const tagsToRemove = currentTags.filter((name) => !incomingTagNames.includes(name));

      // Remove removed tags
      if (tagsToRemove.length > 0) {
        for (const tagName of tagsToRemove) {
          const tag = await prisma.tag.findFirst({ where: { name: tagName, userId: payload.userId } });
          if (tag) {
            await prisma.noteTag.deleteMany({
              where: {
                noteId: params.id,
                tagId: tag.id,
              },
            });
          }
        }
      }

      // Add new tags
      if (tagsToAdd.length > 0) {
        for (const tagName of tagsToAdd) {
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
              noteId: params.id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // Fetch updated note
    const updatedNote = await prisma.note.findUnique({
      where: { id: params.id },
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
      ...updatedNote,
      tags: updatedNote?.tags.map((nt) => nt.tag) || [],
    };

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const shareUrl = formattedNote.shareId ? `${protocol}://${host}/shared/${formattedNote.shareId}` : null;

    return NextResponse.json({ data: { ...formattedNote, shareUrl } });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingNote = await prisma.note.findFirst({
      where: { id: params.id, userId: payload.userId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
