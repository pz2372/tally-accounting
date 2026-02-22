import { useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  X,
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { API_BASE, getAuthHeaders } from '../utils/dashboardApi';
import type { PlaidItemData } from '../utils/dashboardApi';

export default function ConnectCardsSection({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<PlaidItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, [orgId]);

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

  const allAccounts = items.flatMap(item =>
    item.accounts.map(acc => ({ ...acc, institutionName: item.institutionName, itemId: item.id }))
  );

  const isConnecting = exchanging || (linkToken !== null && !ready);

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
