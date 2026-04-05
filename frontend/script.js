/**
 * Shared utility script — included on every protected page.
 * Handles: API base URL, auth guard, token helpers, toast notifications,
 * sidebar nav highlight, mobile menu toggle.
 */

const API_BASE = window.location.origin + '/api';

// ─── Auth Helpers ─────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function logout() {
  clearAuth();
  window.location.href = 'login.html';
}

/**
 * Guard: redirect to login if no token.
 * Call at page load for all protected pages.
 */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/**
 * Guard: redirect to dashboard if already logged in.
 * Call on login/signup pages.
 */
function redirectIfLoggedIn() {
  if (getToken()) {
    window.location.href = 'dashboard.html';
  }
}

// ─── API Fetch Helper ─────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json();

    if (res.status === 401) {
      clearAuth();
      window.location.href = 'login.html';
      throw new Error(data.error || 'Session expired');
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err.message !== 'Session expired') {
      throw new Error(err.message || 'Network error. Is the server running?');
    }
    throw err;
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────────
function createToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '9999',
    });
    document.body.appendChild(container);
  }
  return container;
}

function toast(message, type = 'info', duration = 4000) {
  const container = createToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#6ee7b7' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#fca5a5' },
    info:    { bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',  color: '#67e8f9' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fcd34d' },
  };
  const c = colors[type] || colors.info;

  const el = document.createElement('div');
  Object.assign(el.style, {
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.color,
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '500',
    maxWidth: '360px',
    backdropFilter: 'blur(12px)',
    animation: 'slideUp 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    fontFamily: "'Inter', sans-serif",
  });

  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── Sidebar highlight ────────────────────────────────────────────────────
function highlightNavItem() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach((item) => {
    const href = item.getAttribute('href');
    if (href && href === currentPage) {
      item.classList.add('active');
    }
  });
}

// ─── Populate user info in sidebar ───────────────────────────────────────
function populateSidebarUser() {
  const user = getUser();
  const nameEl = document.querySelector('.user-name');
  const roleEl = document.querySelector('.user-role');
  const avatarEl = document.querySelector('.user-avatar');
  const nameInitial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  if (nameEl)   nameEl.textContent = user.name || user.email?.split('@')[0] || 'User';
  if (roleEl)   roleEl.textContent = user.role || 'Founder';
  if (avatarEl) avatarEl.textContent = nameInitial;
}

// ─── Mobile Sidebar Toggle ────────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const sidebar = document.querySelector('.sidebar');
  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ─── Score bar animation ──────────────────────────────────────────────────
function animateScoreBars() {
  const bars = document.querySelectorAll('.score-bar-fill[data-score]');
  bars.forEach((bar) => {
    const score = parseInt(bar.dataset.score, 10) || 0;
    setTimeout(() => { bar.style.width = `${score}%`; }, 100);
  });
}

// ─── Logout Button ────────────────────────────────────────────────────────
function initLogoutButton() {
  const btn = document.getElementById('logout-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// ─── Time ago formatter ───────────────────────────────────────────────────
function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ─── Format percentage ────────────────────────────────────────────────────
function formatScore(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? '—' : `${n}%`;
}

// ─── Risk badge color ─────────────────────────────────────────────────────
function riskBadgeClass(level) {
  if (!level) return 'badge-gray';
  const l = level.toLowerCase();
  if (l === 'low')    return 'badge-green';
  if (l === 'medium') return 'badge-yellow';
  if (l === 'high')   return 'badge-red';
  return 'badge-gray';
}

// ─── Category tag color ───────────────────────────────────────────────────
function categoryBadgeClass(cat) {
  const map = {
    'AI/ML': 'badge-purple',
    'SaaS': 'badge-cyan',
    'FinTech': 'badge-green',
    'EdTech': 'badge-yellow',
    'HealthTech': 'badge-green',
    'E-Commerce': 'badge-cyan',
    'Social': 'badge-purple',
    'CleanTech': 'badge-green',
  };
  return map[cat] || 'badge-gray';
}

// ─── Init on all pages ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  highlightNavItem();
  populateSidebarUser();
  initMobileMenu();
  initLogoutButton();
});
