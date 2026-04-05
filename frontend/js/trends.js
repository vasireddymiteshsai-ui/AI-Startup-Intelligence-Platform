// Trends Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  await loadTrends();

  document.getElementById('refresh-trends')?.addEventListener('click', loadTrends);
});

async function loadTrends() {
  try {
    const { ok, data } = await apiFetch('/trends');
    if (!ok) { toast(data.error || 'Failed to load trends.', 'error'); return; }

    // Stats
    document.getElementById('stat-total').textContent  = data.totalIdeas;
    document.getElementById('stat-recent').textContent = data.recentCount;
    document.getElementById('stat-high').textContent   = data.topIdeas?.length || 0;
    document.getElementById('stat-top-cat').textContent = data.trendingCategories?.[0]?.name || '—';

    // Trending categories
    renderCategories(data.trendingCategories || []);

    // Weekly chart
    renderWeeklyChart(data.weeklyActivity || []);

    // Top ideas
    renderTopIdeas(data.topIdeas || []);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderCategories(categories) {
  const container = document.getElementById('category-list');
  if (!categories.length) {
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-md);"><p>No data yet.</p></div>';
    return;
  }

  const max = categories[0]?.count || 1;

  container.innerHTML = categories.map((cat, i) => `
    <div class="trend-rank">
      <span class="rank-number">#${i + 1}</span>
      <div class="rank-bar-wrap">
        <div class="rank-name">${escapeHtml(cat.name)}</div>
        <div class="score-bar-track" style="height:6px;">
          <div class="score-bar-fill" data-score="${Math.round((cat.count / max) * 100)}" style="background:${getCategoryColor(cat.name)};"></div>
        </div>
      </div>
      <span class="rank-count">${cat.count} idea${cat.count !== 1 ? 's' : ''}</span>
    </div>
  `).join('');

  setTimeout(animateScoreBars, 100);
}

function renderWeeklyChart(weeklyActivity) {
  const container = document.getElementById('weekly-chart');
  const max = Math.max(...weeklyActivity.map((d) => d.count), 1);

  container.innerHTML = weeklyActivity.map((day) => {
    const heightPct = max > 0 ? (day.count / max) * 100 : 0;
    const label = new Date(day.date).toLocaleDateString('en', { weekday: 'short' });
    return `
      <div class="chart-bar-item">
        <div class="chart-bar-val">${day.count}</div>
        <div class="chart-bar" style="height:${Math.max(heightPct, 2)}%;min-height:4px;" title="${day.date}: ${day.count} ideas"></div>
        <div class="chart-bar-label">${label}</div>
      </div>
    `;
  }).join('');
}

function renderTopIdeas(ideas) {
  const container = document.getElementById('top-ideas-list');

  if (!ideas.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-lg);">
        <div class="empty-icon">🏆</div>
        <h3>No high-scoring ideas yet</h3>
        <p>Ideas that receive an AI overall score ≥ 70 will appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = ideas.map((idea, i) => `
    <div class="top-idea-card stagger">
      <div class="top-idea-rank">${i < 3 ? ['🥇','🥈','🥉'][i] : `#${i + 1}`}</div>
      <div style="flex:1;">
        <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(idea.ideaText)}</p>
        <div style="display:flex;align-items:center;gap:var(--space-sm);margin-top:8px;flex-wrap:wrap;">
          <span class="badge ${categoryBadgeClass(idea.category)}">${idea.category}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">by ${escapeHtml(idea.userName || 'Unknown')}</span>
        </div>
      </div>
      <div class="top-idea-score">${idea.overallScore}</div>
    </div>
  `).join('');
}

function getCategoryColor(name) {
  const colors = {
    'AI/ML':       'linear-gradient(90deg,#6366f1,#8b5cf6)',
    'SaaS':        'linear-gradient(90deg,#06b6d4,#3b82f6)',
    'FinTech':     'linear-gradient(90deg,#10b981,#059669)',
    'EdTech':      'linear-gradient(90deg,#f59e0b,#f97316)',
    'HealthTech':  'linear-gradient(90deg,#10b981,#6ee7b7)',
    'E-Commerce':  'linear-gradient(90deg,#06b6d4,#0891b2)',
    'Social':      'linear-gradient(90deg,#8b5cf6,#ec4899)',
    'CleanTech':   'linear-gradient(90deg,#84cc16,#22c55e)',
  };
  return colors[name] || 'linear-gradient(90deg,var(--brand-from),var(--brand-to))';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
