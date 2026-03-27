'use client';

import { Fragment, useEffect, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';

interface KofiEvent {
  id: string;
  type: string;
  email: string;
  fromName: string;
  amount: string;
  currency: string;
  message: string | null;
  kofiTransactionId: string;
  tierName: string | null;
  isSubscription: boolean;
  isFirstSubscription: boolean;
  receivedAt: string | null;
  status: 'success' | 'pending_signup' | 'error';
  errorDetails?: string;
  userId?: string;
  username?: string;
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-green-950/50 text-green-400 border-green-900',
  pending_signup: 'bg-yellow-950/50 text-yellow-400 border-yellow-900',
  error: 'bg-red-950/50 text-red-400 border-red-900',
};

const STATUS_LABELS: Record<string, string> = {
  success: 'Pro Granted',
  pending_signup: 'Pending Signup',
  error: 'Error',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminKofiPage() {
  const [events, setEvents] = useState<KofiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchEvents = async (cursor?: string) => {
    const token = await getAuthToken();
    if (!token) { setError('Not authenticated'); setLoading(false); return; }

    const url = cursor
      ? `/api/admin/kofi/events?after=${cursor}`
      : '/api/admin/kofi/events';

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError('Failed to load Ko-fi events');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const { data, nextCursor: next } = await res.json();
    setEvents(prev => cursor ? [...prev, ...data] : data);
    setNextCursor(next);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const successCount = events.filter(e => e.status === 'success').length;
  const pendingCount = events.filter(e => e.status === 'pending_signup').length;
  const errorCount = events.filter(e => e.status === 'error').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-white">Ko-fi Events</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">
          All webhook events — donations, subscriptions, errors
        </p>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-900 border border-green-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-green-400">{successCount}</div>
            <div className="text-xs font-mono text-neutral-500 mt-1">Pro Granted</div>
          </div>
          <div className="bg-neutral-900 border border-yellow-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-yellow-400">{pendingCount}</div>
            <div className="text-xs font-mono text-neutral-500 mt-1">Pending Signup</div>
          </div>
          <div className="bg-neutral-900 border border-red-900/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-red-400">{errorCount}</div>
            <div className="text-xs font-mono text-neutral-500 mt-1">Errors</div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 text-xs font-mono text-red-400">
          {error}
        </div>
      )}

      {/* Events table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-600">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-600">
            No Ko-fi events yet. Events are logged when the webhook receives a request.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="text-left px-4 py-3">When</th>
                    <th className="text-left px-4 py-3">From</th>
                    <th className="text-left px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">User</th>
                    <th className="text-right px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {events.map(event => (
                    <Fragment key={event.id}>
                      <tr
                        className="hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      >
                        <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                          {formatDate(event.receivedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white">{event.fromName}</div>
                          <div className="text-neutral-500">{event.email}</div>
                        </td>
                        <td className="px-4 py-3 text-white whitespace-nowrap">
                          {event.amount} {event.currency}
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {event.type}
                          {event.tierName && (
                            <div className="text-neutral-600">{event.tierName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded border text-xs ${STATUS_STYLES[event.status] || ''}`}>
                            {STATUS_LABELS[event.status] || event.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {event.username ? (
                            <a
                              href={`/api/${event.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#FF6B35] hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {event.username}
                            </a>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-500">
                          {expandedId === event.id ? '▲' : '▼'}
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {expandedId === event.id && (
                        <tr className="bg-neutral-800/30">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-neutral-500 uppercase tracking-wider">Transaction ID</span>
                                  <div className="text-neutral-300 font-mono mt-0.5">{event.kofiTransactionId}</div>
                                </div>
                                {event.message && (
                                  <div>
                                    <span className="text-neutral-500 uppercase tracking-wider">Message</span>
                                    <div className="text-neutral-300 mt-0.5 italic">&ldquo;{event.message}&rdquo;</div>
                                  </div>
                                )}
                                <div className="flex gap-4">
                                  {event.isSubscription && (
                                    <span className="text-[#FF6B35]">Subscription</span>
                                  )}
                                  {event.isFirstSubscription && (
                                    <span className="text-green-400">First payment</span>
                                  )}
                                </div>
                              </div>
                              {event.status === 'error' && event.errorDetails && (
                                <div>
                                  <span className="text-red-400 uppercase tracking-wider">Error Details</span>
                                  <div className="mt-1 bg-red-950/30 border border-red-900/50 rounded p-2 text-red-300 break-all">
                                    {event.errorDetails}
                                  </div>
                                </div>
                              )}
                              {event.status === 'pending_signup' && (
                                <div>
                                  <span className="text-yellow-400 uppercase tracking-wider">Note</span>
                                  <div className="text-neutral-400 mt-0.5">
                                    No account found for this email. Pro will be granted automatically when they sign up.
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {nextCursor && (
              <div className="p-4 border-t border-neutral-800 text-center">
                <button
                  onClick={() => {
                    setLoadingMore(true);
                    fetchEvents(nextCursor);
                  }}
                  disabled={loadingMore}
                  className="px-6 py-2 text-xs font-mono uppercase tracking-wider text-neutral-400 border border-neutral-700 rounded hover:border-neutral-500 hover:text-white transition-colors disabled:opacity-40"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
