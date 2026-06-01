import { useState } from 'react';
import type { NaderOnderzoekTopic } from '../../../types/naderOnderzoek';

interface Props {
  topics: NaderOnderzoekTopic[];
  actiefId: string | null;
  onSelect: (id: string) => void;
  onAdd: (titel: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, titel: string) => Promise<void>;
}

export function TopicSelector({ topics, actiefId, onSelect, onAdd, onDelete, onRename }: Props) {
  const [nieuweTitel, setNieuweTitel] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleAdd = async () => {
    const titel = nieuweTitel.trim();
    if (!titel) return;
    setAdding(true);
    try {
      await onAdd(titel);
      setNieuweTitel('');
    } finally {
      setAdding(false);
    }
  };

  const handleRenameSave = async () => {
    if (!renameId) return;
    const titel = renameValue.trim();
    if (titel) await onRename(renameId, titel);
    setRenameId(null);
    setRenameValue('');
  };

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1b', margin: 0 }}>
        Onderwerpen
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {topics.map((topic) => {
          const isSelected = topic.id === actiefId;
          const isRenaming = renameId === topic.id;

          return (
            <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSave();
                    if (e.key === 'Escape') {
                      setRenameId(null);
                      setRenameValue('');
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: '13px',
                    border: '2px solid #eb6608',
                    borderRadius: '6px',
                    outline: 'none',
                    minHeight: '40px',
                  }}
                />
              ) : (
                <button
                  onClick={() => onSelect(topic.id)}
                  onDoubleClick={() => {
                    setRenameId(topic.id);
                    setRenameValue(topic.titel);
                  }}
                  title="Dubbelklik om titel te wijzigen"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: isSelected ? '#fff7ed' : '#f9fafb',
                    border: isSelected ? '2px solid #eb6608' : '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    flex: 1,
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: '#1d1d1b',
                    minHeight: '40px',
                  }}
                >
                  {topic.titel}
                </button>
              )}

              {confirmDelete === topic.id ? (
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    onClick={async () => {
                      await onDelete(topic.id);
                      setConfirmDelete(null);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: '#c0392b',
                      color: '#fff',
                      cursor: 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      backgroundColor: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      minHeight: '32px',
                    }}
                  >
                    Nee
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(topic.id)}
                  title="Onderwerp verwijderen"
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    border: '1px solid #e5c7c4',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    color: '#c0392b',
                    cursor: 'pointer',
                    minHeight: '32px',
                    flexShrink: 0,
                  }}
                >
                  X
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          gap: '6px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f1f1',
        }}
      >
        <input
          value={nieuweTitel}
          onChange={(e) => setNieuweTitel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Nieuw onderwerp..."
          style={{
            flex: 1,
            padding: '8px 10px',
            fontSize: '13px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            outline: 'none',
            minHeight: '36px',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={adding || !nieuweTitel.trim()}
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#eb6608',
            color: '#fff',
            cursor: adding || !nieuweTitel.trim() ? 'default' : 'pointer',
            opacity: adding || !nieuweTitel.trim() ? 0.5 : 1,
            minHeight: '36px',
            whiteSpace: 'nowrap',
          }}
        >
          {adding ? '...' : '+ Voeg toe'}
        </button>
      </div>
    </div>
  );
}
