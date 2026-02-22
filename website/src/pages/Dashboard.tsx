import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  LogOut,
  Building2,
  ChevronRight,
  Settings,
  Pencil,
  Plus,
  CreditCard,
} from 'lucide-react';
import logo from '../assets/logo.png';
import type { OrgInfo } from '../utils/dashboardApi';
import EditOrgModal from '../components/EditOrgModal';
import CreateOrgForm from '../components/CreateOrgForm';
import ConnectCardsSection from '../components/ConnectCardsSection';
import RolesSection from '../components/RolesSection';
import '../css/Dashboard.css';

const FAVICON_URL = '/favicon.png';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

interface User {
  id: string;
  name: string;
  email: string;
  organizations?: OrgInfo[];
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
          {!sidebarCollapsed && (
            <div className="dash-sidebar-user">
              <div className="dash-user-avatar">{initials}</div>
              {user.name && <span className="dash-user-name">{user.name}</span>}
            </div>
          )}
          {sidebarCollapsed && (
            <div className="dash-sidebar-user collapsed" title={user.name || undefined}>
              <div className="dash-user-avatar">{initials}</div>
            </div>
          )}
          <button className="dash-sidebar-user logout" onClick={logout} title={sidebarCollapsed ? 'Log Out' : undefined}>
            <div className="dash-logout-icon"><LogOut size={14} /></div>
            {!sidebarCollapsed && <span className="dash-user-name">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="dash-main">
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
            {selectedOrg && !showCreateOrg && (
              <button
                className="dash-icon-btn"
                onClick={() => setShowEditOrg(true)}
                title="Edit organization"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        </header>

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

              {activeTab === 'cards' && <ConnectCardsSection orgId={selectedOrg.id} />}
              {activeTab === 'roles' && <RolesSection orgId={selectedOrg.id} orgName={selectedOrg.name} />}

              {showEditOrg && (
                <EditOrgModal
                  org={selectedOrg}
                  onClose={() => setShowEditOrg(false)}
                  onSaved={(updatedOrg) => {
                    setShowEditOrg(false);
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
