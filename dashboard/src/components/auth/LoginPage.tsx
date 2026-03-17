import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../services/supabase';

const ALLOWED_DOMAIN = '@constructif.nl';
const MAX_EMAILS_PER_HOUR = 2;
const ONE_HOUR_MS = 60 * 60 * 1000;

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [emailsUsed, setEmailsUsed] = useState<number | null>(null);
  const [nextSlotIn, setNextSlotIn] = useState<number | null>(null);
  const [statusAvailable, setStatusAvailable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Haal de status op uit de email_log tabel
  const fetchStatus = useCallback(async () => {
    const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS).toISOString();

    const { data, error: queryError } = await supabase
      .from('email_log')
      .select('sent_at')
      .gte('sent_at', oneHourAgo)
      .order('sent_at', { ascending: true });

    // Tabel bestaat niet → verberg indicator
    if (queryError) {
      setStatusAvailable(false);
      return;
    }

    setStatusAvailable(true);
    const count = data?.length ?? 0;
    setEmailsUsed(count);

    if (count >= MAX_EMAILS_PER_HOUR && data && data.length > 0) {
      const oldestSentAt = new Date(data[0].sent_at).getTime();
      const freeAt = oldestSentAt + ONE_HOUR_MS;
      const secondsLeft = Math.max(0, Math.ceil((freeAt - Date.now()) / 1000));
      setNextSlotIn(secondsLeft);
    } else {
      setNextSlotIn(null);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (nextSlotIn === null || nextSlotIn <= 0) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setNextSlotIn((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          fetchStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlotIn !== null && nextSlotIn > 0, fetchStatus]);

  // Poll elke 15 seconden
  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, 15_000);
    return () => {
      clearInterval(poll);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}:${s.toString().padStart(2, '0')}`;
    return `0:${s.toString().padStart(2, '0')}`;
  };

  const remaining = emailsUsed !== null ? Math.max(0, MAX_EMAILS_PER_HOUR - emailsUsed) : null;
  const isLimitReached = statusAvailable && remaining === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hercheck status voor submit
    await fetchStatus();

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError('Vul je e-mailadres in.');
      return;
    }

    if (!trimmed.endsWith(ALLOWED_DOMAIN)) {
      setError('Alleen @constructif.nl e-mailadressen zijn toegestaan.');
      return;
    }

    setIsSending(true);

    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSending(false);

    if (supabaseError) {
      console.error('Supabase OTP error:', supabaseError.message, supabaseError);
      const msg = supabaseError.message?.toLowerCase() || '';

      if (msg.includes('rate') || msg.includes('limit') || supabaseError.status === 429) {
        // Log in de tabel zodat andere gebruikers het ook zien
        await supabase.from('email_log').insert({ sent_at: new Date().toISOString() });
        await fetchStatus();
        setError('E-mail limiet bereikt.');
      } else if (msg.includes('not authorized') || msg.includes('not allowed')) {
        setError('Dit e-mailadres is niet geautoriseerd. Neem contact op met de beheerder.');
      } else {
        setError(`Er ging iets mis: ${supabaseError.message || 'Onbekende fout'}. Probeer het opnieuw.`);
      }
      return;
    }

    // Succes — log in de tabel
    await supabase.from('email_log').insert({ sent_at: new Date().toISOString() });
    await fetchStatus();
    setIsSent(true);
  };

  const isDisabled = isSending || isLimitReached;

  const statusColor = !statusAvailable || remaining === null
    ? '#999'
    : isLimitReached
      ? '#d32f2f'
      : remaining === 1
        ? '#e65100'
        : '#2e7d32';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f1ee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {/* Oranje header */}
        <div style={{
          backgroundColor: '#eb6608',
          padding: '32px 32px 28px',
          textAlign: 'center',
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            margin: 0,
          }}>
            Buurtprofiel
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '14px',
            margin: '8px 0 0',
          }}>
            Log in om verder te gaan
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          {isSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                backgroundColor: '#e8f5e9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p style={{ fontWeight: 600, fontSize: '16px', margin: '0 0 8px', color: '#1d1d1b' }}>
                Check je e-mail
              </p>
              <p style={{ color: '#666', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                We hebben een login link gestuurd naar <strong>{email.trim().toLowerCase()}</strong>. Klik op de link in de e-mail om in te loggen.
              </p>
              <button
                onClick={() => { setIsSent(false); setEmail(''); }}
                style={{
                  marginTop: '24px',
                  background: 'none',
                  border: 'none',
                  color: '#eb6608',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Ander e-mailadres gebruiken
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#1d1d1b',
                  marginBottom: '8px',
                }}
              >
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                placeholder="naam@constructif.nl"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '15px',
                  border: error ? '2px solid #d32f2f' : '2px solid #ddd',
                  outline: 'none',
                  backgroundColor: '#fafafa',
                  color: '#1d1d1b',
                  boxSizing: 'border-box',
                }}
              />
              {error && (
                <p style={{ color: '#d32f2f', fontSize: '13px', margin: '8px 0 0' }}>
                  {error}
                </p>
              )}

              {/* Live status indicator — alleen als email_log tabel bestaat */}
              {statusAvailable && remaining !== null && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: isLimitReached ? '#ffebee' : '#f5f5f5',
                  border: `1px solid ${isLimitReached ? '#ffcdd2' : '#e0e0e0'}`,
                  fontSize: '13px',
                  color: statusColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusColor,
                    flexShrink: 0,
                  }} />
                  {isLimitReached && nextSlotIn !== null && nextSlotIn > 0 ? (
                    <span>Limiet bereikt — weer beschikbaar over <strong>{formatTime(nextSlotIn)}</strong></span>
                  ) : isLimitReached ? (
                    <span>Limiet bereikt — wordt zo weer beschikbaar...</span>
                  ) : (
                    <span><strong>{remaining} van {MAX_EMAILS_PER_HOUR}</strong> login mails beschikbaar</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isDisabled}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: isDisabled ? '#ccc' : '#eb6608',
                  border: 'none',
                  cursor: isDisabled ? 'default' : 'pointer',
                }}
              >
                {isSending
                  ? 'Versturen...'
                  : isLimitReached && nextSlotIn !== null && nextSlotIn > 0
                    ? `Beschikbaar over ${formatTime(nextSlotIn)}`
                    : 'Verstuur magic link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
