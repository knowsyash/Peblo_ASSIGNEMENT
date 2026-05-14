import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const note = await prisma.note.findFirst({
      where: { id: params.id, userId: payload.userId },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (!note.content || note.content.trim().length < 20) {
      return NextResponse.json({ error: 'Note is too short to summarize' }, { status: 422 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Google API Key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `You are a helpful assistant that analyzes notes. Respond with valid JSON only.
Give me a summary, action items, and a title for this note:
"${note.content}"

Response format:
{
  "summary": "2–3 sentence summary",
  "action_items": ["item 1", "item 2"],
  "suggested_title": "Title"
}`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (apiError: unknown) {
      console.error('Gemini API Error:', apiError);
      return NextResponse.json({ error: 'AI service unavailable, try again shortly' }, { status: 503 });
    }

    const responseText = result.response.text();
    
    // Clean potential markdown blocks that Gemini sometimes adds even in JSON mode
    const cleanedText = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (e) {
      console.error("Failed to parse JSON:", cleanedText);
      return NextResponse.json({ error: 'AI returned invalid response' }, { status: 502 });
    }

    const summaryData = {
      summary: parsedResponse.summary || '',
      actionItems: Array.isArray(parsedResponse.action_items) ? parsedResponse.action_items : [],
      suggestedTitle: parsedResponse.suggested_title || '',
    };

    // Use transaction to ensure both operations succeed together
    const [aiSummary] = await prisma.$transaction([
      prisma.aISummary.upsert({
        where: { noteId: params.id },
        create: {
          noteId: params.id,
          ...summaryData,
        },
        update: {
          ...summaryData,
          generatedAt: new Date(),
        },
      }),
      prisma.note.update({
        where: { id: params.id },
        data: {
          aiCallCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ data: aiSummary });
  } catch (error: any) {
    console.error('AI GENERATION ERROR:', error);
    return NextResponse.json({
      error: 'AI service error',
      details: error.message
    }, { status: 503 });
  }
}
