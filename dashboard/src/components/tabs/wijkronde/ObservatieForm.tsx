import { useState, useRef, useEffect } from 'react';
import type { ObservatieCategorie } from '../../../types/wijkronde';
import { CATEGORIEEN, CATEGORIE_KLEUREN, serializeFotoPaths } from '../../../types/wijkronde';
import { compressImage } from '../../../utils/imageCompress';
import { uploadFoto, createObservatie } from '../../../services/wijkronde';

interface ObservatieFormProps {
  buurtcode: string;
  rondeId: string;
  lat: number;
  lng: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FotoPreviewItem {
  blob: Blob;
  preview: string;
}

export function ObservatieForm({ buurtcode, rondeId, lat, lng, onClose, onSaved }: ObservatieFormProps) {
  const [categorie, setCategorie] = useState<ObservatieCategorie | null>(null);
  const [opmerking, setOpmerking] = useState('');
  const [fotos, setFotos] = useState<FotoPreviewItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Prevent pull-to-refresh when scrolling inside the bottom sheet
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (sheet.scrollTop > 0 || e.touches[0].clientY < sheet.getBoundingClientRect().top) {
        e.stopPropagation();
      }
    };

    sheet.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.body.style.overflow = 'hidden';

    return () => {
      sheet.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overflow = '';
    };
  }, []);

  const handleFotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFotos(prev => [...prev, { blob: compressed, preview: reader.result as string }]);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError('Foto kon niet verwerkt worden');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!categorie) {
      setError('Kies een categorie');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Upload alle foto's
      const paths: string[] = [];
      for (const foto of fotos) {
        const result = await uploadFoto(buurtcode, rondeId, foto.blob);
        paths.push(result.path);
      }

      await createObservatie({
        buurtcode,
        lat,
        lng,
        categorie,
        opmerking: opmerking.trim() || null,
        foto_url: null,
        foto_path: serializeFotoPaths(paths),
        ronde_id: rondeId,
      });

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999,
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
          padding: '20px',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
          zIndex: 1000, maxHeight: '85vh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          touchAction: 'pan-y', overscrollBehavior: 'contain',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1b', margin: 0 }}>
              Nieuwe observatie
            </h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#6b7280',
              cursor: 'pointer', padding: '8px', fontSize: '20px', lineHeight: 1,
            }}
          >
            X
          </button>
        </div>

        {/* Categorie */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Categorie
        </label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px', marginBottom: '16px',
        }}>
          {CATEGORIEEN.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategorie(cat)}
              style={{
                padding: '8px 4px', fontSize: '11px', fontWeight: 500,
                border: categorie === cat ? `2px solid ${CATEGORIE_KLEUREN[cat]}` : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: categorie === cat ? `${CATEGORIE_KLEUREN[cat]}15` : '#fff',
                color: categorie === cat ? CATEGORIE_KLEUREN[cat] : '#374151',
                cursor: 'pointer', minHeight: '40px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Foto's */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Foto's {fotos.length > 0 && `(${fotos.length})`}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoSelect}
          style={{ display: 'none' }}
        />
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto',
          paddingBottom: '8px', marginBottom: '12px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {fotos.map((foto, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={foto.preview}
                alt={`Foto ${i + 1}`}
                style={{
                  width: '100px', height: '100px',
                  objectFit: 'cover', borderRadius: '8px',
                }}
              />
              <button
                onClick={() => removeFoto(i)}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                X
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100px', height: '100px', flexShrink: 0,
              border: '2px dashed #d1d5db', borderRadius: '8px',
              backgroundColor: '#f9fafb', color: '#6b7280',
              cursor: 'pointer', fontSize: '13px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            + Foto
          </button>
        </div>

        {/* Opmerking */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Opmerking
        </label>
        <textarea
          value={opmerking}
          onChange={(e) => setOpmerking(e.target.value)}
          placeholder="Beschrijf wat je ziet..."
          rows={2}
          style={{
            width: '100%', padding: '12px',
            border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '16px', resize: 'none',
            marginBottom: '16px', boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Opslaan */}
        <button
          onClick={handleSubmit}
          disabled={isSaving || !categorie}
          style={{
            width: '100%', padding: '14px',
            border: 'none', borderRadius: '8px',
            backgroundColor: isSaving || !categorie ? '#d1d5db' : '#eb6608',
            color: '#fff',
            cursor: isSaving || !categorie ? 'default' : 'pointer',
            fontSize: '14px', fontWeight: 600, minHeight: '48px',
          }}
        >
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </>
  );
}
