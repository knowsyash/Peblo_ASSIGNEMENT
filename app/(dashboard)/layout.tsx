'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <nav className="w-[200px] flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent block mb-8">
            PebloNotes
          </Link>
          
          <div className="space-y-2">
            <Link
              href="/notes"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/notes')
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              Notes
            </Link>
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-800/50">
          <div className="text-sm font-medium text-zinc-300 mb-4 truncate">
            My Account
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-zinc-400 hover:text-white text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 py-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
