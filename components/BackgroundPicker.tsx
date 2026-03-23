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
  const [lockedNotice, setLockedNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPresetBackgrounds().then(({ data }) => {
      setPresets(data);
      setLoadingPresets(false);
    });
  }, []);

  useEffect(() => {
    if (value) setOpacity(value.opacity);
  }, [value]);

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    if (value) onChange({ ...value, opacity: newOpacity });
  };

  const handleSelectPreset = (preset: PresetBackground) => {
    if (!preset.isFree && !isPro) {
      // Flash the pro notice instead of silently ignoring the click
      setLockedNotice(true);
      setTimeout(() => setLockedNotice(false), 3000);
      return;
    }
    if (value?.type === 'preset' && value.presetId === preset.id) {
      onChange(null);
      return;
    }
    onChange({ url: preset.url, type: 'preset', presetId: preset.id, isFree: preset.isFree, opacity });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (value?.type === 'upload' && value.storagePath) {
      await deleteUserBackground(value.storagePath);
    }
    onChange(null);
  };

  const freePresets = presets.filter(p => p.isFree);
  const proPresets = presets.filter(p => !p.isFree);

  const PresetGrid = ({ items }: { items: PresetBackground[] }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
      {items.map(preset => {
        const locked = !preset.isFree && !isPro;
        const selected = value?.type === 'preset' && value.presetId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            title={locked ? 'Pro plan required' : preset.name}
            style={{
              position: 'relative',
              aspectRatio: '9/16',
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: locked ? 'not-allowed' : 'pointer',
              border: selected
                ? '2px solid #FF6B35'
                : locked
                ? '2px solid #333'
                : '2px solid transparent',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preset.thumbnailUrl || preset.url}
              alt={preset.name}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: locked ? 'brightness(0.35)' : 'none',
              }}
            />

            {/* Lock overlay for Pro presets */}
            {locked && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}>
                <div style={{
                  background: '#FF6B35', color: '#fff',
                  fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold',
                  letterSpacing: '0.1em', padding: '3px 7px', borderRadius: '4px',
                }}>
                  PRO
                </div>
              </div>
            )}

            {/* Selected checkmark */}
            {selected && (
              <div style={{
                position: 'absolute', top: '6px', right: '6px',
                background: '#FF6B35', borderRadius: '50%',
                width: '18px', height: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: '#fff', fontWeight: 'bold',
              }}>✓</div>
            )}

            {/* Name label */}
            {!locked && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '6px 6px 4px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                fontSize: '9px', fontFamily: 'monospace', color: '#ddd',
              }}>
                {preset.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: '#2a2a2a', borderRadius: '6px', padding: '2px' }}>
        <button
          onClick={() => setTab('presets')}
          style={{
            flex: 1, padding: '6px 12px', fontSize: '11px', fontFamily: 'monospace',
            letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none',
            borderRadius: '4px', cursor: 'pointer',
            background: tab === 'presets' ? '#3a3a3a' : 'transparent',
            color: tab === 'presets' ? '#ffffff' : '#666666',
          }}
        >
          Presets
        </button>
        <button
          onClick={() => setTab('upload')}
          style={{
            flex: 1, padding: '6px 12px', fontSize: '11px', fontFamily: 'monospace',
            letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none',
            borderRadius: '4px', cursor: 'pointer',
            background: tab === 'upload' ? '#3a3a3a' : 'transparent',
            color: tab === 'upload' ? '#ffffff' : '#666666',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          }}
        >
          {!isPro && (
            <span style={{
              background: '#FF6B35', color: '#fff', fontSize: '8px',
              fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px',
            }}>PRO</span>
          )}
          Upload
        </button>
      </div>

      {/* Presets Tab */}
      {tab === 'presets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loadingPresets ? (
            <div style={{ color: '#555', fontSize: '12px', fontFamily: 'monospace', padding: '16px 0' }}>
              Loading presets...
            </div>
          ) : presets.length === 0 ? (
            <div style={{ color: '#555', fontSize: '12px', fontFamily: 'monospace', padding: '16px 0' }}>
              No preset backgrounds available yet.
            </div>
          ) : (
            <>
              {/* Free presets */}
              {freePresets.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#4caf50', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Free
                  </div>
                  <PresetGrid items={freePresets} />
                </div>
              )}

              {/* Pro presets */}
              {proPresets.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#FF6B35', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Pro
                    </div>
                    {!isPro && (
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#555' }}>
                        — requires Pro plan
                      </div>
                    )}
                  </div>
                  <PresetGrid items={proPresets} />
                </div>
              )}

              {/* Only pro presets exist and user is free */}
              {freePresets.length === 0 && proPresets.length > 0 && !isPro && (
                <div style={{
                  padding: '10px 12px', background: '#1a1a1a',
                  border: '1px solid #2a2a2a', borderRadius: '6px',
                  fontSize: '11px', fontFamily: 'monospace', color: '#666',
                }}>
                  All presets require a Pro plan. Free presets will appear here when available.
                </div>
              )}
            </>
          )}

          {/* Locked notice — flashes when user clicks a Pro preset */}
          {lockedNotice && (
            <div style={{
              padding: '10px 14px', background: '#1f1313',
              border: '1px solid #5a2020', borderRadius: '6px',
              fontSize: '11px', fontFamily: 'monospace', color: '#ff8080',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>🔒</span>
              This background requires a Pro plan. Contact the admin to upgrade.
            </div>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {tab === 'upload' && (
        <div>
          {!isPro ? (
            <div style={{
              padding: '24px 20px', background: '#1a1a1a',
              border: '1px solid #2a2a2a', borderRadius: '8px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            }}>
              <div style={{
                background: '#FF6B35', color: '#fff', fontSize: '11px',
                fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '0.1em',
                padding: '4px 10px', borderRadius: '4px',
              }}>
                PRO FEATURE
              </div>
              <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#888' }}>
                Custom background upload is available on the Pro plan.
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#444' }}>
                Contact the admin to upgrade your account.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {value?.type === 'upload' && value.url && (
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', maxHeight: '160px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={value.url} alt="Current background" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    onClick={handleRemove}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.7)', color: '#fff',
                      border: 'none', borderRadius: '4px',
                      padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  padding: '20px', border: '2px dashed #444', borderRadius: '8px',
                  textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
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
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ff6b6b' }}>{uploadError}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Opacity + Remove — shown when a background is active */}
      {value && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ width: '100%', height: '1px', background: '#2a2a2a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Opacity
            </span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range" min="0.05" max="1" step="0.05" value={opacity}
            onChange={e => handleOpacityChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#FF6B35' }}
          />
          <button
            onClick={handleRemove}
            style={{
              marginTop: '2px', padding: '6px', background: 'transparent',
              border: '1px solid #2a2a2a', borderRadius: '4px',
              color: '#555', fontSize: '10px', fontFamily: 'monospace',
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
