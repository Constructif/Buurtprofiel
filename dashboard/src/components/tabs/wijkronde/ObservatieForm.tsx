import { useState, useRef } from 'react';
import type { ObservatieCategorie } from '../../../types/wijkronde';
import { CATEGORIEEN, CATEGORIE_KLEUREN } from '../../../types/wijkronde';
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

export function ObservatieForm({ buurtcode, rondeId, lat, lng, onClose, onSaved }: ObservatieFormProps) {
  const [categorie, setCategorie] = useState<ObservatieCategorie | null>(null);
  const [opmerking, setOpmerking] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setFotoBlob(compressed);
      setFotoPreview(URL.createObjectURL(compressed));
    } catch {
      setError('Foto kon niet verwerkt worden');
    }
  };

  const handleSubmit = async () => {
    if (!categorie) {
      setError('Kies een categorie');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let foto_url: string | null = null;
      let foto_path: string | null = null;

      if (fotoBlob) {
        const result = await uploadFoto(buurtcode, rondeId, fotoBlob);
        foto_url = result.url;
        foto_path = result.path;
      }

      await createObservatie({
        buurtcode,
        lat,
        lng,
        categorie,
        opmerking: opmerking.trim() || null,
        foto_url,
        foto_path,
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
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 999,
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: '16px 16px 0 0',
        padding: '20px',
        paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 1000,
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      }}>
        {/* Drag handle */}
        <div style={{
          width: '40px',
          height: '4px',
          backgroundColor: '#d1d5db',
          borderRadius: '2px',
          margin: '0 auto 16px',
        }} />

        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1b', marginBottom: '4px' }}>
          Nieuwe observatie
        </h3>
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>

        {/* Categorie knoppen */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Categorie
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '16px',
        }}>
          {CATEGORIEEN.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategorie(cat)}
              style={{
                padding: '10px 8px',
                fontSize: '13px',
                fontWeight: 500,
                border: categorie === cat ? `2px solid ${CATEGORIE_KLEUREN[cat]}` : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: categorie === cat ? `${CATEGORIE_KLEUREN[cat]}15` : '#fff',
                color: categorie === cat ? CATEGORIE_KLEUREN[cat] : '#374151',
                cursor: 'pointer',
                minHeight: '44px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Foto */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Foto
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoSelect}
          style={{ display: 'none' }}
        />
        {fotoPreview ? (
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <img
              src={fotoPreview}
              alt="Preview"
              style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
            />
            <button
              onClick={() => {
                setFotoPreview(null);
                setFotoBlob(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              X
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '16px',
              minHeight: '44px',
            }}
          >
            Foto maken of kiezen
          </button>
        )}

        {/* Opmerking */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Opmerking
        </label>
        <textarea
          value={opmerking}
          onChange={(e) => setOpmerking(e.target.value)}
          placeholder="Beschrijf wat je ziet..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'vertical',
            marginBottom: '16px',
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Actieknoppen */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !categorie}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isSaving || !categorie ? '#d1d5db' : '#eb6608',
              color: '#fff',
              cursor: isSaving || !categorie ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              minHeight: '44px',
            }}
          >
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </>
  );
}
