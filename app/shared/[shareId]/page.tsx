import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { shareId: string } }): Promise<Metadata> {
  const note = await prisma.note.findFirst({
    where: { shareId: params.shareId, isPublic: true },
  });
  if (!note) return { title: 'Note Not Found - PebloNotes' };
  return { title: `${note.title || 'Untitled'} - PebloNotes` };
}

export default async function SharedNotePage({ params }: { params: { shareId: string } }) {
  const note = await prisma.note.findFirst({
    where: {
      shareId: params.shareId,
      isPublic: true,
      isArchived: false,
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
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">This note is not available</h1>
          <p className="text-zinc-500">The link might be broken, or the owner may have stopped sharing it.</p>
        </div>
      </div>
    );
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const getRelativeTime = (dateString: Date) => {
    const diff = new Date(dateString).getTime() - new Date().getTime();
    const diffMins = Math.round(diff / 60000);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diffMins / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diffHours / 24), 'day');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <h1 className="text-5xl font-bold text-zinc-100 leading-tight">
            {note.title || 'Untitled Note'}
          </h1>
          
          <div className="flex flex-wrap items-center gap-2">
            {note.tags.map(nt => (
              <span key={nt.tag.name} className="flex items-center text-xs px-3 py-1 bg-zinc-900 rounded-md text-zinc-400 border border-zinc-800">
                {nt.tag.name}
              </span>
            ))}
          </div>
          <div className="text-sm text-zinc-600">
            Last updated {getRelativeTime(note.updatedAt)}
          </div>
        </header>

        <main className="text-zinc-300 whitespace-pre-wrap font-mono text-base leading-relaxed">
          {note.content || 'No content.'}
        </main>

        {note.aiSummary && (
          <div className="mt-12 bg-zinc-900/50 rounded-xl border border-indigo-500/20 p-8 space-y-6">
            <div className="flex items-center space-x-2 text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-lg font-semibold">AI Summary</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-zinc-300 leading-relaxed">{note.aiSummary.summary}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Action Items</h3>
                <ol className="list-decimal list-inside text-zinc-300 space-y-2">
                  {note.aiSummary.actionItems.map((item, idx) => (
                    <li key={idx} className="pl-1">{item}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}

        <footer className="pt-12 border-t border-zinc-900 flex items-center justify-between">
          <a href="/" className="text-sm text-zinc-600 hover:text-indigo-400 transition-colors flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">P</span>
            </div>
            <span>Created with PebloNotes</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
