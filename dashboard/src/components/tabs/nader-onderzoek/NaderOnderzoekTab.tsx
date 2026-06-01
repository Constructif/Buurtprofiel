import { useState, useEffect, useCallback } from 'react';
import { useGebiedStore } from '../../../store/gebiedStore';
import {
  fetchTopicsForBuurt,
  createTopic,
  deleteTopic,
  updateTopicTitel,
  seedDefaultTopics,
} from '../../../services/naderOnderzoek';
import type { NaderOnderzoekTopic } from '../../../types/naderOnderzoek';
import { logger } from '../../../utils/logger';
import { TopicSelector } from './TopicSelector';
import { TopicEditor } from './TopicEditor';

export function NaderOnderzoekTab() {
  const selectedGebied = useGebiedStore((s) => s.selectedGebied);
  const actiefTopicId = useGebiedStore((s) => s.actiefTopicId);
  const setActiefTopicId = useGebiedStore((s) => s.setActiefTopicId);

  const [topics, setTopics] = useState<NaderOnderzoekTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadTopics = useCallback(async () => {
    if (!selectedGebied) return;
    setLoading(true);
    try {
      let data = await fetchTopicsForBuurt(selectedGebied.code);

      // Eerste bezoek aan deze buurt: seed de 5 voorbeeld-onderwerpen
      if (data.length === 0) {
        setSeeding(true);
        try {
          data = await seedDefaultTopics(selectedGebied.code);
        } catch (err) {
          logger.error('Fout bij seeden default topics:', err);
        } finally {
          setSeeding(false);
        }
      }

      setTopics(data);

      // Selecteer eerste topic als er nog niks geselecteerd is (of selectie niet meer bestaat)
      if (!actiefTopicId || !data.find((t) => t.id === actiefTopicId)) {
        setActiefTopicId(data[0]?.id ?? null);
      }
    } catch (err) {
      logger.error('Fout bij laden topics:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGebied?.code]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const handleAdd = async (titel: string) => {
    if (!selectedGebied) return;
    try {
      const volgorde = topics.length;
      const nieuw = await createTopic({
        buurtcode: selectedGebied.code,
        titel,
        volgorde,
        is_default: false,
      });
      setTopics((prev) => [...prev, nieuw]);
      setActiefTopicId(nieuw.id);
    } catch (err) {
      logger.error('Fout bij aanmaken onderwerp:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTopic(id);
      const nieuw = topics.filter((t) => t.id !== id);
      setTopics(nieuw);
      if (actiefTopicId === id) {
        setActiefTopicId(nieuw[0]?.id ?? null);
      }
    } catch (err) {
      logger.error('Fout bij verwijderen onderwerp:', err);
    }
  };

  const handleRename = async (id: string, titel: string) => {
    try {
      await updateTopicTitel(id, titel);
      setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, titel } : t)));
    } catch (err) {
      logger.error('Fout bij hernoemen onderwerp:', err);
    }
  };

  if (!selectedGebied) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1d1d1b', marginBottom: '8px' }}>
          Nader Onderzoek
        </h2>
        <p style={{ color: '#6b7280', maxWidth: '400px', margin: '0 auto' }}>
          Selecteer een buurt om onderzoeksonderwerpen op te zetten en bevindingen vast te leggen.
        </p>
      </div>
    );
  }

  if (loading || seeding) {
    return (
      <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
        {seeding ? 'Standaard onderwerpen aanmaken...' : 'Laden...'}
      </p>
    );
  }

  const actiefTopic = topics.find((t) => t.id === actiefTopicId) ?? null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 320px) 1fr',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      <TopicSelector
        topics={topics}
        actiefId={actiefTopicId}
        onSelect={setActiefTopicId}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onRename={handleRename}
      />

      {actiefTopic ? (
        <TopicEditor key={actiefTopic.id} topic={actiefTopic} />
      ) : (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
          }}
        >
          Selecteer of voeg een onderwerp toe om te beginnen.
        </div>
      )}
    </div>
  );
}
