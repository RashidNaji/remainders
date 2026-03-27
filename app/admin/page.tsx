'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setUsers(data);
      }
      setLoading(false);
    })();
  }, []);

  const totalUsers = users.length;
  const proUsers = users.filter(u => u.plan === 'pro').length;
  const freeUsers = totalUsers - proUsers;

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const activeToday = users.filter(u => {
    if (!u.lastActiveAt) return false;
    return new Date(u.lastActiveAt).getTime() > oneDayAgo;
  }).length;

  const stats = [
    { label: 'Total Users', value: loading ? '—' : totalUsers },
    { label: 'Pro Users', value: loading ? '—' : proUsers },
    { label: 'Free Users', value: loading ? '—' : freeUsers },
    { label: 'Active (24h)', value: loading ? '—' : activeToday },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-white">Admin Dashboard</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">Remainders — control panel</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="text-3xl font-mono text-white mb-1">{stat.value}</div>
            <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/users"
          className="block bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-600 transition-colors group"
        >
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors mb-2">
            User Management →
          </h2>
          <p className="text-xs font-mono text-neutral-600">
            View all users, manage plans, search and filter
          </p>
        </Link>
        <Link href="/admin/backgrounds"
          className="block bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-600 transition-colors group"
        >
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors mb-2">
            Background Presets →
          </h2>
          <p className="text-xs font-mono text-neutral-600">
            Upload and manage preset background images (free & pro)
          </p>
        </Link>
        <Link href="/admin/kofi"
          className="block bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-600 transition-colors group"
        >
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors mb-2">
            Ko-fi Events →
          </h2>
          <p className="text-xs font-mono text-neutral-600">
            View all donations, subscriptions, errors, and pending grants
          </p>
        </Link>
      </div>

      {/* Recent users */}
      {!loading && users.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500">Recent Signups</h2>
          </div>
          <div className="divide-y divide-neutral-800">
            {[...users]
              .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
              })
              .slice(0, 5)
              .map(u => (
                <div key={u.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-mono text-white">{u.username || u.id}</div>
                    <div className="text-xs font-mono text-neutral-500">{u.email}</div>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    u.plan === 'pro' ? 'bg-[#FF6B35]/20 text-[#FF6B35]' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {u.plan || 'free'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
