import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';
import './Navbar.css';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const location = useLocation();
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 80 && y > lastScrollY.current);
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`navbar ${hidden ? 'navbar-hidden' : ''}`}>
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <img src={logo} alt="Tally" className="navbar-logo" />
        </Link>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>

          <Link
            to="/login"
            className="btn btn-primary nav-cta"
            onClick={() => setMobileOpen(false)}
          >
           Login
          </Link>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
