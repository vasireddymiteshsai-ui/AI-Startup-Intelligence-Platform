// Invites Page Logic
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => { p.style.display = 'none'; });
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = 'block';
    });
  });

  // Load received invites by default
  await loadReceivedInvites();

  // Load user ideas for the send form
  await loadIdeasForSelect();

  // Refresh buttons
  document.getElementById('refresh-received')?.addEventListener('click', loadReceivedInvites);
  document.getElementById('refresh-sent')?.addEventListener('click', () => {
    document.getElementById('tab-sent').style.display = 'block';
    loadSentInvites();
  });

  // Send new invite form
  const form    = document.getElementById('invite-form');
  const btn     = document.getElementById('send-invite-btn');
  const alertEl = document.getElementById('send-alert');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.className = 'alert';

    const toEmail = document.getElementById('to-email').value.trim();
    const ideaId  = document.getElementById('invite-idea').value;
    const role    = document.getElementById('invite-role').value;

    if (!toEmail || !ideaId) {
      alertEl.className = 'alert show alert-error';
      alertEl.innerHTML = '❌ Please fill in all fields.';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Sending...';

    try {
      const { ok, data } = await apiFetch('/collaboration/invite', {
        method: 'POST',
        body: JSON.stringify({ toEmail, ideaId, role }),
      });

      if (!ok) {
        alertEl.className = 'alert show alert-error';
        alertEl.innerHTML = `❌ ${data.error || 'Failed to send invite.'}`;
        return;
      }

      alertEl.className = 'alert show alert-success';
      alertEl.innerHTML = '✅ Invite sent successfully!';
      form.reset();
    } catch (err) {
      alertEl.className = 'alert show alert-error';
      alertEl.innerHTML = `❌ ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Send Invite';
    }
  });
});

async function loadReceivedInvites() {
  const container = document.getElementById('received-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>';

  try {
    const { ok, data } = await apiFetch('/collaboration/invites');
    if (!ok) throw new Error(data.error || 'Failed to load invites');

    const { invites } = data;
    if (!invites.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📬</div>
          <h3>No invites received</h3>
          <p>When other founders invite you to collaborate, they'll appear here.</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${
      invites.map((inv) => `
        <div class="invite-card">
          <div class="invite-avatar">${(inv.fromName || inv.fromEmail)[0].toUpperCase()}</div>
          <div class="invite-info">
            <div class="invite-from">${escapeHtml(inv.fromName || inv.fromEmail)}
              <span style="font-size:0.72rem;font-weight:400;color:var(--text-muted);margin-left:6px;">${inv.fromEmail}</span>
            </div>
            <div class="invite-idea">${escapeHtml(inv.ideaText || 'No idea text')}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
              <span class="badge badge-purple">${inv.role}</span>
              <span class="badge ${inv.status === 'pending' ? 'badge-yellow' : inv.status === 'accepted' ? 'badge-green' : 'badge-gray'}">${inv.status}</span>
              <span style="font-size:0.72rem;color:var(--text-muted);">${timeAgo(inv.createdAt)}</span>
            </div>
          </div>
          <div class="invite-actions">
            ${inv.status === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="respondInvite('${inv.id}', 'accept')">Accept</button>
              <button class="btn btn-danger btn-sm" onclick="respondInvite('${inv.id}', 'reject')">Decline</button>
            ` : ''}
          </div>
        </div>
      `).join('')
    }</div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
  }
}

async function loadSentInvites() {
  const container = document.getElementById('sent-list');
  container.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>';

  try {
    const { ok, data } = await apiFetch('/collaboration/sent-invites');
    if (!ok) throw new Error(data.error || 'Failed to load sent invites');

    const { invites } = data;
    if (!invites.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📤</div>
          <h3>No invites sent yet</h3>
          <p>Send your first invite using the "Send Invite" tab.</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${
      invites.map((inv) => `
        <div class="invite-card">
          <div class="invite-avatar" style="background:linear-gradient(135deg,var(--brand-accent),var(--brand-from));">${(inv.toEmail)[0].toUpperCase()}</div>
          <div class="invite-info">
            <div class="invite-from">To: ${escapeHtml(inv.toEmail)}</div>
            <div class="invite-idea">${escapeHtml(inv.ideaText || 'idea')}</div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
              <span class="badge badge-cyan">${inv.role}</span>
              <span class="badge ${inv.status === 'pending' ? 'badge-yellow' : inv.status === 'accepted' ? 'badge-green' : 'badge-gray'}">${inv.status}</span>
              <span style="font-size:0.72rem;color:var(--text-muted);">${timeAgo(inv.createdAt)}</span>
            </div>
          </div>
        </div>
      `).join('')
    }</div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">${err.message}</p></div>`;
  }
}

async function loadIdeasForSelect() {
  const select = document.getElementById('invite-idea');
  try {
    const { ok, data } = await apiFetch('/ideas');
    if (!ok || !data.ideas.length) return;
    data.ideas.forEach((idea) => {
      const opt = document.createElement('option');
      opt.value = idea.id;
      opt.textContent = idea.ideaText.substring(0, 70) + (idea.ideaText.length > 70 ? '...' : '');
      select.appendChild(opt);
    });
  } catch (_) {}
}

async function respondInvite(inviteId, action) {
  try {
    const { ok, data } = await apiFetch(`/collaboration/invite/${inviteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });

    if (ok) {
      toast(action === 'accept' ? '🤝 Invite accepted! Check Connections.' : 'Invite declined.', action === 'accept' ? 'success' : 'info');
      await loadReceivedInvites();
    } else {
      toast(data.error || 'Failed.', 'error');
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

// Load sent invites when that tab is first clicked
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-tab="sent"]')?.addEventListener('click', loadSentInvites);
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
