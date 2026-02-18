import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  Receipt,
  CreditCard,
  BarChart3,
  Shield,
  Zap,
  Users,
  ArrowRight,
  Sparkles,
  Camera,
  FileCheck,
  CheckCircle2,
  FileText,
  RefreshCw,
  TrendingUp,
  ClipboardList,
  Plus,
  Calendar,
  Search,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Home as HomeIcon,
  FolderOpen,
  List,
} from 'lucide-react';
import Phone3D from '../components/Phone3D';
import './Home.css';

/* ── Phone mock screens ───────────────── */
function DashboardScreen() {
  return (
    <div className="mock-dashboard">
      <div className="mock-header">
        <div>
          <div className="mock-greeting">Welcome Back</div>
          <div className="mock-name">Joe's Pizza</div>
        </div>
        <div className="mock-avatar">JS</div>
      </div>
      <div className="mock-finance-card">
        <div className="mock-finance-label">Net Sales</div>
        <div className="mock-finance-value">$24,765</div>
        <div className="mock-finance-period">February 2026</div>
        <div className="mock-finance-stats">
          <div className="mock-finance-stat">
            <div className="mock-finance-stat-label">Gross Sales</div>
            <div className="mock-finance-stat-val">$37,245</div>
          </div>
          <div className="mock-finance-stat-divider" />
          <div className="mock-finance-stat">
            <div className="mock-finance-stat-label">Expenses</div>
            <div className="mock-finance-stat-val">$12,480</div>
          </div>
        </div>
      </div>
      <div className="mock-quick-actions">
        <div className="mock-quick-btn">
          <div className="mock-quick-icon"><FileText size={16} /></div>
          <div className="mock-quick-label">Statements</div>
        </div>
        <div className="mock-quick-btn">
          <div className="mock-quick-icon"><RefreshCw size={16} /></div>
          <div className="mock-quick-label">Recurring</div>
        </div>
        <div className="mock-quick-btn">
          <div className="mock-quick-icon"><TrendingUp size={16} /></div>
          <div className="mock-quick-label">Sales</div>
        </div>
      </div>
      <div className="mock-action-row">
        <div className="mock-action-icon" style={{ color: '#3B82F6' }}><Plus size={16} /></div>
        <span>New Expense</span>
      </div>
      <div className="mock-action-row">
        <div className="mock-action-icon" style={{ color: '#3B82F6' }}><Plus size={16} /></div>
        <span>New Statement</span>
      </div>
      <div className="mock-receipt-tracking">
        <div className="mock-tracking-title"><ClipboardList size={12} /> Receipt Tracking</div>
        <div className="mock-tracking-stats">
          <div className="mock-tracking-stat">
            <div className="mock-tracking-val matched">18/22</div>
            <div className="mock-tracking-label">Statement Matched</div>
          </div>
          <div className="mock-tracking-divider" />
          <div className="mock-tracking-stat">
            <div className="mock-tracking-val unmatched">4</div>
            <div className="mock-tracking-label">Unmatched</div>
          </div>
        </div>
      </div>
      <MockBottomNav active="home" />
    </div>
  );
}

function MockBottomNav({ active }: { active: string }) {
  return (
    <div className="mock-bottom-nav">
      <div className={`mock-nav-item${active === 'home' ? ' active' : ''}`}>
        <div className="mock-nav-icon-wrap"><HomeIcon size={16} /></div>
        <span>Home</span>
      </div>
      <div className={`mock-nav-item${active === 'category' ? ' active' : ''}`}>
        <div className="mock-nav-icon-wrap"><FolderOpen size={16} /></div>
        <span>Category</span>
      </div>
      <div className={`mock-nav-item${active === 'scan' ? ' active' : ''}`}>
        <div className="mock-nav-icon-wrap"><Camera size={16} /></div>
        <span>Scan</span>
      </div>
      <div className={`mock-nav-item${active === 'expenses' ? ' active' : ''}`}>
        <div className="mock-nav-icon-wrap"><List size={16} /></div>
        <span>Expenses</span>
      </div>
    </div>
  );
}

function ReceiptScreen() {
  return (
    <div className="mock-review-screen">
      <div className="mock-screen-header">
        <span className="mock-back"><ChevronLeft size={16} /></span>
        <span>Review Scan</span>
        <span />
      </div>
      <div className="mock-form">
        <div className="mock-form-field">
          <div className="mock-form-label">Merchant</div>
          <div className="mock-form-input">Sysco Foods Inc.</div>
        </div>
        <div className="mock-form-field">
          <div className="mock-form-label">Amount</div>
          <div className="mock-form-input amount">
            <span className="mock-dollar">$</span>842.50
          </div>
        </div>
        <div className="mock-form-field">
          <div className="mock-form-label">Category</div>
          <div className="mock-form-select">
            <span className="mock-cat-dot" style={{ background: '#10B981' }} />
            Inventory
            <span className="mock-chevron"><ChevronRight size={12} /></span>
          </div>
        </div>
        <div className="mock-form-field">
          <div className="mock-form-label">Payment Method</div>
          <div className="mock-form-select">
            <CreditCard size={12} /> Credit Card
            <span className="mock-chevron"><ChevronRight size={12} /></span>
          </div>
        </div>
        <div className="mock-form-field">
          <div className="mock-form-label">Date</div>
          <div className="mock-form-select">
            <Calendar size={12} /> Feb 14, 2026
            <span className="mock-chevron"><ChevronRight size={12} /></span>
          </div>
        </div>
        <div className="mock-form-field">
          <div className="mock-form-label">Notes</div>
          <div className="mock-form-input dim">Weekly food order</div>
        </div>
      </div>
      <div className="mock-form-actions">
        <div className="mock-btn-secondary">Cancel</div>
        <div className="mock-btn-primary">Save</div>
      </div>
      <MockBottomNav active="scan" />
    </div>
  );
}

function StatementScreen() {
  return (
    <div className="mock-statements-screen">
      <div className="mock-screen-header">
        <span className="mock-back"><ChevronLeft size={16} /></span>
        <span>Statements</span>
        <span className="mock-add"><Plus size={16} /></span>
      </div>
      <div className="mock-month-nav">
        <span className="mock-nav-arrow"><ChevronLeft size={14} /></span>
        <span className="mock-month-label">February 2026</span>
        <span className="mock-nav-arrow dim"><ChevronRight size={14} /></span>
      </div>
      <div className="mock-filter-row">
        <div className="mock-filter active">All</div>
        <div className="mock-filter">Statements</div>
        <div className="mock-filter">Sales</div>
      </div>
      <div className="mock-stmt-grid">
        <div className="mock-stmt-card">
          <div className="mock-stmt-icon"><FileText size={18} color="#3B82F6" /></div>
          <div className="mock-stmt-badge">STATEMENT</div>
          <div className="mock-stmt-name">Chase Visa</div>
          <div className="mock-stmt-info">18/22 matched</div>
          <div className="mock-stmt-status processed">● Processed</div>
        </div>
        <div className="mock-stmt-card">
          <div className="mock-stmt-icon"><DollarSign size={18} color="#10B981" /></div>
          <div className="mock-stmt-badge sales">SALES</div>
          <div className="mock-stmt-name">Daily Sales</div>
          <div className="mock-stmt-info">Feb 14, 2026</div>
          <div className="mock-stmt-status processed">● Processed</div>
        </div>
        <div className="mock-stmt-card">
          <div className="mock-stmt-icon"><FileText size={18} color="#3B82F6" /></div>
          <div className="mock-stmt-badge">STATEMENT</div>
          <div className="mock-stmt-name">Amex Gold</div>
          <div className="mock-stmt-info">5/8 matched</div>
          <div className="mock-stmt-status processing">● Processing</div>
        </div>
      </div>
      <MockBottomNav active="" />
    </div>
  );
}

function TeamScreen() {
  return (
    <div className="mock-expenses-screen">
      <div className="mock-screen-header-flat">
        <div>
          <div className="mock-expenses-title">Expenses</div>
        </div>
        <div className="mock-category-filter">All ▾</div>
      </div>
      <div className="mock-search-row">
        <div className="mock-search-bar">
          <span className="mock-search-icon"><Search size={12} color="#9CA3AF" /></span>
          <span className="mock-search-text">Search expenses...</span>
        </div>
        <div className="mock-cal-btn"><Calendar size={14} color="#64748b" /></div>
      </div>
      <div className="mock-date-group">
        <div className="mock-date-header">WED, FEB 14</div>
        <div className="mock-expense-row">
          <div className="mock-exp-date-col">
            <div className="mock-exp-month">FEB</div>
            <div className="mock-exp-day">14</div>
          </div>
          <div className="mock-exp-details">
            <div className="mock-exp-vendor">Sysco Foods</div>
            <div className="mock-exp-cat" style={{ background: '#10B981' }}>Inventory</div>
          </div>
          <div className="mock-exp-amount">$842.50 ›</div>
        </div>
        <div className="mock-expense-row">
          <div className="mock-exp-date-col">
            <div className="mock-exp-month">FEB</div>
            <div className="mock-exp-day">14</div>
          </div>
          <div className="mock-exp-details">
            <div className="mock-exp-vendor">ConEdison</div>
            <div className="mock-exp-cat" style={{ background: '#F59E0B' }}>Operations</div>
          </div>
          <div className="mock-exp-amount">$385.00 ›</div>
        </div>
      </div>
      <div className="mock-date-group">
        <div className="mock-date-header">TUE, FEB 13</div>
        <div className="mock-expense-row">
          <div className="mock-exp-date-col">
            <div className="mock-exp-month">FEB</div>
            <div className="mock-exp-day">13</div>
          </div>
          <div className="mock-exp-details">
            <div className="mock-exp-vendor">Kitchen Repair</div>
            <div className="mock-exp-cat" style={{ background: '#6B7280' }}>Miscellaneous</div>
          </div>
          <div className="mock-exp-amount">$1,150 ›</div>
        </div>
      </div>
      <MockBottomNav active="expenses" />
    </div>
  );
}

function ReportsScreen() {
  return (
    <div className="mock-sales-report">
      <div className="mock-screen-header">
        <span className="mock-back"><ChevronLeft size={16} /></span>
        <span>Sales Report</span>
        <span />
      </div>
      <div className="mock-month-nav">
        <span className="mock-nav-arrow"><ChevronLeft size={14} /></span>
        <span className="mock-month-label">February 2026</span>
        <span className="mock-nav-arrow dim"><ChevronRight size={14} /></span>
      </div>
      <div className="mock-profit-card">
        <div className="mock-profit-label">NET PROFIT</div>
        <div className="mock-profit-value">$24,765</div>
        <div className="mock-profit-pct">66.5%</div>
      </div>
      <div className="mock-sales-rows">
        <div className="mock-sales-row">
          <span>Gross Sales</span>
          <span>$45,000.00</span>
        </div>
        <div className="mock-sales-row">
          <span>Net Sales</span>
          <span>$37,245.50</span>
        </div>
      </div>
      <div className="mock-expenses-breakdown">
        <div className="mock-sales-row bold">
          <span>Expenses</span>
          <span>$12,480.50</span>
        </div>
        <div className="mock-cat-breakdown">
          <div className="mock-cat-row">
            <span>Labor</span>
            <span>$4,200 <em>33.6%</em></span>
          </div>
          <div className="mock-cat-row">
            <span>Inventory</span>
            <span>$5,280 <em>42.3%</em></span>
          </div>
          <div className="mock-cat-row">
            <span>Utilities</span>
            <span>$1,850 <em>14.8%</em></span>
          </div>
          <div className="mock-cat-row">
            <span>Other</span>
            <span>$1,150 <em>9.2%</em></span>
          </div>
        </div>
      </div>
      <div className="mock-sales-rows">
        <div className="mock-sales-row">
          <span>Tax</span>
          <span>$3,150.00</span>
        </div>
        <div className="mock-sales-row">
          <span>Tips</span>
          <span>$4,604.50</span>
        </div>
      </div>
      <MockBottomNav active="" />
    </div>
  );
}

/* ── Feature sections data ────────────── */
const featureSections = [
  {
    id: 'dashboard',
    icon: <BarChart3 size={22} />,
    badge: 'Dashboard',
    title: 'Your finances at a glance',
    description:
      'See total expenses, category breakdowns, and recent transactions in real-time. Everything you need on one beautiful dashboard.',
    bullets: [
      'Real-time expense totals with trends',
      'Category breakdown by spending',
      'Recent transaction feed',
    ],
  },
  {
    id: 'receipts',
    icon: <Camera size={22} />,
    badge: 'Receipt Scanning',
    title: 'Snap. Scan. Done.',
    description:
      'Point your camera at any receipt and our OCR engine extracts merchant, amount, date, and category automatically with 96%+ accuracy.',
    bullets: [
      'AI-powered OCR text extraction',
      'Auto-categorization of expenses',
      'Confidence scoring for accuracy',
    ],
  },
  {
    id: 'matching',
    icon: <FileCheck size={22} />,
    badge: 'Statement Matching',
    title: 'Reconcile in seconds',
    description:
      'Upload bank or credit card statements and watch as Tally automatically matches them with scanned receipts. Flag discrepancies instantly.',
    bullets: [
      'Auto-match receipts to transactions',
      'Flag mismatches for review',
      'Support for all major banks',
    ],
  },
  {
    id: 'team',
    icon: <Users size={22} />,
    badge: 'Team Management',
    title: 'Full control over your team',
    description:
      'Invite employees, assign roles, and set granular permissions. Decide exactly who can create, view, edit, or delete expenses.',
    bullets: [
      'Role-based access (Admin / Employee)',
      'Per-user permission toggles',
      'Activity tracking per member',
    ],
  },
  {
    id: 'reports',
    icon: <BarChart3 size={22} />,
    badge: 'Sales & Reports',
    title: 'Data-driven decisions',
    description:
      'Track daily sales from your POS, analyze spending trends, and monitor profit margins with visual reports and breakdowns.',
    bullets: [
      'Daily & weekly sales charts',
      'Revenue vs. expense analysis',
      'Export reports anytime',
    ],
  },
];

function CategoryScreen() {
  const categories = [
    { name: 'Inventory', color: '#10B981', amount: 5280.00, count: 12 },
    { name: 'Operations', color: '#F59E0B', amount: 2340.50, count: 8 },
    { name: 'Labor', color: '#9333EA', amount: 4200.00, count: 6 },
    { name: 'Tax', color: '#EF4444', amount: 1890.00, count: 3 },
    { name: 'Miscellaneous', color: '#6B7280', amount: 1150.00, count: 4 },
    { name: 'Transportation', color: '#3B82F6', amount: 620.00, count: 2 },
  ];
  const total = categories.reduce((s, c) => s + c.amount, 0);
  const expanded = categories[0];
  return (
    <div className="mock-category-screen">
      <div className="mock-cat-screen-header">
        <div className="mock-cat-screen-title">Categories</div>
        <div className="mock-cat-screen-sub">Spending by category</div>
      </div>
      <div className="mock-cat-month-nav">
        <span className="mock-nav-arrow"><ChevronLeft size={14} /></span>
        <span className="mock-cat-month">February 2026</span>
        <span className="mock-nav-arrow dim"><ChevronRight size={14} /></span>
      </div>
      <div className="mock-cat-total-card">
        <div className="mock-cat-total-label">TOTAL EXPENSES</div>
        <div className="mock-cat-total-value">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      <div className="mock-cat-bar">
        {categories.map((c, i) => (
          <div key={i} className="mock-cat-bar-seg" style={{ background: c.color, flex: c.amount }} />
        ))}
      </div>
      <div className="mock-cat-section-title">By Category</div>
      <div className="mock-cat-list">
        {categories.map((c, i) => (
          <div key={i} className={`mock-cat-item${i === 0 ? ' expanded' : ''}`}>
            <div className="mock-cat-item-row">
              <span className="mock-cat-dot" style={{ background: c.color }} />
              <span className="mock-cat-item-name">{c.name}</span>
              <span className="mock-cat-item-amount">${c.amount.toFixed(2)}</span>
              {c.count > 0 && <span className="mock-cat-item-chevron">{i === 0 ? <ChevronRight size={10} style={{ transform: 'rotate(90deg)' }} /> : <ChevronRight size={10} />}</span>}
            </div>
            {i === 0 && (
              <div className="mock-cat-expenses">
                <div className="mock-cat-exp-row">
                  <div className="mock-cat-exp-date"><div className="mock-cat-exp-m">FEB</div><div className="mock-cat-exp-d">14</div></div>
                  <div className="mock-cat-exp-vendor">Sysco Foods</div>
                  <div className="mock-cat-exp-amt">$842.50</div>
                </div>
                <div className="mock-cat-exp-row">
                  <div className="mock-cat-exp-date"><div className="mock-cat-exp-m">FEB</div><div className="mock-cat-exp-d">12</div></div>
                  <div className="mock-cat-exp-vendor">Restaurant Depot</div>
                  <div className="mock-cat-exp-amt">$1,245.00</div>
                </div>
                <div className="mock-cat-exp-row">
                  <div className="mock-cat-exp-date"><div className="mock-cat-exp-m">FEB</div><div className="mock-cat-exp-d">10</div></div>
                  <div className="mock-cat-exp-vendor">US Foods</div>
                  <div className="mock-cat-exp-amt">$967.30</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <MockBottomNav active="category" />
    </div>
  );
}

const heroScreens = [
  { id: 'categories', label: 'Categories', content: <CategoryScreen /> },
];

const phoneScreens = [
  { id: 'dashboard', label: 'Dashboard', content: <DashboardScreen /> },
  { id: 'receipts', label: 'Receipts', content: <ReceiptScreen /> },
  { id: 'matching', label: 'Matching', content: <StatementScreen /> },
  { id: 'team', label: 'Team', content: <TeamScreen /> },
  { id: 'reports', label: 'Reports', content: <ReportsScreen /> },
];

/* ── Animated feature section row ─────── */
function FeatureSection({ feature, index, onVisible }: {
  feature: typeof featureSections[0];
  index: number;
  onVisible: (i: number) => void;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px' });

  useEffect(() => {
    if (isInView) onVisible(index);
  }, [isInView, index, onVisible]);

  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="feature-scroll-section">
      <motion.div
        className="feature-text-block"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        viewport={{ once: false, margin: '-30%' }}
      >
        <div className="feature-badge-pill">
          {feature.icon}
          <span>{feature.badge}</span>
        </div>
        <h2>{feature.title}</h2>
        <p>{feature.description}</p>
        <ul className="feature-bullets">
          {feature.bullets.map((b, i) => (
            <li key={i}>
              <Sparkles size={14} className="bullet-icon" />
              {b}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

/* ── Quick features strip ─────────────── */
const quickFeatures = [
  { icon: <Receipt size={22} />, title: 'Receipt OCR', desc: 'Instant text extraction' },
  { icon: <CreditCard size={22} />, title: 'Auto Matching', desc: 'Statement reconciliation' },
  { icon: <Shield size={22} />, title: 'Permissions', desc: 'Granular access control' },
  { icon: <Zap size={22} />, title: 'Recurring', desc: 'Auto-tracked charges' },
];

/* ── Main Home component ──────────────── */
export default function Home() {
  const [activeScreen, setActiveScreen] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);

  return (
    <>
      {/* ── Animated grid background ── */}
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <motion.section className="hero-dark" ref={heroRef} style={{ opacity: heroOpacity }}>
        <div className="container hero-dark-inner">
          <motion.div className="hero-dark-content" style={{ y: heroY }}>
            <motion.div
              className="hero-pill"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles size={14} />
              Now available on iOS
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              The future of
              <br />
              <span className="gradient-text">expense tracking</span>
            </motion.h1>

            <motion.p
              className="hero-dark-desc"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
            >
              Tally AI helps restaurants and small businesses capture receipts, match
              bank statements, and stay on top of every dollar — all from your phone.
            </motion.p>

            <motion.div
              className="hero-dark-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
            >
              <Link to="/register" className="btn-glow">
                Start Free Trial
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-phone-area"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Phone3D screens={heroScreens} activeIndex={0} />
          </motion.div>
        </div>

        {/* Floating particles */}
        <div className="hero-particles">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`} />
          ))}
        </div>
      </motion.section>

      {/* ── Quick features strip ── */}
      <section className="quick-features-strip">
        <div className="container">
          <div className="quick-grid">
            {quickFeatures.map((f, i) => (
              <motion.div
                key={i}
                className="quick-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="quick-icon">{f.icon}</div>
                <div>
                  <div className="quick-title">{f.title}</div>
                  <div className="quick-desc">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature scroll sections with sticky phone ── */}
      <section className="features-scroll-container">
        <div className="container features-scroll-inner">
          {/* Sticky centered phone */}
          <div className="sticky-phone-col">
            <Phone3D screens={phoneScreens} activeIndex={activeScreen} />
          </div>

          {/* Scrolling text blocks — overlap the phone, alternate sides */}
          <div className="feature-text-col">
            {featureSections.map((f, i) => (
              <FeatureSection
                key={f.id}
                feature={f}
                index={i}
                onVisible={setActiveScreen}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-home" id="pricing">
        <div className="container">
          <motion.div
            className="pricing-home-header"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2>
              Simple, <span className="gradient-text">transparent</span> pricing
            </h2>
            <p>Everything you need. One flat price. No hidden fees.</p>
          </motion.div>

          <motion.div
            className="pricing-home-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            viewport={{ once: true }}
          >
            <div className="pricing-home-price">
              <span className="price-dollar">$</span>
              <span className="price-amount">49</span>
              <span className="price-period">/month</span>
            </div>
            <p className="pricing-home-desc">14-day free trial &middot; Cancel anytime</p>
            <div className="pricing-home-features">
              {[
                'Unlimited team members',
                'Unlimited receipt scans',
                'Bank statement matching',
                'Expense categorization',
                'Sales report tracking',
                'Recurring charges',
                'Custom categories',
                'Priority support',
              ].map((f, i) => (
                <div key={i} className="pricing-home-feat">
                  <CheckCircle2 size={16} />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-dark">
        <div className="cta-glow-orb" />
        <div className="container cta-dark-inner">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2>
              Ready to take control of
              <br />
              <span className="gradient-text">your expenses?</span>
            </h2>
            <p>
              Join hundreds of businesses using Tally to save time and money on
              bookkeeping. Start your 14-day free trial today.
            </p>
            <div className="cta-dark-actions">
              <Link to="/register" className="btn-glow">
                Start Free Trial
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
