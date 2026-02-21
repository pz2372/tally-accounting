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
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import './Dashboard.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

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
  { id: 'organizations', label: 'Organizations', icon: <Building2 size={18} /> },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('connect');
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
        // Merge server user with stored org info (server /me may not include org)
        const stored = localStorage.getItem('user');
        const storedUser = stored ? JSON.parse(stored) : {};
        setUser({ ...storedUser, ...data.user });
      })
      .catch(() => {
        // Network error — fall back to stored user rather than logging out
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/login'); return; }
        try { setUser(JSON.parse(stored)); } catch { navigate('/login'); }
      });
  }, [navigate, logout]);

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
          {activeSection === 'roles' && <RolesSection user={user} />}
          {activeSection === 'organizations' && <OrganizationsSection user={user} setUser={setUser} />}
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

/* ── Organizations ── */
function OrganizationsSection({ user, setUser }: { user: User; setUser: (u: User) => void }) {
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDBA, setOrgDBA] = useState('');
  const [orgEIN, setOrgEIN] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const orgs = user.organizations || [];

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
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
      const updatedOrgs = [...orgs, { id: newOrg.id, name: newOrg.name, role: 'ADMIN' }];
      const updatedUser = { ...user, organizations: updatedOrgs };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setOrgName('');
      setOrgDBA('');
      setOrgEIN('');
      setCreating(false);
      setSuccess(`"${newOrg.name}" created successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="dash-section-header">
        <div>
          <h2>Organizations</h2>
          <p className="dash-section-sub">
            Manage your organizations or create a new one.
          </p>
        </div>
        {!creating && (
          <button className="dash-btn-primary" onClick={() => { setCreating(true); setError(''); setSuccess(''); }}>
            <Plus size={14} /> New Organization
          </button>
        )}
      </div>

      {error && (
        <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16, padding: '12px 16px' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {success && (
        <div className="dash-org-success">
          <CheckCircle2 size={16} />{success}
        </div>
      )}

      {creating && (
        <div className="dash-card" style={{ marginBottom: 20 }}>
          <h3 className="dash-card-title">Create Organization</h3>
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
              placeholder="DBA (optional)"
              value={orgDBA}
              onChange={(e) => setOrgDBA(e.target.value)}
              disabled={submitting}
            />
            <input
              type="text"
              className="dash-org-input"
              placeholder="EIN (optional)"
              value={orgEIN}
              onChange={(e) => setOrgEIN(e.target.value)}
              disabled={submitting}
            />
            <div className="dash-org-form-actions">
              <button
                className="dash-btn-outline"
                onClick={() => { setCreating(false); setOrgName(''); setOrgDBA(''); setOrgEIN(''); setError(''); }}
                disabled={submitting}
              >
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
      )}

      {orgs.length === 0 ? (
        <div className="dash-connect-empty">
          <div className="dash-connect-empty-icon"><Building2 size={40} /></div>
          <h3>No organizations yet</h3>
          <p>Create an organization to start managing expenses, team members, and more.</p>
          {!creating && (
            <button className="dash-btn-primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> Create Organization
            </button>
          )}
        </div>
      ) : (
        <div className="dash-org-list">
          {orgs.map((org, i) => (
            <div key={org.id} className="dash-org-card">
              <div className="dash-org-card-left">
                <div className="dash-org-card-icon" style={{ background: ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][i % 6] }}>
                  <Building2 size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="dash-org-card-name">{org.name}</div>
                  {(org as any).dba && <div className="dash-org-card-detail">DBA: {(org as any).dba}</div>}
                  {(org as any).ein && <div className="dash-org-card-detail">EIN: {(org as any).ein}</div>}
                  <div className="dash-org-card-id">ID: {org.id.slice(0, 8)}…</div>
                </div>
              </div>
              <span className={`dash-role-badge ${org.role.toLowerCase()}`}>{org.role}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Roles ── */
interface RoleUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  id: string;
  role: string;
  permissions: string[];
  orgId?: string;
}

interface OrgWithMembers {
  id: string;
  name: string;
  members: RoleUser[];
}

function RolesSection({ user }: { user: User }) {
  const [orgMembers, setOrgMembers] = useState<OrgWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [saving, setSaving] = useState(false);

  const userOrgs = user?.organizations || [];

  useEffect(() => {
    const fetchOrgMembers = async () => {
      try {
        setLoading(true);
        const orgData: OrgWithMembers[] = [];

        for (const org of userOrgs) {
          const res = await fetch(`${API_BASE}/organizations/members`, {
            headers: {
              ...getAuthHeaders(),
              'x-org-id': org.id,
            },
          });
          const data = await res.json();
          if (res.ok) {
            orgData.push({
              id: org.id,
              name: org.name,
              members: data.members || [],
            });
          }
        }

        setOrgMembers(orgData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    if (userOrgs.length > 0) {
      fetchOrgMembers();
    } else {
      setLoading(false);
    }
  }, [userOrgs]);

  const handleInvite = async (orgId: string) => {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-org-id': orgId,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite member');

      setOrgMembers(prev =>
        prev.map(org =>
          org.id === orgId
            ? { ...org, members: [...org.members, data.membership] }
            : org
        )
      );
      setInviting(null);
      setInviteEmail('');
      setInviteRole('EMPLOYEE');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async (orgId: string, memberId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/organizations/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          'x-org-id': orgId,
        },
        body: JSON.stringify({ role: editRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update member');

      setOrgMembers(prev =>
        prev.map(org =>
          org.id === orgId
            ? {
                ...org,
                members: org.members.map(m =>
                  m.id === memberId ? { ...m, role: editRole } : m
                ),
              }
            : org
        )
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
          <h2>Roles</h2>
          <p className="dash-section-sub">
            Manage team members and their roles across your organizations.
          </p>
        </div>
      </div>

      {error && (
        <div className="dash-roles-state error" style={{ justifyContent: 'flex-start', marginBottom: 16, padding: '12px 16px' }}>
          <AlertCircle size={16} />{error}
        </div>
      )}

      {loading ? (
        <div className="dash-roles-state">
          <Loader2 size={20} className="dash-spinner" />
          <span>Loading team members…</span>
        </div>
      ) : userOrgs.length === 0 ? (
        <div className="dash-roles-state">
          <span>No organizations yet. Create one to manage team members.</span>
        </div>
      ) : orgMembers.length === 0 ? (
        <div className="dash-roles-state">
          <span>No organizations with members found.</span>
        </div>
      ) : (
        <div className="dash-orgs-roles-grid">
          {orgMembers.map((org) => (
            <div key={org.id} className="dash-org-members-card">
              <div className="dash-org-members-header">
                <h3>{org.name}</h3>
                {inviting !== org.id && (
                  <button
                    className="dash-btn-primary"
                    onClick={() => {
                      setInviting(org.id);
                      setInviteEmail('');
                      setInviteRole('EMPLOYEE');
                    }}
                    style={{ padding: '8px 14px' }}
                  >
                    <Plus size={12} /> Add Role
                  </button>
                )}
              </div>

              {inviting === org.id && (
                <div className="dash-invite-form">
                  <input
                    type="email"
                    className="dash-org-input"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={saving}
                  />
                  <select
                    className="dash-org-input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    disabled={saving}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="dash-invite-actions">
                    <button
                      className="dash-btn-outline"
                      onClick={() => setInviting(null)}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      className="dash-btn-primary"
                      onClick={() => handleInvite(org.id)}
                      disabled={saving || !inviteEmail.trim()}
                    >
                      {saving ? <Loader2 size={12} className="dash-spinner" style={{ marginRight: 4 }} /> : null}
                      Invite
                    </button>
                  </div>
                </div>
              )}

              {org.members.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                  No members yet
                </div>
              ) : (
                <div className="dash-team-list">
                  {org.members.map((m, i) => (
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
                        {editingMemberId === m.id ? (
                          <>
                            <select
                              className="dash-role-select"
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              disabled={saving}
                            >
                              <option value="EMPLOYEE">Employee</option>
                              <option value="MANAGER">Manager</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <button
                              className="dash-icon-btn small"
                              onClick={() => handleEditRole(org.id, m.id)}
                              disabled={saving}
                              title="Save"
                            >
                              {saving ? <Loader2 size={14} className="dash-spinner" /> : <CheckCircle2 size={14} />}
                            </button>
                            <button
                              className="dash-icon-btn small"
                              onClick={() => setEditingMemberId(null)}
                              disabled={saving}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`dash-role-badge ${m.role.toLowerCase()}`}>{m.role}</span>
                            <button
                              className="dash-icon-btn small"
                              onClick={() => {
                                setEditingMemberId(m.id);
                                setEditRole(m.role);
                              }}
                              title="Edit role"
                            >
                              <Settings size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
