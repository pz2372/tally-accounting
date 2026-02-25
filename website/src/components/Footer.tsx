import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../css/Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      {/* Top glow line */}
      <div className="footer-glow-line" />

      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src={logo} alt="Tally" className="footer-logo-img" />
        
            </Link>
            <p>
              Smart expense tracking & receipt management for restaurants and
              small businesses.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Tally. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
