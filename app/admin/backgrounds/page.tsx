'use client';

import { useEffect, useRef, useState } from 'react';
import { getAuthToken } from '@/lib/get-auth-token';
import { PresetBackground } from '@/lib/types';

export default function AdminBackgroundsPage() {
  const [backgrounds, setBackgrounds] = useState<PresetBackground[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload form state
  const [name, setName] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [category, setCategory] = useState('general');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const token = await getAuthToken();
    if (!token) return;
    const res = await fetch('/api/admin/backgrounds', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { data } = await res.json();
      setBackgrounds(data);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      setUploadError('Name and file are required.');
      return;
    }
    setUploading(true);
    setUploadError('');

    const token = await getAuthToken();
    if (!token) { setUploadError('Not authenticated'); setUploading(false); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name.trim());
    formData.append('isFree', String(isFree));
    formData.append('category', category);

    const res = await fetch('/api/admin/backgrounds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadError(body.error || 'Upload failed');
    } else {
      setName('');
      setCategory('general');
      setIsFree(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    }
    setUploading(false);
  };

  const handleDelete = async (bg: PresetBackground) => {
    if (!confirm(`Delete "${bg.name}"? This cannot be undone.`)) return;
    setDeletingId(bg.id);

    const token = await getAuthToken();
    if (!token) { setDeletingId(null); return; }

    await fetch(`/api/admin/backgrounds/${bg.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ storagePath: bg.storagePath || '' }),
    });

    setBackgrounds(prev => prev.filter(b => b.id !== bg.id));
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-mono uppercase tracking-widest text-white">Background Presets</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">
          Upload images to the preset library. Free presets are available to all users. Pro presets require a Pro plan.
        </p>
      </div>

      {/* Upload form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400">Upload New Preset</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dark Mountains"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-600 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. nature, abstract"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={isFree} onChange={() => setIsFree(true)} className="accent-[#FF6B35]" />
            <span className="text-sm font-mono text-neutral-400">Free</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!isFree} onChange={() => setIsFree(false)} className="accent-[#FF6B35]" />
            <span className="text-sm font-mono text-neutral-400">Pro only</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-neutral-600 mb-1">Image</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center cursor-pointer hover:border-neutral-500 transition-colors"
          >
            {file ? (
              <span className="text-sm font-mono text-neutral-300">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            ) : (
              <span className="text-sm font-mono text-neutral-600">Click to select image (JPG, PNG, WebP · Max 5MB)</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>

        {uploadError && (
          <p className="text-xs font-mono text-red-400">{uploadError}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file || !name.trim()}
          className="px-6 py-2.5 bg-white text-black text-xs font-mono uppercase tracking-widest rounded hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Preset'}
        </button>
      </div>

      {/* Existing presets */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500">
            {loading ? 'Loading...' : `${backgrounds.length} preset${backgrounds.length !== 1 ? 's' : ''}`}
          </h2>
        </div>
        {!loading && backgrounds.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-600">
            No presets uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
            {backgrounds.map(bg => (
              <div key={bg.id} className="group relative bg-neutral-800 rounded-lg overflow-hidden">
                <div className="aspect-[9/16] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bg.thumbnailUrl || bg.url} alt={bg.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleDelete(bg)}
                      disabled={deletingId === bg.id}
                      className="text-xs font-mono text-red-400 border border-red-900 px-3 py-1.5 rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {deletingId === bg.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-xs font-mono text-white truncate">{bg.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs font-mono text-neutral-500">{bg.category || 'general'}</span>
                    <span className={`text-xs font-mono px-1.5 py-0 rounded ${bg.isFree ? 'text-green-500' : 'text-[#FF6B35]'}`}>
                      {bg.isFree ? 'FREE' : 'PRO'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
