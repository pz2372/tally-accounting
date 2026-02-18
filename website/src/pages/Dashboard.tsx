import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  LogOut,
  Building2,
  ChevronRight,
  Settings,
  CreditCard,
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
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const orgId = user?.organizations?.[0]?.id;
    if (orgId) headers['x-org-id'] = orgId;
  } catch { /* ignore */ }
  return headers;
}

interface User {
  id: string;
  name: string;
  email: string;
  organizations?: { id: string; name: string; role: string }[];
}

interface Member {
  id: string;
  role: string;
  permissions: string[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PlaidAccountData {
  id: string;
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number | null;
  availableBalance: number | null;
  currency: string;
}

interface PlaidItemData {
  id: string;
  institutionName: string | null;
  accounts: PlaidAccountData[];
}

const navItems = [
  { id: 'connect', label: 'Connect Cards', icon: <Link2 size={18} /> },
  { id: 'roles', label: 'Roles', icon: <Users size={18} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={18} /> },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('connect');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/login');
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const orgName = user?.organizations?.[0]?.name || 'Your Organization';
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  if (!user) return null;

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`dash-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="dash-sidebar-top">
          <div className="dash-org-badge">
            <div className="dash-org-icon"><Building2 size={16} /></div>
            {!sidebarCollapsed && <span className="dash-org-name">{orgName}</span>}
          </div>
          <button
            className="dash-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronRight size={14} className={sidebarCollapsed ? '' : 'rotate-180'} />
          </button>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`dash-nav-item${activeSection === item.id ? ' active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <button
            className={`dash-nav-item${activeSection === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button className="dash-nav-item logout" onClick={handleLogout}>
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <h1 className="dash-page-title">
              {navItems.find(n => n.id === activeSection)?.label || 'Settings'}
            </h1>
          </div>
          <div className="dash-topbar-right">
            <div className="dash-user-chip">
              <div className="dash-user-avatar">{initials}</div>
              {user.name && <span className="dash-user-name">{user.name}</span>}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="dash-content">
          {activeSection === 'connect' && <ConnectCardsSection />}
          {activeSection === 'roles' && <RolesSection />}
          {activeSection === 'billing' && <BillingSection />}
          {activeSection === 'settings' && (
            <div className="dash-placeholder">
              <div className="dash-placeholder-icon"><Settings size={40} /></div>
              <h2>Settings</h2>
              <p>Manage organization settings and preferences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Connect Cards (Plaid) ── */
function ConnectCardsSection() {
  const [items, setItems] = useState<PlaidItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState('');

  // Load existing connected accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch(`${API_BASE}/plaid/accounts`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success) setItems(data.items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // Plaid Link
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
            ...getAuthHeaders(),
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

  // Auto-open Plaid Link once token is ready
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/plaid/create-link-token`, {
        method: 'POST',
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
          <h2>Connect Cards &amp; Accounts</h2>
          <p className="dash-section-sub">
            Link your bank accounts and credit cards via Plaid to automatically import transactions.
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

/* ── Roles ── */
function RolesSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`${API_BASE}/organizations/members`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load members');
        setMembers(data.members);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const avatarColors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  return (
    <>
      <div className="dash-section-header">
        <div>
          <h2>Roles</h2>
          <p className="dash-section-sub">
            Manage who has access to your organization and their permissions.
          </p>
        </div>
        <button className="dash-btn-primary"><Plus size={14} /> Invite Member</button>
      </div>

      <div className="dash-card">
        {loading ? (
          <div className="dash-roles-state">
            <Loader2 size={20} className="dash-spinner" />
            <span>Loading members…</span>
          </div>
        ) : error ? (
          <div className="dash-roles-state error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="dash-roles-state">
            <span>No members found.</span>
          </div>
        ) : (
          <div className="dash-team-list">
            {members.map((m, i) => (
              <div key={m.id} className="dash-team-row">
                <div className="dash-team-left">
                  <div
                    className="dash-team-avatar"
                    style={{ background: avatarColors[i % avatarColors.length] }}
                  >
                    {getInitials(m.user.name, m.user.email)}
                  </div>
                  <div>
                    <div className="dash-team-name">{m.user.name || m.user.email}</div>
                    <div className="dash-team-email">{m.user.email}</div>
                  </div>
                </div>
                <div className="dash-team-right">
                  <span className={`dash-role-badge ${m.role.toLowerCase()}`}>{m.role}</span>
                  <button className="dash-icon-btn small"><Settings size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Billing ── */
function BillingSection() {
  return (
    <>
      <div className="dash-section-header">
        <div>
          <h2>Subscription &amp; Billing</h2>
          <p className="dash-section-sub">Manage your plan and payment details.</p>
        </div>
      </div>

      <div className="dash-grid-2col">
        <div className="dash-card">
          <div className="dash-plan-header">
            <div>
              <span className="dash-plan-badge">Current Plan</span>
              <h3 className="dash-plan-name">Tally Pro</h3>
            </div>
            <div className="dash-plan-price">
              <span className="dash-plan-amount">$49</span>
              <span className="dash-plan-period">/month</span>
            </div>
          </div>
          <div className="dash-plan-features">
            <div className="dash-plan-feature">Unlimited expense tracking</div>
            <div className="dash-plan-feature">AI receipt scanning</div>
            <div className="dash-plan-feature">Statement matching</div>
            <div className="dash-plan-feature">Team management</div>
            <div className="dash-plan-feature">Priority support</div>
          </div>
          <button className="dash-btn-outline full-width">Manage Plan</button>
        </div>

        <div className="dash-card">
          <h3 className="dash-card-title">Payment Method</h3>
          <div className="dash-payment-card">
            <CreditCard size={20} />
            <div>
              <div className="dash-payment-name">Visa ending in 4821</div>
              <div className="dash-payment-exp">Expires 08/2027</div>
            </div>
          </div>

          <h3 className="dash-card-title" style={{ marginTop: 24 }}>Next Invoice</h3>
          <div className="dash-invoice-row">
            <div>
              <div className="dash-invoice-date">March 1, 2026</div>
              <div className="dash-invoice-desc">Monthly subscription</div>
            </div>
            <span className="dash-invoice-amount">$49.00</span>
          </div>
          <button className="dash-btn-outline full-width" style={{ marginTop: 16 }}>
            Billing History
          </button>
        </div>
      </div>
    </>
  );
}
