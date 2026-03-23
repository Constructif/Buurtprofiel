import { useState, useRef, useEffect } from 'react';
import type { Wijkobservatie, ObservatieCategorie } from '../../../types/wijkronde';
import { CATEGORIEEN, CATEGORIE_KLEUREN, parseFotoPaths, serializeFotoPaths } from '../../../types/wijkronde';
import { compressImage } from '../../../utils/imageCompress';
import { uploadFoto, deleteFoto, updateObservatie, deleteObservatie, refreshFotoUrls } from '../../../services/wijkronde';

interface ObservatieDetailProps {
  observatie: Wijkobservatie;
  onClose: () => void;
  onUpdated: () => void;
}

interface FotoItem {
  path: string;
  url: string;
}

export function ObservatieDetail({ observatie, onClose, onUpdated }: ObservatieDetailProps) {
  const [categorie, setCategorie] = useState<ObservatieCategorie>(observatie.categorie);
  const [opmerking, setOpmerking] = useState(observatie.opmerking || '');
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [loadingFotos, setLoadingFotos] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullscreenFoto, setFullscreenFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load foto signed URLs
  useEffect(() => {
    async function loadFotos() {
      const paths = parseFotoPaths(observatie.foto_path);
      if (paths.length === 0) {
        setFotos([]);
        setLoadingFotos(false);
        return;
      }
      const urls = await refreshFotoUrls(paths);
      setFotos(paths.map(p => ({ path: p, url: urls[p] || '' })));
      setLoadingFotos(false);
    }
    loadFotos();
  }, [observatie.foto_path]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const currentPaths = () => fotos.map(f => f.path);

  const handleAddFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      const { path } = await uploadFoto(observatie.buurtcode, observatie.ronde_id, compressed);

      // Get signed URL for preview
      const urls = await refreshFotoUrls([path]);
      const url = urls[path] || '';

      const newFotos = [...fotos, { path, url }];
      setFotos(newFotos);

      // Save to DB
      await updateObservatie(observatie.id, {
        foto_path: serializeFotoPaths(newFotos.map(f => f.path)),
      });
    } catch {
      setError('Foto uploaden mislukt');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFoto = async (index: number) => {
    const foto = fotos[index];
    setError(null);
    try {
      await deleteFoto(foto.path);
      const newFotos = fotos.filter((_, i) => i !== index);
      setFotos(newFotos);
      await updateObservatie(observatie.id, {
        foto_path: serializeFotoPaths(newFotos.map(f => f.path)),
      });
    } catch {
      setError('Foto verwijderen mislukt');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateObservatie(observatie.id, {
        categorie,
        opmerking: opmerking.trim() || null,
        foto_path: serializeFotoPaths(currentPaths()),
      });
      onUpdated();
    } catch {
      setError('Opslaan mislukt');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete all photos from storage
      for (const foto of fotos) {
        try { await deleteFoto(foto.path); } catch { /* ignore */ }
      }
      await deleteObservatie(observatie.id);
      onUpdated();
    } catch {
      setError('Verwijderen mislukt');
      setIsDeleting(false);
    }
  };

  const hasChanges = categorie !== observatie.categorie
    || (opmerking.trim() || null) !== (observatie.opmerking || null);

  return (
    <>
      {/* Fullscreen foto viewer */}
      {fullscreenFoto && (
        <div
          onClick={() => setFullscreenFoto(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img
            src={fullscreenFoto}
            alt="Foto"
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999,
        }}
      />

      {/* Detail sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderRadius: '16px 16px 0 0',
        zIndex: 1000, maxHeight: '90vh', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        touchAction: 'pan-y', overscrollBehavior: 'contain',
        padding: '20px',
        paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px))`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1b', margin: 0 }}>
            Observatie bewerken
          </h3>
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

        {/* Foto's */}
        <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
          Foto's ({fotos.length})
        </label>

        {loadingFotos ? (
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>Foto's laden...</p>
        ) : (
          <div style={{
            display: 'flex', gap: '8px', overflowX: 'auto',
            paddingBottom: '8px', marginBottom: '12px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {fotos.map((foto, i) => (
              <div key={foto.path} style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={foto.url}
                  alt={`Foto ${i + 1}`}
                  onClick={() => setFullscreenFoto(foto.url)}
                  style={{
                    width: '120px', height: '120px',
                    objectFit: 'cover', borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
                <button
                  onClick={() => handleDeleteFoto(i)}
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

            {/* Add foto button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '120px', height: '120px', flexShrink: 0,
                border: '2px dashed #d1d5db', borderRadius: '8px',
                backgroundColor: '#f9fafb', color: '#6b7280',
                cursor: uploading ? 'default' : 'pointer',
                fontSize: '13px', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px',
              }}
            >
              {uploading ? 'Uploaden...' : '+ Foto'}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAddFoto}
          style={{ display: 'none' }}
        />

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
            width: '100%', padding: '12px',
            border: '1px solid #d1d5db', borderRadius: '8px',
            fontSize: '16px', resize: 'none',
            marginBottom: '16px', boxSizing: 'border-box',
          }}
        />

        {/* Locatie */}
        <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
          {observatie.lat.toFixed(5)}, {observatie.lng.toFixed(5)} — {new Date(observatie.created_at).toLocaleString('nl-NL')}
        </p>

        {error && (
          <p style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
        )}

        {/* Acties */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            style={{
              flex: 1, padding: '14px', border: 'none', borderRadius: '8px',
              backgroundColor: isSaving || !hasChanges ? '#d1d5db' : '#eb6608',
              color: '#fff', cursor: isSaving || !hasChanges ? 'default' : 'pointer',
              fontSize: '14px', fontWeight: 600, minHeight: '48px',
            }}
          >
            {isSaving ? 'Opslaan...' : 'Wijzigingen opslaan'}
          </button>
        </div>

        {/* Verwijderen */}
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                flex: 1, padding: '12px', border: 'none', borderRadius: '8px',
                backgroundColor: '#c0392b', color: '#fff',
                cursor: isDeleting ? 'default' : 'pointer',
                fontSize: '13px', fontWeight: 600,
              }}
            >
              {isDeleting ? 'Verwijderen...' : 'Ja, verwijder observatie'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                padding: '12px 20px', border: '1px solid #d1d5db', borderRadius: '8px',
                backgroundColor: '#fff', color: '#374151', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Annuleren
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', padding: '12px', border: '1px solid #e5c7c4', borderRadius: '8px',
              backgroundColor: '#fff', color: '#c0392b', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
            }}
          >
            Observatie verwijderen
          </button>
        )}
      </div>
    </>
  );
}
