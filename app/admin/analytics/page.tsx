'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';

interface AnalyticsData {
  requests: { '24h': number; '7d': number; '30d': number };
  users: { '24h': number; '7d': number; '30d': number };
  anonymous: { '24h': number; '7d': number; '30d': number };
  topUsers: { username: string; count: number }[];
  daily: { date: string; user: number; anonymous: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const token = await getAuthToken();
      if (!token) {
        setError('Could not get auth token — try refreshing.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`API error ${res.status}: ${body.error || res.statusText}`);
      }
      setLoading(false);
    })();
  }, []);

  const statCards = data
    ? [
        { label: 'Requests (24h)', value: data.requests['24h'] },
        { label: 'Requests (7d)', value: data.requests['7d'] },
        { label: 'Requests (30d)', value: data.requests['30d'] },
        { label: 'Active Users (24h)', value: data.users['24h'] },
        { label: 'Active Users (7d)', value: data.users['7d'] },
        { label: 'Active Users (30d)', value: data.users['30d'] },
        { label: 'Anonymous (24h)', value: data.anonymous['24h'] },
        { label: 'Anonymous (7d)', value: data.anonymous['7d'] },
        { label: 'Anonymous (30d)', value: data.anonymous['30d'] },
      ]
    : [];

  const maxDaily = data
    ? Math.max(...data.daily.map(d => d.user + d.anonymous), 1)
    : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-white">Analytics</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">Wallpaper generation events — last 30 days</p>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="text-3xl font-mono text-white mb-1">—</div>
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">Loading...</div>
              </div>
            ))
          : statCards.map(s => (
              <div key={s.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="text-3xl font-mono text-white mb-1">{s.value.toLocaleString()}</div>
                <div className="text-xs font-mono uppercase tracking-wider text-neutral-500">{s.label}</div>
              </div>
            ))}
      </div>

      {/* Daily chart */}
      {data && data.daily.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-6">Daily Requests (last 14 days)</h2>
          <div className="flex items-end gap-1 h-32">
            {data.daily.map(day => {
              const userH = Math.round((day.user / maxDaily) * 128);
              const anonH = Math.round((day.anonymous / maxDaily) * 128);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {day.date}<br />
                    <span className="text-[#FF6B35]">users: {day.user}</span><br />
                    <span className="text-neutral-400">anon: {day.anonymous}</span>
                  </div>
                  <div className="w-full flex flex-col justify-end" style={{ height: 128 }}>
                    <div style={{ height: anonH }} className="w-full bg-neutral-600 rounded-t-sm" />
                    <div style={{ height: userH }} className="w-full bg-[#FF6B35]/70 rounded-t-sm" />
                  </div>
                  <div className="text-[9px] font-mono text-neutral-600 rotate-45 origin-left mt-1 whitespace-nowrap">
                    {day.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
              <div className="w-3 h-3 rounded-sm bg-[#FF6B35]/70" /> Users
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
              <div className="w-3 h-3 rounded-sm bg-neutral-600" /> Anonymous
            </div>
          </div>
        </div>
      )}

      {/* Top users table */}
      {data && data.topUsers.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500">Top Users (30d)</h2>
          </div>
          <div className="divide-y divide-neutral-800">
            {data.topUsers.map((u, i) => (
              <div key={u.username} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-neutral-600 w-5 text-right">{i + 1}</span>
                  <span className="text-sm font-mono text-white">{u.username}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B35]/70 rounded-full"
                      style={{ width: `${(u.count / data.topUsers[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-neutral-400 w-12 text-right">{u.count.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && data && data.requests['30d'] === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center">
          <p className="text-sm font-mono text-neutral-500">No wallpaper events recorded yet.</p>
          <p className="text-xs font-mono text-neutral-600 mt-2">
            Events are logged when wallpapers are generated. Make sure the Firestore security rule is set.
          </p>
        </div>
      )}
    </div>
  );
}
