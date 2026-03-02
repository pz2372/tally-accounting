import { useState, useEffect, useRef } from 'react';
import {
  Link2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  X,
  Mail,
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { API_BASE, getAuthHeaders } from '../utils/dashboardApi';
import type { PlaidItemData } from '../utils/dashboardApi';

interface ConnectCardsSectionProps {
  orgId: string;
  emailVerified: boolean;
  userEmail: string;
  onVerified: () => void;
}

export default function ConnectCardsSection({ orgId, emailVerified, userEmail, onVerified }: ConnectCardsSectionProps) {
  const [items, setItems] = useState<PlaidItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState('');

  // Verification state
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!emailVerified) return;
    let cancelled = false;
    const fetchAccounts = async () => {
      setLoading(true);
      setItems([]);
      try {
        const res = await fetch(`${API_BASE}/plaid/accounts`, {
          headers: getAuthHeaders(orgId),
        });
        const data = await res.json();
        if (!cancelled && data.success) setItems(data.items);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAccounts();
    return () => { cancelled = true; };
  }, [orgId, emailVerified]);

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (public_token, metadata) => {
      setExchanging(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/plaid/exchange-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(orgId),
          },
          body: JSON.stringify({
            public_token,
            institution_id: metadata.institution?.institution_id,
            institution_name: metadata.institution?.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Exchange failed');
        setItems(prev => [...prev, data.plaidItem]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to connect account');
      } finally {
        setExchanging(false);
        setLinkToken(null);
      }
    },
    onExit: () => setLinkToken(null),
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/plaid/create-link-token`, {
        method: 'POST',
        headers: getAuthHeaders(orgId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get link token');
      setLinkToken(data.link_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await fetch(`${API_BASE}/plaid/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(orgId),
      });
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch {
      setError('Failed to disconnect account');
    }
  };

  const handleSendCode = async () => {
    setSendingCode(true);
    setVerifyError('');
    try {
      const res = await fetch(`${API_BASE}/auth/send-verification-code`, {
        method: 'POST',
        headers: getAuthHeaders(orgId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setCodeSent(true);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setVerifyError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setCode(newCode);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setVerifyError('Please enter the 6-digit code');
      return;
    }
    setVerifyingCode(true);
    setVerifyError('');
    try {
      const res = await fetch(`${API_BASE}/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(orgId),
        },
        body: JSON.stringify({ code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      onVerified();
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyingCode(false);
    }
  };

  const allAccounts = items.flatMap(item =>
    item.accounts.map(acc => ({ ...acc, institutionName: item.institutionName, itemId: item.id }))
  );

  const isConnecting = exchanging || (linkToken !== null && !ready);

  // Email verification gate
  if (!emailVerified) {
    return (
      <>
        <div className="dash-section-header">
          <div>
            <h2>Cards & Accounts</h2>
            <p className="dash-section-sub">
              Link bank accounts and credit cards via Plaid to automatically import transactions.
            </p>
          </div>
        </div>

        <div className="dash-verify-gate">
          <div className="dash-verify-icon">
            <Mail size={40} />
          </div>
          <h3>Verify your email to continue</h3>
          <p>
            For security, we need to verify your email before you can connect bank accounts.
          </p>

          {verifyError && (
            <div className="dash-verify-error">
              <AlertCircle size={14} />{verifyError}
            </div>
          )}

          {!codeSent ? (
            <>
              <p className="dash-verify-email">{userEmail}</p>
              <button className="dash-btn-primary" onClick={handleSendCode} disabled={sendingCode}>
                {sendingCode ? (
                  <><Loader2 size={14} className="dash-spinner" /> Sending…</>
                ) : (
                  <><Mail size={14} /> Send Verification Code</>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="dash-verify-sent">
                We sent a 6-digit code to <strong>{userEmail}</strong>
              </p>
              <div className="dash-verify-code-inputs" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="dash-verify-code-input"
                    value={digit}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <div className="dash-verify-actions">
                <button
                  className="dash-btn-primary"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || code.join('').length !== 6}
                >
                  {verifyingCode ? (
                    <><Loader2 size={14} className="dash-spinner" /> Verifying…</>
                  ) : (
                    'Verify'
                  )}
                </button>
                <button
                  className="dash-verify-resend"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                >
                  {sendingCode ? 'Sending…' : 'Resend Code'}
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dash-section-header">
        <div>
          <h2>Cards & Accounts</h2>
          <p className="dash-section-sub">
            Link bank accounts and credit cards via Plaid to automatically import transactions.
          </p>
        </div>
        {!loading && allAccounts.length > 0 && (
          <button className="dash-btn-primary" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <Loader2 size={14} className="dash-spinner" /> : <Plus size={14} />}
            {isConnecting ? 'Opening Plaid…' : 'Add Account'}
          </button>
        )}
      </div>

      {error && (
        <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading ? (
        <div className="dash-roles-state">
          <Loader2 size={20} className="dash-spinner" />
          <span>Loading accounts…</span>
        </div>
      ) : allAccounts.length === 0 ? (
        <div className="dash-connect-empty">
          <div className="dash-connect-empty-icon"><Landmark size={40} /></div>
          <h3>No accounts connected</h3>
          <p>Connect your bank or credit card to automatically sync transactions.</p>
          <button className="dash-btn-primary" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? (
              <><Loader2 size={14} className="dash-spinner" /> Opening Plaid…</>
            ) : (
              <><Link2 size={14} /> Connect via Plaid</>
            )}
          </button>
          <div className="dash-plaid-badge">
            <ShieldCheck size={12} />
            Secured by Plaid — bank-level encryption
          </div>
        </div>
      ) : (
        <div className="dash-connect-grid">
          {allAccounts.map((acc) => (
            <div key={acc.accountId} className="dash-connect-card">
              <div className="dash-connect-card-header">
                <div className="dash-connect-card-icon"><Landmark size={18} /></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} className="dash-connect-check" />
                  <button
                    className="dash-connect-remove"
                    onClick={() => handleRemove(acc.itemId)}
                    title="Disconnect"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="dash-connect-card-name">{acc.name}</div>
              {acc.institutionName && (
                <div className="dash-connect-card-institution">{acc.institutionName}</div>
              )}
              <div className="dash-connect-card-details">
                <span className="dash-connect-card-type">{acc.subtype || acc.type}</span>
                {acc.mask && <span>····{acc.mask}</span>}
              </div>
              {acc.currentBalance !== null && (
                <div className="dash-connect-card-balance">
                  ${acc.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>
          ))}
          <button
            className="dash-connect-card dash-connect-add"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? <Loader2 size={24} className="dash-spinner" /> : <Plus size={24} />}
            <span>{isConnecting ? 'Opening Plaid…' : 'Add Account'}</span>
          </button>
        </div>
      )}
    </>
  );
}
