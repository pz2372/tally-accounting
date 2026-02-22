import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  LogOut,
  Building2,
  ChevronRight,
  Settings,
  Link2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Landmark,
  ShieldCheck,
  X,
  CreditCard,
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import logo from '../assets/logo.png';
import './Dashboard.css';

const FAVICON_URL = '/favicon.png';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

function getAuthHeaders(orgId?: string): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (orgId) {
    headers['x-org-id'] = orgId;
  } else {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const firstOrgId = user?.organizations?.[0]?.id;
      if (firstOrgId) headers['x-org-id'] = firstOrgId;
    } catch { /* ignore */ }
  }
  return headers;
}

interface User {
  id: string;
  name: string;
  email: string;
  organizations?: OrgInfo[];
}

interface OrgInfo {
  id: string;
  name: string;
  role: string;
  dba?: string;
  ein?: string;
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

type OrgTab = 'cards' | 'roles';

const ORG_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrgTab>('cards');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showEditOrg, setShowEditOrg] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  // Validate session against server on load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          logout();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        const stored = localStorage.getItem('user');
        const storedUser = stored ? JSON.parse(stored) : {};
        const merged = { ...storedUser, ...data.user };
        setUser(merged);
        // Auto-select first org
        if (merged.organizations?.length && !selectedOrgId) {
          setSelectedOrgId(merged.organizations[0].id);
        }
      })
      .catch(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/login'); return; }
        try {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (parsed.organizations?.length && !selectedOrgId) {
            setSelectedOrgId(parsed.organizations[0].id);
          }
        } catch { navigate('/login'); }
      });
  }, [navigate, logout]);

  const orgs = user?.organizations || [];
  const selectedOrg = orgs.find(o => o.id === selectedOrgId);
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleOrgCreated = (newOrg: OrgInfo) => {
    const updatedOrgs = [...orgs, newOrg];
    const updatedUser = { ...user!, organizations: updatedOrgs };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setSelectedOrgId(newOrg.id);
    setShowCreateOrg(false);
    setActiveTab('cards');
  };

  if (!user) return null;

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`dash-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="dash-sidebar-top">
          <div className="dash-logo-container">
            {sidebarCollapsed ? (
              <img src={FAVICON_URL} alt="Tally" className="dash-favicon" />
            ) : (
              <img src={logo} alt="Tally" className="dash-logo" />
            )}
          </div>
          <button
            className="dash-collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronRight size={14} className={sidebarCollapsed ? '' : 'rotate-180'} />
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="dash-sidebar-label">Organizations</div>
        )}

        <nav className="dash-nav">
          {orgs.map((org, i) => (
            <button
              key={org.id}
              className={`dash-nav-item${selectedOrgId === org.id && !showCreateOrg ? ' active' : ''}`}
              onClick={() => { setSelectedOrgId(org.id); setShowCreateOrg(false); }}
              title={sidebarCollapsed ? (org.dba || org.name) : undefined}
            >
              <div
                className="dash-nav-org-dot"
                style={{ background: ORG_COLORS[i % ORG_COLORS.length] }}
              >
                {(org.dba || org.name)[0].toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="dash-nav-org-text">
                  <span className="dash-nav-org-primary">{org.dba || org.name}</span>
                  {org.dba && <span className="dash-nav-org-secondary">{org.name}</span>}
                </div>
              )}
            </button>
          ))}
          <button
            className={`dash-nav-item dash-nav-add${showCreateOrg ? ' active' : ''}`}
            onClick={() => setShowCreateOrg(true)}
          >
            <Plus size={18} />
            {!sidebarCollapsed && <span>Add Organization</span>}
          </button>
        </nav>

        <div className="dash-sidebar-bottom">
          <button className="dash-nav-item" onClick={() => { /* settings placeholder */ }}>
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button className="dash-nav-item logout" onClick={logout}>
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
            {showCreateOrg ? (
              <div>
                <h1 className="dash-page-title">New Organization</h1>
              </div>
            ) : selectedOrg ? (
              <div className="dash-topbar-title-group">
                <h1 className="dash-page-title">{selectedOrg.dba || selectedOrg.name}</h1>
                {selectedOrg.dba && <p className="dash-page-subtitle">{selectedOrg.name}</p>}
              </div>
            ) : null}
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
          {showCreateOrg ? (
            <CreateOrgForm
              onCreated={handleOrgCreated}
              onCancel={() => {
                setShowCreateOrg(false);
                if (!selectedOrgId && orgs.length) setSelectedOrgId(orgs[0].id);
              }}
            />
          ) : selectedOrg ? (
            <>
              {/* Org sub-tabs and edit button */}
              <div className="dash-org-header">
                <div className="dash-org-tabs">
                  <button
                    className={`dash-org-tab${activeTab === 'cards' ? ' active' : ''}`}
                    onClick={() => setActiveTab('cards')}
                  >
                    <CreditCard size={16} />
                    Cards & Accounts
                  </button>
                  <button
                    className={`dash-org-tab${activeTab === 'roles' ? ' active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                  >
                    <Users size={16} />
                    Team & Roles
                  </button>
                </div>
                <button
                  className="dash-icon-btn"
                  onClick={() => setShowEditOrg(true)}
                  title="Edit organization"
                >
                  <Settings size={18} />
                </button>
              </div>

              {activeTab === 'cards' && (
                <ConnectCardsSection orgId={selectedOrg.id} />
              )}
              {activeTab === 'roles' && (
                <RolesSection orgId={selectedOrg.id} orgName={selectedOrg.name} />
              )}

              {showEditOrg && (
                <EditOrgModal
                  org={selectedOrg}
                  onClose={() => setShowEditOrg(false)}
                  onSaved={(updatedOrg) => {
                    setShowEditOrg(false);
                    // Update org in user's organizations list
                    const updated = user!.organizations!.map(o =>
                      o.id === selectedOrg.id ? { ...o, ...updatedOrg } : o
                    );
                    const updatedUser = { ...user!, organizations: updated };
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                  }}
                />
              )}
            </>
          ) : orgs.length === 0 ? (
            <div className="dash-connect-empty">
              <div className="dash-connect-empty-icon"><Building2 size={40} /></div>
              <h3>No organizations yet</h3>
              <p>Create an organization to start managing expenses, team members, and card connections.</p>
              <button className="dash-btn-primary" onClick={() => setShowCreateOrg(true)}>
                <Plus size={14} /> Create Organization
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Edit Organization Modal ── */
function EditOrgModal({
  org,
  onClose,
  onSaved,
}: {
  org: OrgInfo;
  onClose: () => void;
  onSaved: (org: Partial<OrgInfo>) => void;
}) {
  const [name, setName] = useState(org.name);
  const [dba, setDba] = useState(org.dba || '');
  const [ein, setEin] = useState(org.ein || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(org.id),
        },
        body: JSON.stringify({
          name: name.trim(),
          dba: dba.trim() || undefined,
          ein: ein.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update organization');

      onSaved({
        id: org.id,
        name: data.organization.name,
        dba: data.organization.dba,
        ein: data.organization.ein,
        role: org.role,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dash-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dash-modal-header">
          <h3>Edit Organization</h3>
          <button className="dash-modal-close" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <div className="dash-modal-content">
          {error && (
            <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
              <AlertCircle size={16} />{error}
            </div>
          )}
          <div className="dash-form-group">
            <label className="dash-form-label">Organization Name</label>
            <input
              type="text"
              className="dash-org-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">DBA — Doing Business As</label>
            <input
              type="text"
              className="dash-org-input"
              placeholder="Optional"
              value={dba}
              onChange={(e) => setDba(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="dash-form-group">
            <label className="dash-form-label">EIN — Employer Identification Number</label>
            <input
              type="text"
              className="dash-org-input"
              placeholder="Optional"
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        <div className="dash-modal-footer">
          <button className="dash-btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="dash-btn-primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <Loader2 size={14} className="dash-spinner" /> : <CheckCircle2 size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Create Organization Form ── */
function CreateOrgForm({ onCreated, onCancel }: { onCreated: (org: OrgInfo) => void; onCancel: () => void }) {
  const [orgName, setOrgName] = useState('');
  const [orgDBA, setOrgDBA] = useState('');
  const [orgEIN, setOrgEIN] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: orgName.trim(),
          dba: orgDBA.trim() || undefined,
          ein: orgEIN.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create organization');

      const newOrg = data.organization;
      onCreated({ id: newOrg.id, name: newOrg.name, role: 'ADMIN', dba: newOrg.dba, ein: newOrg.ein });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dash-create-org-wrapper">
      <div className="dash-card" style={{ maxWidth: 520 }}>
        <h3 className="dash-card-title">Create Organization</h3>

        {error && (
          <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16, padding: '12px 16px' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}

        <div className="dash-org-form">
          <input
            type="text"
            className="dash-org-input"
            placeholder="Organization name (required)"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            disabled={submitting}
          />
          <input
            type="text"
            className="dash-org-input"
            placeholder="DBA — Doing Business As (optional)"
            value={orgDBA}
            onChange={(e) => setOrgDBA(e.target.value)}
            disabled={submitting}
          />
          <input
            type="text"
            className="dash-org-input"
            placeholder="EIN — Employer Identification Number (optional)"
            value={orgEIN}
            onChange={(e) => setOrgEIN(e.target.value)}
            disabled={submitting}
          />
          <div className="dash-org-form-actions">
            <button className="dash-btn-outline" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button
              className="dash-btn-primary"
              onClick={handleCreate}
              disabled={submitting || !orgName.trim()}
            >
              {submitting ? <><Loader2 size={14} className="dash-spinner" /> Creating…</> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Connect Cards (Plaid) — now org-scoped ── */
function ConnectCardsSection({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<PlaidItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState('');

  // Load existing connected accounts for this org
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

  // Auto-open Plaid Link once token is ready
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

/* ── Roles — now single-org scoped ── */
interface RoleUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  id: string;
  role: string;
  permissions: string[];
}

function RolesSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [members, setMembers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState('EMPLOYEE');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchMembers = async () => {
      setLoading(true);
      setMembers([]);
      try {
        const res = await fetch(`${API_BASE}/organizations/members`, {
          headers: getAuthHeaders(orgId),
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setMembers(data.members || []);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMembers();
    return () => { cancelled = true; };
  }, [orgId]);

  const handleCreateRole = async () => {
    if (!createEmail.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/organizations/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(orgId),
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          role: createRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create role');

      setMembers(prev => [...prev, data.membership]);
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateRole('EMPLOYEE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (memberId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(orgId),
        },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      setMembers(prev =>
        prev.map(m => m.id === memberId ? { ...m, role: editRole } : m)
      );
      setEditingMemberId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const avatarColors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  return (
    <>
      <div className="dash-section-header">
        <div>
          <h2>Team & Roles</h2>
          <p className="dash-section-sub">
            Manage team members and their roles for {orgName}.
          </p>
        </div>
        <button
          className="dash-btn-primary"
          onClick={() => { setShowCreateModal(true); setCreateEmail(''); setCreateRole('EMPLOYEE'); }}
        >
          <Plus size={14} /> Create Role
        </button>
      </div>

      {error && (
        <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16, padding: '12px 16px' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {showCreateModal && (
        <div className="dash-modal-overlay" onClick={() => !saving && setShowCreateModal(false)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Create Role</h3>
              <button
                className="dash-modal-close"
                onClick={() => !saving && setShowCreateModal(false)}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="dash-modal-content">
              <div className="dash-form-group">
                <label className="dash-form-label">Email Address</label>
                <input
                  type="email"
                  className="dash-org-input"
                  placeholder="name@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  autoFocus
                  disabled={saving}
                />
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Role</label>
                <select
                  className="dash-org-input"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  disabled={saving}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="dash-modal-footer">
              <button
                className="dash-btn-outline"
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="dash-btn-primary"
                onClick={handleCreateRole}
                disabled={saving || !createEmail.trim()}
              >
                {saving ? <Loader2 size={14} className="dash-spinner" /> : <Plus size={14} />}
                {saving ? 'Creating…' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dash-roles-state">
          <Loader2 size={20} className="dash-spinner" />
          <span>Loading team members…</span>
        </div>
      ) : members.length === 0 ? (
        <div className="dash-connect-empty">
          <div className="dash-connect-empty-icon"><Users size={40} /></div>
          <h3>No team members</h3>
          <p>Create a role to add team members to this organization.</p>
          <button className="dash-btn-primary" onClick={() => { setShowCreateModal(true); setCreateEmail(''); setCreateRole('EMPLOYEE'); }}>
            <Plus size={14} /> Create Role
          </button>
        </div>
      ) : (
        <div className="dash-card">
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
                  <button
                    className="dash-icon-btn small"
                    onClick={() => {
                      setEditingMemberId(m.id);
                      setEditEmail(m.user.email);
                      setEditRole(m.role);
                    }}
                    title="Edit"
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingMemberId && (
        <div className="dash-modal-overlay" onClick={() => !saving && setEditingMemberId(null)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Role</h3>
              <button
                className="dash-modal-close"
                onClick={() => !saving && setEditingMemberId(null)}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="dash-modal-content">
              <div className="dash-form-group">
                <label className="dash-form-label">Email Address</label>
                <input
                  type="email"
                  className="dash-org-input"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={true}
                />
                <p className="dash-form-hint">Email cannot be changed</p>
              </div>
              <div className="dash-form-group">
                <label className="dash-form-label">Role</label>
                <select
                  className="dash-org-input"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={saving}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="dash-modal-footer">
              <button
                className="dash-btn-outline"
                onClick={() => setEditingMemberId(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="dash-btn-primary"
                onClick={() => handleSaveEdit(editingMemberId)}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="dash-spinner" /> : <CheckCircle2 size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
