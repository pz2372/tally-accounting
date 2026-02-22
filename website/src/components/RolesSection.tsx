import { useState, useEffect } from 'react';
import {
  Users,
  Settings,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../utils/dashboardApi';

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

const avatarColors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

export default function RolesSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [members, setMembers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState('EMPLOYEE');
  const [editingMember, setEditingMember] = useState<RoleUser | null>(null);
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
      setEditingMember(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
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

      {/* Create Role Modal */}
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

      {/* Edit Role Modal */}
      {editingMember && (
        <div className="dash-modal-overlay" onClick={() => !saving && setEditingMember(null)}>
          <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-modal-header">
              <h3>Edit Role</h3>
              <button
                className="dash-modal-close"
                onClick={() => !saving && setEditingMember(null)}
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
                  value={editingMember.user.email}
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
                onClick={() => setEditingMember(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="dash-btn-primary"
                onClick={() => handleSaveEdit(editingMember.id)}
                disabled={saving}
              >
                {saving ? <Loader2 size={14} className="dash-spinner" /> : <CheckCircle2 size={14} />}
                {saving ? 'Saving…' : 'Save Changes'}
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
                      setEditingMember(m);
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
    </>
  );
}
