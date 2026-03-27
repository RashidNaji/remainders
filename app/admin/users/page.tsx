'use client';

import { useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';
import { isPlanExpired } from '@/lib/plan-utils';

type PlanFilter = 'all' | 'free' | 'pro';

function formatDate(iso: any): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(iso: any): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'never';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Default expiry = today + 30 days, formatted as YYYY-MM-DD for <input type="date"> */
function defaultExpiryValue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string>('');

  // Grant Pro flow: which user is being granted, and their chosen expiry date
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>(defaultExpiryValue());

  const loadUsers = async () => {
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
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const effectivePlan = isPlanExpired(u.planExpiresAt) ? 'free' : (u.plan || 'free');
    const matchesPlan = planFilter === 'all' || effectivePlan === planFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || (u.username || '').includes(q) || (u.email || '').includes(q);
    return matchesPlan && matchesSearch;
  }).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  const startGrantPro = (userId: string) => {
    setGrantingUserId(userId);
    setExpiryDate(defaultExpiryValue());
  };

  const cancelGrantPro = () => setGrantingUserId(null);

  const confirmGrantPro = async (userId: string, username: string) => {
    setUpdating(userId);
    setUpdateError('');
    setGrantingUserId(null);
    const expiresAt = expiryDate ? new Date(expiryDate + 'T23:59:59').toISOString() : null;
    const token = await getAuthToken();
    if (!token) { setUpdateError('Not authenticated'); setUpdating(null); return; }
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: 'pro', username, expiresAt }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUpdateError(`Failed to grant Pro: ${body.error || res.statusText}`);
    } else {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, plan: 'pro', planExpiresAt: expiresAt } : u
      ));
    }
    setUpdating(null);
  };

  const handleRevokePro = async (userId: string, username: string) => {
    setUpdating(userId);
    setUpdateError('');
    const token = await getAuthToken();
    if (!token) { setUpdateError('Not authenticated'); setUpdating(null); return; }
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ plan: 'free', username }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUpdateError(`Failed to revoke Pro: ${body.error || res.statusText}`);
    } else {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, plan: 'free', planExpiresAt: null } : u
      ));
    }
    setUpdating(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-white">Users</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">
          {loading ? 'Loading...' : `${users.length} total users`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
        />
        <div className="flex gap-2">
          {(['all', 'free', 'pro'] as PlanFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setPlanFilter(f)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border transition-colors ${
                planFilter === f
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-neutral-500 border-neutral-800 hover:border-neutral-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {updateError && (
        <div className="flex items-center justify-between bg-red-950/50 border border-red-900 rounded-lg px-4 py-3">
          <span className="text-xs font-mono text-red-400">{updateError}</span>
          <button onClick={() => setUpdateError('')} className="text-red-600 hover:text-red-400 text-xs font-mono ml-4">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Last active</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-600">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const expired = isPlanExpired(u.planExpiresAt);
                  const effectivePlan = expired ? 'free' : (u.plan || 'free');
                  const isPro = effectivePlan === 'pro';

                  return (
                    <tr key={u.id} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white">{u.username || '(no username)'}</div>
                        <div className="text-xs text-neutral-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          isPro
                            ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
                            : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {isPro ? 'pro' : 'free'}
                        </span>
                        {isPro && u.planExpiresAt && (
                          <div className="text-xs text-neutral-600 mt-0.5">
                            expires {formatDate(u.planExpiresAt)}
                          </div>
                        )}
                        {expired && u.plan === 'pro' && (
                          <div className="text-xs text-red-600 mt-0.5">expired</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 hidden md:table-cell">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 hidden sm:table-cell">
                        {timeAgo(u.lastActiveAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {grantingUserId === u.id ? (
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <input
                              type="date"
                              value={expiryDate}
                              min={new Date().toISOString().slice(0, 10)}
                              onChange={e => setExpiryDate(e.target.value)}
                              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#FF6B35]"
                            />
                            <button
                              onClick={() => confirmGrantPro(u.id, u.username || '')}
                              disabled={!expiryDate}
                              className="text-xs px-2 py-1 rounded border border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/10 disabled:opacity-40"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={cancelGrantPro}
                              className="text-xs px-2 py-1 rounded border border-neutral-700 text-neutral-500 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/${u.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1 border border-neutral-800 rounded hover:border-neutral-600"
                            >
                              Preview
                            </a>
                            {isPro ? (
                              <button
                                onClick={() => handleRevokePro(u.id, u.username || '')}
                                disabled={updating === u.id}
                                className="text-xs px-2 py-1 rounded border border-neutral-700 text-neutral-500 hover:text-red-400 hover:border-red-900 disabled:opacity-50"
                              >
                                {updating === u.id ? '...' : 'Revoke Pro'}
                              </button>
                            ) : (
                              <button
                                onClick={() => startGrantPro(u.id)}
                                disabled={updating === u.id}
                                className="text-xs px-2 py-1 rounded border border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/10 disabled:opacity-50"
                              >
                                {updating === u.id ? '...' : 'Grant Pro'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
