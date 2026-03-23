'use client';

import { useEffect, useState } from 'react';
import { adminGetAllUsers, adminUpdateUserPlan, adminClearUserBackground } from '@/lib/firebase';

type PlanFilter = 'all' | 'free' | 'pro';

function formatDate(ts: any): string {
  if (!ts) return '—';
  const ms = ts.seconds ? ts.seconds * 1000 : ts.toDate?.()?.getTime?.();
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(ts: any): string {
  if (!ts) return 'never';
  const ms = ts.seconds ? ts.seconds * 1000 : ts.toDate?.()?.getTime?.();
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string>('');

  const loadUsers = async () => {
    const { data } = await adminGetAllUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const matchesPlan = planFilter === 'all' || (u.plan || 'free') === planFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || (u.username || '').includes(q) || (u.email || '').includes(q);
    return matchesPlan && matchesSearch;
  }).sort((a, b) => {
    const aTime = a.createdAt?.seconds ?? 0;
    const bTime = b.createdAt?.seconds ?? 0;
    return bTime - aTime;
  });

  const handleTogglePlan = async (userId: string, username: string, currentPlan: string) => {
    const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
    setUpdating(userId);
    setUpdateError('');
    const { error } = await adminUpdateUserPlan(userId, newPlan as 'free' | 'pro', username);
    if (error) {
      setUpdateError(`Failed to update plan: ${error}`);
    } else {
      if (newPlan === 'free' && username) {
        await adminClearUserBackground(username);
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
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
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-white">{u.username || '(no username)'}</div>
                      <div className="text-xs text-neutral-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        (u.plan || 'free') === 'pro'
                          ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {u.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 hidden md:table-cell">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 hidden sm:table-cell">
                      {timeAgo(u.lastActiveAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/${u.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1 border border-neutral-800 rounded hover:border-neutral-600"
                        >
                          Preview
                        </a>
                        <button
                          onClick={() => handleTogglePlan(u.id, u.username || '', u.plan || 'free')}
                          disabled={updating === u.id}
                          className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-50 ${
                            (u.plan || 'free') === 'pro'
                              ? 'border-neutral-700 text-neutral-500 hover:text-red-400 hover:border-red-900'
                              : 'border-[#FF6B35]/30 text-[#FF6B35] hover:bg-[#FF6B35]/10'
                          }`}
                        >
                          {updating === u.id ? '...' : (u.plan || 'free') === 'pro' ? 'Revoke Pro' : 'Grant Pro'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
