// Analysis Page Logic
let currentIdeaId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Pre-select idea from URL param
  const urlParams  = new URLSearchParams(window.location.search);
  const preselect  = urlParams.get('idea');

  await loadIdeaSelector(preselect);

  const select     = document.getElementById('idea-select');
  const analyzeBtn = document.getElementById('analyze-btn');
  const alertEl    = document.getElementById('analyze-alert');

  select.addEventListener('change', () => {
    currentIdeaId = select.value;
    analyzeBtn.disabled = !currentIdeaId;
    if (currentIdeaId) {
      loadExistingAnalysis(currentIdeaId);
    } else {
      hideResults();
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    if (!currentIdeaId) return;
    await runAnalysis(currentIdeaId);
  });
});

async function loadIdeaSelector(preselectId = null) {
  const select = document.getElementById('idea-select');

  try {
    const { ok, data } = await apiFetch('/ideas');
    if (!ok || !data.ideas.length) {
      select.innerHTML = '<option value="">No ideas found. Submit one first.</option>';
      return;
    }

    select.innerHTML = '<option value="">Choose an idea to analyze...</option>' +
      data.ideas.map((idea) =>
        `<option value="${idea.id}">${idea.ideaText.substring(0, 80)}${idea.ideaText.length > 80 ? '...' : ''}</option>`
      ).join('');

    if (preselectId) {
      select.value = preselectId;
      currentIdeaId = preselectId;
      document.getElementById('analyze-btn').disabled = false;
      await loadExistingAnalysis(preselectId);
    }
  } catch (err) {
    select.innerHTML = `<option value="">Error: ${err.message}</option>`;
  }
}

async function loadExistingAnalysis(ideaId) {
  try {
    const { ok, data } = await apiFetch(`/analysis/${ideaId}`);
    if (ok && data.analysis) {
      renderResults(data.analysis, data.scores, data.mvpPlan);
      loadSimilarIdeas(ideaId);
    } else {
      hideResults();
    }
  } catch (_) { hideResults(); }
}

async function runAnalysis(ideaId) {
  const btn     = document.getElementById('analyze-btn');
  const loading = document.getElementById('analysis-loading');
  const alertEl = document.getElementById('analyze-alert');

  alertEl.className = 'alert';
  hideResults();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analyzing...';
  loading.style.display = 'block';

  try {
    const { ok, data } = await apiFetch(`/analysis/${ideaId}`, { method: 'POST' });

    if (!ok) {
      alertEl.className = 'alert show alert-error';
      alertEl.innerHTML = `❌ ${data.error || 'Analysis failed.'}`;
      return;
    }

    renderResults(data.analysis, data.scores, data.mvpPlan);
    loadSimilarIdeas(ideaId);
    toast('Analysis complete! 🎉', 'success');
  } catch (err) {
    alertEl.className = 'alert show alert-error';
    alertEl.innerHTML = `❌ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🧠 Run AI Analysis';
    loading.style.display = 'none';
  }
}

function renderResults(analysis, scores, mvpPlan) {
  document.getElementById('analysis-results').style.display = 'block';

  // Summary
  document.getElementById('idea-summary').textContent = analysis.summary || '';

  // Badges
  const viabilityBadge = document.getElementById('viability-badge');
  viabilityBadge.textContent = `${analysis.viability === 'Yes' ? '✅' : '⚠️'} ${analysis.viability === 'Yes' ? 'Viable' : 'Questionable'}`;
  viabilityBadge.className = `badge ${analysis.viability === 'Yes' ? 'badge-green' : 'badge-yellow'}`;

  const compBadge = document.getElementById('competition-badge');
  const compLevel = analysis.competition_level || 'Medium';
  compBadge.textContent = `⚔️ ${compLevel} Competition`;
  compBadge.className = `badge ${compLevel === 'Low' ? 'badge-green' : compLevel === 'Medium' ? 'badge-yellow' : 'badge-red'}`;

  // Progress circle
  const prob = parseInt(analysis.success_probability, 10) || 0;
  const circ = document.getElementById('success-circle');
  const circumference = 2 * Math.PI * 38; // 239
  setTimeout(() => {
    circ.style.strokeDashoffset = circumference - (prob / 100) * circumference;
  }, 200);
  document.getElementById('success-prob-text').textContent = `${prob}%`;

  // Scores
  if (scores) {
    const scoreMetrics = [
      { label: 'Market Demand',        value: scores.market_demand,         icon: '📊' },
      { label: 'Monetization',         value: scores.monetization_potential, icon: '💰' },
      { label: 'Execution Difficulty', value: scores.execution_difficulty,   icon: '⚙️' },
      { label: 'Investor Appeal',      value: scores.investor_appeal,        icon: '🏦' },
      { label: 'Scalability',          value: scores.scalability,            icon: '📈' },
      { label: 'Overall Score',        value: scores.overall_score,          icon: '⭐' },
    ];

    document.getElementById('scores-section').innerHTML = scoreMetrics.map((m) => `
      <div class="score-bar-wrap">
        <div class="score-bar-header">
          <span class="score-bar-label">${m.icon} ${m.label}</span>
          <span class="score-bar-value">${m.value || 0}/100</span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" data-score="${m.value || 0}"></div>
        </div>
      </div>
    `).join('');

    setTimeout(animateScoreBars, 100);

    // Risk badge
    const catBadge = document.getElementById('category-badge');
    catBadge.textContent = `🎲 ${scores.risk_level || 'Medium'} Risk`;
    catBadge.className = `badge ${riskBadgeClass(scores.risk_level)}`;
  }

  // Advantages / Disadvantages / Suggestions
  const makeListItems = (items, icon) => (items || []).map(
    (item) => `<li class="list-item" data-icon="${icon}">${escapeHtml(item)}</li>`
  ).join('');

  document.getElementById('advantages-list').innerHTML    = makeListItems(analysis.advantages, '✅');
  document.getElementById('disadvantages-list').innerHTML = makeListItems(analysis.disadvantages, '⚠️');
  document.getElementById('suggestions-list').innerHTML   = makeListItems(analysis.suggestions, '💡');

  // MVP Plan
  if (mvpPlan) {
    // Tech Stack
    const ts = mvpPlan.tech_stack || {};
    const techKeys = ['frontend','backend','database','hosting','ai_tools'];
    document.getElementById('tech-stack-section').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${techKeys.filter((k) => ts[k]).map((k) => `
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <span style="min-width:90px;font-size:0.72rem;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:var(--text-muted);padding-top:2px;">${k.replace('_',' ')}</span>
            <span style="font-size:0.875rem;color:var(--text-secondary);">${escapeHtml(ts[k])}</span>
          </div>
        `).join('')}
      </div>`;

    // Cost estimate
    const costEl = document.getElementById('cost-estimate');
    if (mvpPlan.estimated_cost) costEl.textContent = mvpPlan.estimated_cost;

    // Timeline
    document.getElementById('timeline-section').innerHTML = (mvpPlan.timeline || []).map((t) => `
      <div class="timeline-item">
        <div class="timeline-week">${escapeHtml(t.week)}</div>
        <div class="timeline-milestone">${escapeHtml(t.milestone)}</div>
      </div>
    `).join('');

    // MVP Features — rebuild suggestions list
    const featuresHtml = (mvpPlan.mvp_features || []).map(
      (f) => `<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:0.875rem;color:var(--text-secondary);">✦ ${escapeHtml(f)}</div>`
    ).join('');
    const suggestionsEl = document.getElementById('suggestions-list');
    if (suggestionsEl && mvpPlan.mvp_features?.length) {
      suggestionsEl.innerHTML += featuresHtml.replace(/<div/g, '<li class="list-item" data-icon="🎯"').replace(/<\/div>/g, '</li>');
    }

    // GTM
    const gtm = mvpPlan.go_to_market || {};
    document.getElementById('gtm-section').innerHTML = `
      <div class="gtm-grid">
        <div class="gtm-item">
          <div class="gtm-label">Target Audience</div>
          <div class="gtm-value">${escapeHtml(gtm.target_audience || '—')}</div>
        </div>
        <div class="gtm-item">
          <div class="gtm-label">Pricing Model</div>
          <div class="gtm-value">${escapeHtml(gtm.pricing_model || '—')}</div>
        </div>
        <div class="gtm-item" style="grid-column:1/-1;">
          <div class="gtm-label">Launch Strategy</div>
          <div class="gtm-value">${escapeHtml(gtm.launch_strategy || '—')}</div>
        </div>
        <div class="gtm-item" style="grid-column:1/-1;">
          <div class="gtm-label">Acquisition Channels</div>
          <div class="gtm-value">${(gtm.acquisition_channels || []).join(' · ')}</div>
        </div>
      </div>`;
  }
}

async function loadSimilarIdeas(ideaId) {
  const container = document.getElementById('similar-section');
  container.innerHTML = '<div class="loading-overlay" style="padding:var(--space-md);"><div class="spinner"></div><span style="font-size:0.8rem;color:var(--text-muted);">Scanning ideas...</span></div>';

  try {
    const { ok, data } = await apiFetch(`/ideas/${ideaId}/similar`);
    if (!ok || !data.similarIdeas?.length) {
      container.innerHTML = '<div class="empty-state" style="padding:var(--space-lg);"><div class="empty-icon">🔍</div><h3>No similar ideas found</h3><p>Your idea is unique in the platform! Keep building.</p></div>';
      return;
    }

    container.innerHTML = `<div class="grid-auto stagger">
      ${data.similarIdeas.map((idea) => `
        <div class="similar-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:0.78rem;color:var(--text-muted);">${idea.userEmail}</span>
            <span class="similarity-score">${Math.round(idea.similarity * 100)}% match</span>
          </div>
          <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(idea.ideaText)}</p>
          <div style="margin-top:12px;">
            <button class="btn btn-primary btn-sm" onclick="sendCollaborationInvite('${idea.userEmail}', '${ideaId}')">🤝 Invite to Collaborate</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);font-size:0.875rem;padding:var(--space-md);">${err.message}</p>`;
  }
}

async function sendCollaborationInvite(toEmail, ideaId) {
  try {
    const { ok, data } = await apiFetch('/collaboration/invite', {
      method: 'POST',
      body: JSON.stringify({ toEmail, ideaId, role: 'Collaborator' }),
    });
    if (ok) {
      toast(`Invite sent to ${toEmail}! 🎉`, 'success');
    } else {
      toast(data.error || 'Failed to send invite.', 'error');
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

function hideResults() {
  document.getElementById('analysis-results').style.display = 'none';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
