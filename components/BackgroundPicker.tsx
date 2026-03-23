'use client';

import { useState, useEffect, useRef } from 'react';
import { BackgroundImage, PresetBackground } from '@/lib/types';
import { getPresetBackgrounds, uploadUserBackground, deleteUserBackground } from '@/lib/firebase';

interface BackgroundPickerProps {
  value: BackgroundImage | null;
  onChange: (bg: BackgroundImage | null) => void;
  userId: string;
  isPro: boolean;
}

export default function BackgroundPicker({ value, onChange, userId, isPro }: BackgroundPickerProps) {
  const [tab, setTab] = useState<'presets' | 'upload'>('presets');
  const [presets, setPresets] = useState<PresetBackground[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [opacity, setOpacity] = useState(value?.opacity ?? 0.1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPresetBackgrounds().then(({ data }) => {
      setPresets(data);
      setLoadingPresets(false);
    });
  }, []);

  // Sync opacity with current value
  useEffect(() => {
    if (value) setOpacity(value.opacity);
  }, [value]);

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    if (value) {
      onChange({ ...value, opacity: newOpacity });
    }
  };

  const handleSelectPreset = (preset: PresetBackground) => {
    if (!preset.isFree && !isPro) return; // locked
    if (value?.type === 'preset' && value.presetId === preset.id) {
      // Deselect
      onChange(null);
      return;
    }
    onChange({
      url: preset.url,
      type: 'preset',
      presetId: preset.id,
      isFree: preset.isFree,
      opacity,
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    // Delete old upload if exists
    if (value?.type === 'upload' && value.storagePath) {
      await deleteUserBackground(value.storagePath);
    }

    const { url, storagePath, error } = await uploadUserBackground(userId, file);
    if (error) {
      setUploadError(error);
    } else {
      onChange({ url, storagePath, type: 'upload', opacity });
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (value?.type === 'upload' && value.storagePath) {
      await deleteUserBackground(value.storagePath);
    }
    onChange(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#2a2a2a', borderRadius: '6px', padding: '2px' }}>
        {(['presets', 'upload'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              background: tab === t ? '#3a3a3a' : 'transparent',
              color: tab === t ? '#ffffff' : '#666666',
            }}
          >
            {t === 'upload' && !isPro ? '🔒 ' : ''}{t}
          </button>
        ))}
      </div>

      {/* Presets Tab */}
      {tab === 'presets' && (
        <div>
          {loadingPresets ? (
            <div style={{ color: '#666', fontSize: '12px', fontFamily: 'monospace', padding: '16px 0' }}>
              Loading presets...
            </div>
          ) : presets.length === 0 ? (
            <div style={{ color: '#555', fontSize: '12px', fontFamily: 'monospace', padding: '16px 0' }}>
              No preset backgrounds available yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {presets.map(preset => {
                const locked = !preset.isFree && !isPro;
                const selected = value?.type === 'preset' && value.presetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      position: 'relative',
                      aspectRatio: '9/16',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      border: selected ? '2px solid #FF6B35' : '2px solid transparent',
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.thumbnailUrl || preset.url}
                      alt={preset.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {locked && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '18px' }}>🔒</span>
                      </div>
                    )}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: '#FF6B35', borderRadius: '50%',
                        width: '16px', height: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', color: '#fff',
                      }}>✓</div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '4px 6px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      fontSize: '9px', fontFamily: 'monospace', color: '#ccc',
                    }}>
                      {preset.name}
                      {!preset.isFree && (
                        <span style={{
                          marginLeft: '4px', background: '#FF6B35', color: '#fff',
                          borderRadius: '3px', padding: '1px 4px', fontSize: '8px',
                        }}>PRO</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!isPro && (
            <div style={{
              marginTop: '12px', padding: '10px 12px', background: '#1f1f1f',
              border: '1px solid #333', borderRadius: '6px',
              fontSize: '11px', fontFamily: 'monospace', color: '#888',
            }}>
              🔒 Pro presets are locked. Contact the admin to upgrade your account.
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {tab === 'upload' && (
        <div>
          {!isPro ? (
            <div style={{
              padding: '20px', background: '#1f1f1f', border: '1px solid #333',
              borderRadius: '8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#aaa', marginBottom: '4px' }}>
                Custom backgrounds are a Pro feature
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#555' }}>
                Contact the admin to upgrade your account to Pro.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {value?.type === 'upload' && value.url && (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', maxHeight: '160px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value.url}
                    alt="Current background"
                    style={{ width: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    onClick={handleRemove}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.7)', color: '#fff',
                      border: 'none', borderRadius: '4px',
                      padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '20px', border: '2px dashed #444', borderRadius: '8px',
                  textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#888' }}>
                  {uploading ? 'Uploading...' : 'Click to upload image'}
                </div>
                <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#555', marginTop: '4px' }}>
                  JPG, PNG, WebP · Max 5MB
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploadError && (
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ff6b6b' }}>
                  {uploadError}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Opacity slider — shown when a background is active */}
      {value && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Opacity
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#aaa' }}>
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={opacity}
            onChange={e => handleOpacityChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#FF6B35' }}
          />
          <button
            onClick={handleRemove}
            style={{
              marginTop: '4px', padding: '6px', background: 'transparent',
              border: '1px solid #333', borderRadius: '4px',
              color: '#666', fontSize: '11px', fontFamily: 'monospace',
              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}
          >
            Remove background
          </button>
        </div>
      )}
    </div>
  );
}
