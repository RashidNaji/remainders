'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/');
    }
  }, [user, userProfile, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-sm tracking-widest uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Admin nav bar */}
      <nav className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-sm font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">
            Admin
          </Link>
          <Link href="/admin/users" className="text-sm font-mono uppercase tracking-wider text-neutral-500 hover:text-white transition-colors">
            Users
          </Link>
          <Link href="/admin/backgrounds" className="text-sm font-mono uppercase tracking-wider text-neutral-500 hover:text-white transition-colors">
            Backgrounds
          </Link>
          <Link href="/admin/kofi" className="text-sm font-mono uppercase tracking-wider text-neutral-500 hover:text-white transition-colors">
            Ko-fi
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-neutral-600">{userProfile?.username}</span>
          <Link href="/dashboard" className="text-xs font-mono text-neutral-500 hover:text-white transition-colors uppercase tracking-wider">
            ← Back to app
          </Link>
        </div>
      </nav>

      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  );
}
