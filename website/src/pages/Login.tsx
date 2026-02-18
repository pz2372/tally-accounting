import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import './Login.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      // Use Firebase REST API to sign in
      const firebaseRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${import.meta.env.VITE_FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const firebaseData = await firebaseRes.json();

      if (!firebaseRes.ok) {
        const code = firebaseData?.error?.message || '';
        if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
          throw new Error('Invalid email or password');
        }
        if (code.includes('INVALID_PASSWORD')) {
          throw new Error('Invalid email or password');
        }
        if (code.includes('USER_DISABLED')) {
          throw new Error('This account has been disabled');
        }
        throw new Error('Authentication failed');
      }

      const firebaseToken = firebaseData.idToken;

      // Exchange Firebase token for server access token
      const serverRes = await fetch(`${API_BASE}/auth/firebase-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseToken }),
      });

      const serverData = await serverRes.json();

      if (!serverRes.ok) {
        throw new Error(serverData.error || 'Server authentication failed');
      }

      // Store tokens and user data
      localStorage.setItem('accessToken', serverData.accessToken);
      localStorage.setItem('user', JSON.stringify(serverData.user));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card glass-card">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your Tally account</p>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  disabled={loading}
                  autoComplete="current-password"
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
              className="btn btn-glow login-btn"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <Loader2 size={18} className="spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="login-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
