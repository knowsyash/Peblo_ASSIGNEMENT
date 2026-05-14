'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Note, AISummary } from '@/lib/types';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for the active note being edited
  const [activeNoteData, setActiveNoteData] = useState<{ title: string; content: string; tags: string[]; aiSummary?: AISummary | null; isPublic: boolean; shareId: string | null; shareUrl?: string | null } | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(false);

  const fetchNotes = useCallback(async (search: string, tag: string | null, sort: string) => {
    try {
      const url = new URL('/api/notes', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (tag) url.searchParams.set('tag', tag);
      if (sort) url.searchParams.set('sort', sort);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch notes');
      
      setNotes(json.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchNotes('', null, 'updated');
    return () => { mountedRef.current = false; };
  }, [fetchNotes]);

  // Handle Search Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsLoading(true);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchNotes(value, activeTag, sortBy);
    }, 300);
  };

  // Handle Tag Filter
  const toggleTagFilter = (tag: string) => {
    const newTag = activeTag === tag ? null : tag;
    setActiveTag(newTag);
    setSearchQuery('');
    setIsLoading(true);
    fetchNotes('', newTag, sortBy);
  };

  const handleCreateNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: '', tags: [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create note');
      
      setNotes(prev => [json.data, ...prev]);
      setActiveNoteId(json.data.id);
      setActiveNoteData({ title: json.data.title, content: json.data.content, tags: [], aiSummary: null, isPublic: false, shareId: null });
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleSelectNote = (note: Note) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setActiveNoteId(note.id);
    setActiveNoteData({
      title: note.title,
      content: note.content,
      tags: note.tags.map(t => t.name),
      aiSummary: note.aiSummary,
      isPublic: note.isPublic,
      shareId: note.shareId,
      shareUrl: note.shareId ? `${window.location.origin}/shared/${note.shareId}` : null,
    });
    setSaveStatus('idle');
  };

  const saveNote = async (id: string, data: { title: string; content: string; tags: string[] }) => {
    try {
      setSaveStatus('saving');
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save note');
      
      // Update the notes list with the saved data
      setNotes(prev => prev.map(n => n.id === id ? json.data : n).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setSaveStatus('saved');
      
      setTimeout(() => {
        if (mountedRef.current) setSaveStatus('idle');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      setSaveStatus('idle');
    }
  };

  // Handle Editor Changes
  const handleEditorChange = (field: 'title' | 'content', value: string) => {
    if (!activeNoteData || !activeNoteId) return;
    
    const updatedData = { ...activeNoteData, [field]: value };
    setActiveNoteData(updatedData);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(activeNoteId, updatedData);
    }, 800);
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim() !== '') {
      e.preventDefault();
      if (!activeNoteData || !activeNoteId) return;
      
      const tagName = newTagInput.trim();
      if (activeNoteData.tags.includes(tagName)) {
        setNewTagInput('');
        return;
      }

      const updatedData = { ...activeNoteData, tags: [...activeNoteData.tags, tagName] };
      setActiveNoteData(updatedData);
      setNewTagInput('');

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveNote(activeNoteId, updatedData);
    }
  };

  const handleRemoveTag = (tagName: string) => {
    if (!activeNoteData || !activeNoteId) return;
    
    const updatedData = { ...activeNoteData, tags: activeNoteData.tags.filter(t => t !== tagName) };
    setActiveNoteData(updatedData);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveNote(activeNoteId, updatedData);
  };

  const handleArchiveNote = async () => {
    if (!activeNoteId) return;
    const idToArchive = activeNoteId;
    
    // Optimistic UI update
    setNotes(prev => prev.filter(n => n.id !== idToArchive));
    setActiveNoteId(null);
    setActiveNoteData(null);

    try {
      const res = await fetch(`/api/notes/${idToArchive}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to archive note');
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      fetchNotes(searchQuery, activeTag, sortBy); // Revert optimistic update on failure
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeNoteId) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/notes/${activeNoteId}/generate-summary`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate summary');
      
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, aiSummary: json.data } : n));
      setActiveNoteData(prev => prev ? { ...prev, aiSummary: json.data } : null);
    } catch (err: unknown) {
      if (err instanceof Error) setAiError(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleShareToggle = async (isPublic: boolean) => {
    if (!activeNoteId) return;
    try {
      const res = await fetch(`/api/notes/${activeNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update share settings');
      
      setActiveNoteData(prev => prev ? { ...prev, isPublic: json.data.isPublic, shareId: json.data.shareId, shareUrl: json.data.shareUrl } : null);
      setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, isPublic: json.data.isPublic, shareId: json.data.shareId } : n));
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value;
    setSortBy(newSort);
    setIsLoading(true);
    fetchNotes(searchQuery, activeTag, newSort);
  };

  // Derive unique tags from all notes
  const uniqueTags = Array.from(new Set(notes.flatMap(n => n.tags.map(t => t.name))));

  const getRelativeTime = (dateString: Date) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = new Date(dateString).getTime() - new Date().getTime();
    const diffMins = Math.round(diff / 60000);
    if (Math.abs(diffMins) < 60) return rtf.format(diffMins, 'minute');
    const diffHours = Math.round(diffMins / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(Math.round(diffHours / 24), 'day');
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex space-x-6">
      {error && (
        <div className="absolute top-20 right-8 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg shadow-lg z-50">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-zinc-400 hover:text-zinc-200">×</button>
        </div>
      )}

      {/* Left Sidebar */}
      <div className="w-[260px] flex flex-col bg-zinc-900/40 rounded-xl border border-zinc-800/50 backdrop-blur-md overflow-hidden shrink-0">
        <div className="p-4 border-b border-zinc-800/50 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sort by</span>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="updated">Last updated</option>
              <option value="created">Created date</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search notes..."
            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-500 transition-all"
          />
          
          <div className="text-xs text-zinc-500 px-1">
            {notes.length} {notes.length === 1 ? 'result' : 'results'}
          </div>
          
          {uniqueTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
              {uniqueTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors border ${
                    activeTag === tag
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-zinc-800/50 h-16 rounded-lg w-full"></div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm mt-8 px-4">
              {searchQuery || activeTag ? (
                'No notes found'
              ) : (
                <div className="space-y-3">
                  <p>You have no notes.</p>
                  <button onClick={handleCreateNote} className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    Create your first note →
                  </button>
                </div>
              )}
            </div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                  activeNoteId === note.id
                    ? 'bg-zinc-800/80 border-zinc-700 shadow-md'
                    : 'bg-transparent border-transparent hover:bg-zinc-800/40'
                }`}
              >
                <h3 className="font-medium text-zinc-200 truncate">{note.title || 'Untitled'}</h3>
                <p className="text-xs text-zinc-500 mt-1 truncate">
                  {note.content || 'No content'}
                </p>
                <div className="text-[10px] text-zinc-600 mt-2">
                  {getRelativeTime(note.updatedAt)}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/60">
          <button
            onClick={handleCreateNote}
            className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>+</span>
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Right Editor Panel */}
      <div className="flex-1 bg-zinc-900/40 rounded-xl border border-zinc-800/50 backdrop-blur-md overflow-hidden flex flex-col relative">
        {activeNoteId && activeNoteData ? (
          <>
            <div className="absolute top-4 right-4 flex items-center space-x-4 z-10">
              <span className={`text-xs ${
                saveStatus === 'saving' ? 'text-indigo-400 animate-pulse' :
                saveStatus === 'saved' ? 'text-emerald-400' : 'text-zinc-600'
              }`}>
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : ''}
              </span>

              {activeNoteData.isPublic ? (
                <div className="flex items-center space-x-2 bg-zinc-800/50 rounded-lg p-1 border border-zinc-700/50">
                  <input 
                    type="text" 
                    readOnly 
                    value={activeNoteData.shareUrl || ''} 
                    className="bg-transparent text-xs text-zinc-300 px-2 w-48 focus:outline-none"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(activeNoteData.shareUrl || '')}
                    className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded transition-colors"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => handleShareToggle(false)}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded transition-colors"
                  >
                    Unshare
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleShareToggle(true)}
                  className="flex items-center space-x-1 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.667 3.111m-5.667-3.111l5.667-3.111m5.667 3.111a3 3 0 110-5.368 3 3 0 010 5.368z" />
                  </svg>
                  <span>Share</span>
                </button>
              )}

              <button
                onClick={handleArchiveNote}
                className="text-zinc-500 hover:text-red-400 transition-colors p-2"
                title="Archive Note"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </button>
            </div>

            <div className="p-8 pb-4 shrink-0">
              <input
                type="text"
                value={activeNoteData.title}
                onChange={(e) => handleEditorChange('title', e.target.value)}
                placeholder="Untitled"
                className="w-full text-4xl font-bold bg-transparent text-zinc-100 border-none focus:outline-none focus:ring-0 placeholder-zinc-700"
              />
              
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {activeNoteData.tags.map(tag => (
                  <span key={tag} className="flex items-center text-xs px-3 py-1.5 bg-zinc-800 rounded-md text-zinc-300 border border-zinc-700">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-zinc-500 hover:text-zinc-300 focus:outline-none">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add a tag..."
                  className="bg-transparent text-sm text-zinc-400 focus:outline-none focus:ring-0 placeholder-zinc-600 w-32 border border-dashed border-zinc-700 px-3 py-1.5 rounded-md focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 p-8 pt-4 overflow-hidden flex flex-col">
              <textarea
                value={activeNoteData.content}
                onChange={(e) => handleEditorChange('content', e.target.value)}
                placeholder="Start writing..."
                className="w-full flex-1 bg-transparent text-zinc-300 border-none focus:outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed custom-scrollbar placeholder-zinc-700"
              />
            </div>

            {/* AI Panel */}
            <div className="border-t border-zinc-800/50 bg-zinc-900/80">
              <button
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                className="w-full px-8 py-3 flex items-center justify-between text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium">AI Assistant</span>
                </div>
                <svg className={`w-4 h-4 transform transition-transform ${isAIPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isAIPanelOpen && (
                <div className="p-8 pt-4 max-h-64 overflow-y-auto custom-scrollbar border-t border-zinc-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handleGenerateSummary}
                      disabled={aiGenerating}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {aiGenerating && (
                        <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      <span>{aiGenerating ? 'Thinking...' : 'Generate AI Summary'}</span>
                    </button>
                    {activeNoteData.aiSummary?.generatedAt && (
                      <span className="text-xs text-zinc-500">
                        Last generated: {getRelativeTime(activeNoteData.aiSummary.generatedAt)}
                      </span>
                    )}
                  </div>

                  {aiError && (
                    <div className="text-red-400 text-sm mb-4">{aiError}</div>
                  )}

                  {activeNoteData.aiSummary && !aiGenerating && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Summary</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed">{activeNoteData.aiSummary.summary}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Action Items</h4>
                        <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-1">
                          {activeNoteData.aiSummary.actionItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Suggested Title</h4>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-zinc-300 italic">&quot;{activeNoteData.aiSummary.suggestedTitle}&quot;</span>
                          <button
                            onClick={() => handleEditorChange('title', activeNoteData.aiSummary!.suggestedTitle)}
                            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                          >
                            Use this title
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p>Select a note or create a new one</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
