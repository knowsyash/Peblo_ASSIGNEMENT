'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type TagStat = { name: string; count: number };
type WeeklyStat = { date: string; notesCreated: number; notesEdited: number };
type RecentNote = { id: string; title: string; updatedAt: string };

type DashboardData = {
  totalNotes: number;
  archivedNotes: number;
  recentNotes: RecentNote[];
  topTags: TagStat[];
  aiUsage: { totalCalls: number; notesWithSummary: number };
  weeklyActivity: WeeklyStat[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-8 w-48 bg-zinc-800 rounded mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
          <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
          <div className="h-32 bg-zinc-800/50 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-800/50 rounded-xl"></div>
          <div className="h-64 bg-zinc-800/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const { totalNotes, aiUsage, recentNotes, topTags, weeklyActivity } = data;

  const maxTagCount = Math.max(...topTags.map((t) => t.count), 1);
  const maxWeeklyValue = Math.max(
    ...weeklyActivity.map((w) => Math.max(w.notesCreated, w.notesEdited)),
    1
  );
  
  const hasWeeklyActivity = weeklyActivity.some((w) => w.notesCreated > 0 || w.notesEdited > 0);

  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500'];

  const getRelativeTime = (dateString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = new Date(dateString).getTime() - new Date().getTime();
    const diffMins = Math.round(diff / 60000);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diffMins / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diffHours / 24), 'day');
  };

  return (
    <div className="space-y-8 pb-12">
      <h1 className="text-3xl font-bold text-zinc-100">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-zinc-400 mb-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="font-medium text-sm uppercase tracking-wider">Total Notes</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-100">{totalNotes}</p>
        </div>
        
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-zinc-400 mb-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="font-medium text-sm uppercase tracking-wider">AI Calls</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-100">{aiUsage.totalCalls}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md">
          <div className="flex items-center space-x-3 text-zinc-400 mb-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="font-medium text-sm uppercase tracking-wider">Summarized Notes</h3>
          </div>
          <p className="text-4xl font-bold text-zinc-100">{aiUsage.notesWithSummary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Notes */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Recent Notes</h2>
          {recentNotes.length === 0 ? (
            <p className="text-zinc-500 text-sm">No notes found.</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  href="/notes" // Clicking will just take them to workspace, as Next.js lacks an easy way to pre-select without search params. We'll link to /notes for now.
                  className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-zinc-200 truncate pr-4">{note.title || 'Untitled'}</span>
                    <span className="text-xs text-zinc-500 whitespace-nowrap">{getRelativeTime(note.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top Tags */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Top Tags</h2>
          {topTags.length === 0 ? (
            <p className="text-zinc-500 text-sm">No tags found.</p>
          ) : (
            <div className="space-y-4 mt-6">
              {topTags.map((tag, idx) => (
                <div key={tag.name} className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-zinc-400 w-24 truncate">{tag.name}</span>
                  <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${Math.max((tag.count / maxTagCount) * 100, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-6 text-right">{tag.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Weekly Activity */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-6 backdrop-blur-md lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-200 mb-6">Weekly Activity</h2>
          
          {!hasWeeklyActivity ? (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg">
              <p className="text-zinc-500 text-sm">No activity this week</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-end justify-between h-48 px-2">
                {weeklyActivity.map((day) => (
                  <div key={day.date} className="flex flex-col items-center w-full relative group">
                    <div className="flex space-x-1 h-full items-end justify-center w-full px-1">
                      {/* Created Bar */}
                      <div className="w-1/3 max-w-[12px] bg-indigo-500/80 rounded-t-sm transition-all duration-700 ease-out relative"
                           style={{ height: `${Math.max((day.notesCreated / maxWeeklyValue) * 100, 2)}%` }}>
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-xs px-2 py-1 rounded text-zinc-300 pointer-events-none transition-opacity">
                          {day.notesCreated}
                        </div>
                      </div>
                      
                      {/* Edited Bar */}
                      <div className="w-1/3 max-w-[12px] bg-emerald-500/80 rounded-t-sm transition-all duration-700 ease-out relative"
                           style={{ height: `${Math.max((day.notesEdited / maxWeeklyValue) * 100, 2)}%` }}>
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-xs px-2 py-1 rounded text-zinc-300 pointer-events-none transition-opacity delay-75">
                          {day.notesEdited}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between px-2 pt-2 border-t border-zinc-800">
                {weeklyActivity.map((day) => (
                  <span key={day.date} className="text-xs text-zinc-500 w-full text-center">
                    {day.date}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center justify-center space-x-6 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-indigo-500/80 rounded-sm"></div>
                  <span className="text-xs text-zinc-400">Created</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500/80 rounded-sm"></div>
                  <span className="text-xs text-zinc-400">Edited</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
