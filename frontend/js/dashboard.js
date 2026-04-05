// Dashboard Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getUser();
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = `Welcome back, ${user.name || 'Founder'}!`;

  // Character counter for idea textarea
  const ideaText  = document.getElementById('idea-text');
  const charCount = document.getElementById('char-count');
  ideaText.addEventListener('input', () => {
    charCount.textContent = ideaText.value.length;
  });

  // Load data in parallel
  await Promise.all([loadMyIdeas(), loadStats()]);

  // Submit new idea
  const form     = document.getElementById('idea-form');
  const submitBtn = document.getElementById('submit-btn');
  const alert     = document.getElementById('submit-alert');

  function showAlert(msg, type = 'error') {
    alert.className = `alert show alert-${type}`;
    alert.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span><span>${msg}</span>`;
    setTimeout(() => { alert.className = 'alert'; }, 5000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert.className = 'alert';

    const text = ideaText.value.trim();
    if (text.length < 20) {
      showAlert('Idea must be at least 20 characters long.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

    try {
      const { ok, data } = await apiFetch('/ideas', {
        method: 'POST',
        body: JSON.stringify({ ideaText: text }),
      });

      if (!ok) {
        showAlert(data.error || 'Failed to submit idea.');
        return;
      }

      // Check if similar ideas were found across the platform
      if (data.warning && data.similarIdeas?.length) {
        const names = data.similarIdeas.map(s => s.userName || s.userEmail).join(', ');
        const similarity = data.similarIdeas[0].similarity;
        showDuplicateWarning(data.similarIdeas, data.ideaId);
        toast(`⚠️ Similar idea found! ${similarity}% match with ${names}`, 'warning', 8000);
      } else {
        showAlert('Idea submitted! You can now run AI analysis on it.', 'success');
      }
      
      ideaText.value = '';
      charCount.textContent = '0';
      await loadMyIdeas();
      await loadStats();
    } catch (err) {
      showAlert(err.message || 'Network error.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit Idea';
    }
  });

  function showDuplicateWarning(similarIdeas, newIdeaId) {
    const warningDiv = document.getElementById('submit-alert');
    warningDiv.className = 'alert show alert-warning';
    warningDiv.innerHTML = `
      <div style="margin-bottom:8px;">
        <strong>⚠️ Similar ideas detected on the platform!</strong>
      </div>
      <div style="font-size:0.85rem;margin-bottom:10px;">Your idea was submitted, but these founders have similar ideas. Consider collaborating!</div>
      ${similarIdeas.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:rgba(0,0,0,0.2);border-radius:8px;margin-bottom:6px;">
          <div>
            <strong style="color:var(--text-primary);">${escapeHtml(s.userName || s.userEmail)}</strong>
            <span style="color:var(--accent);margin-left:8px;font-size:0.8rem;">${s.similarity}% match</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="sendQuickInvite('${s.userEmail}', '${newIdeaId}', this)" style="font-size:0.75rem;padding:4px 12px;">
            🤝 Invite
          </button>
        </div>
      `).join('')}
    `;
    // Don't auto-hide this important warning
  }

  // New idea button scrolls to form
  document.getElementById('new-idea-btn')?.addEventListener('click', () => {
    ideaText.focus();
    ideaText.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
});

async function loadMyIdeas() {
  const container = document.getElementById('ideas-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>';

  try {
    const { ok, data } = await apiFetch('/ideas');
    if (!ok) {
      container.innerHTML = `<div class="empty-state"><p>Failed to load ideas.</p></div>`;
      return;
    }

    const { ideas } = data;

    if (!ideas.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <h3>No ideas yet</h3>
          <p>Submit your first startup idea using the form on the left!</p>
        </div>`;
      return;
    }

    container.innerHTML = ideas.map((idea) => `
      <div class="idea-card" onclick="openAnalysis('${idea.id}')" style="margin-bottom:10px;">
        <div class="idea-card-header">
          <span class="badge ${categoryBadgeClass(idea.category)}">${idea.category || 'Other'}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(idea.timestamp)}</span>
        </div>
        <p class="idea-card-text">${escapeHtml(idea.ideaText)}</p>
        <div class="idea-card-meta">
          ${idea.scores ? `
            <span class="idea-score-chip">⭐ ${idea.scores.overall_score}/100</span>
            <span class="badge ${riskBadgeClass(idea.scores.risk_level)}">${idea.scores.risk_level} Risk</span>
          ` : '<span class="badge badge-gray">Not analyzed</span>'}
          ${idea.analysis ? `<span class="badge badge-green">${idea.analysis.viability === 'Yes' ? '✅ Viable' : '⚠️ Review'}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

async function loadStats() {
  try {
    const [ideasRes, connRes] = await Promise.all([
      apiFetch('/ideas'),
      apiFetch('/collaboration/connections'),
    ]);

    const ideas = ideasRes.data.ideas || [];
    const connections = connRes.data.connections || [];

    const analyzed = ideas.filter((i) => i.analysis).length;
    const scores   = ideas.filter((i) => i.scores?.overall_score).map((i) => i.scores.overall_score);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '—';

    document.getElementById('stat-ideas').textContent       = ideas.length;
    document.getElementById('stat-analyzed').textContent    = analyzed;
    document.getElementById('stat-connections').textContent = connections.length;
    document.getElementById('stat-avg-score').textContent   = avgScore !== '—' ? `${avgScore}%` : '—';
  } catch (_) {} // stats are non-critical
}

function openAnalysis(ideaId) {
  window.location.href = `analysis.html?idea=${ideaId}`;
}

async function sendQuickInvite(toEmail, ideaId, btnEl) {
  try {
    btnEl.disabled = true;
    btnEl.textContent = 'Sending...';
    const { ok, data } = await apiFetch('/collaboration/invite', {
      method: 'POST',
      body: JSON.stringify({ toEmail, ideaId, role: 'Collaborator' }),
    });
    if (ok) {
      btnEl.textContent = '✅ Sent!';
      btnEl.style.background = 'var(--success)';
      toast(`Invite sent to ${toEmail}! 🎉`, 'success');
    } else {
      btnEl.textContent = '🤝 Invite';
      btnEl.disabled = false;
      toast(data.error || 'Failed to send invite.', 'error');
    }
  } catch (err) {
    btnEl.textContent = '🤝 Invite';
    btnEl.disabled = false;
    toast(err.message, 'error');
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
