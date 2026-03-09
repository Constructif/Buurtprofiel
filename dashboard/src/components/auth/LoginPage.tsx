import { useState } from 'react';
import { supabase } from '../../services/supabase';

const ALLOWED_DOMAIN = '@constructif.nl';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      setError('Er ging iets mis. Probeer het opnieuw.');
      return;
    }

    setIsSent(true);
  };

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
              <button
                type="submit"
                disabled={isSending}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: isSending ? '#ccc' : '#eb6608',
                  border: 'none',
                  cursor: isSending ? 'default' : 'pointer',
                }}
              >
                {isSending ? 'Versturen...' : 'Verstuur magic link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
