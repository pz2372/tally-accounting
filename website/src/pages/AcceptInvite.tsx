import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import '../css/AcceptInvite.css';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '') + '/api';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setInvalidReason('No invite token provided');
      setValidating(false);
      return;
    }

    fetch(`${API_BASE}/auth/invite/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEmail(data.email);
          setOrgName(data.orgName);
          setIsExistingUser(data.isExistingUser || false);
        } else {
          setInvalidReason(data.error || 'Invalid invite link');
        }
      })
      .catch(() => {
        setInvalidReason('Failed to validate invite link');
      })
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="invite-card glass-card">
            <div className="invite-loading">
              <Loader2 size={24} className="spin" />
              <span>Validating invite...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (invalidReason) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="invite-card glass-card">
            <div className="invite-invalid">
              <AlertCircle size={40} />
              <h2>Invalid Invite</h2>
              <p>{invalidReason}</p>
              <Link to="/login" className="btn btn-glow invite-btn">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-container">
        <div className="invite-card glass-card">
          <div className="invite-badge">
            <CheckCircle2 size={16} />
            You've been invited to <strong>{orgName}</strong>
          </div>

          <h1 className="invite-title">{isExistingUser ? 'Join ' + orgName : 'Set up your account'}</h1>
          <p className="invite-subtitle">{isExistingUser ? 'Enter your password to join ' + orgName + ' on Tally' : 'Create a password to join ' + orgName + ' on Tally'}</p>

          {error && <div className="invite-error">{error}</div>}

          <form onSubmit={handleSubmit} className="invite-form">
            <div className="form-group">
              <label className="form-label" htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                type="email"
                className="form-input"
                value={email}
                disabled
              />
            </div>

            {!isExistingUser && (
              <div className="form-group">
                <label className="form-label" htmlFor="invite-name">Full Name</label>
                <input
                  id="invite-name"
                  type="text"
                  className="form-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="invite-password">Password</label>
              <div className="input-with-icon">
                <input
                  id="invite-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-glow invite-btn"
              disabled={loading || !password}
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <>
                  {isExistingUser ? 'Join' : 'Create Account & Join'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {!isExistingUser && (
            <p className="invite-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="invite-link">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
