// Connections Page Logic
let activeConnectionId = null;
let activeIdeaId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  await loadConnections();

  // Post comment
  document.getElementById('post-comment-btn')?.addEventListener('click', postComment);
  document.getElementById('comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  });

  document.getElementById('close-workspace')?.addEventListener('click', () => {
    document.getElementById('workspace-panel').style.display = 'none';
    activeConnectionId = null;
    activeIdeaId = null;
  });
});

async function loadConnections() {
  const grid = document.getElementById('connections-grid');
  grid.innerHTML = '<div class="loading-overlay" style="grid-column:1/-1;"><div class="spinner spinner-lg"></div></div>';

  try {
    const { ok, data } = await apiFetch('/collaboration/connections');
    if (!ok) throw new Error(data.error || 'Failed to load connections');

    const { connections } = data;

    if (!connections.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">🤝</div>
          <h3>No connections yet</h3>
          <p>Accept collaboration invites to build your network. <a href="invites.html" style="color:var(--brand-from);">View Invites →</a></p>
        </div>`;
      return;
    }

    grid.innerHTML = connections.map((conn) => `
      <div class="connection-card animate-slide-up">
        <div style="display:flex;align-items:center;gap:var(--space-sm);">
          <div class="user-avatar" style="width:48px;height:48px;font-size:1.1rem;">${conn.partnerEmail[0].toUpperCase()}</div>
          <div style="flex:1;">
            <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${escapeHtml(conn.partnerEmail.split('@')[0])}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${conn.partnerEmail}</div>
          </div>
          <span class="badge badge-cyan">${conn.partnerRole}</span>
        </div>

        <div class="separator" style="margin:var(--space-sm) 0;"></div>

        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:var(--space-xs);">Shared Idea</div>
        <p style="font-size:0.875rem;color:var(--text-secondary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(conn.ideaText || '—')}</p>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--space-md);">
          <span style="font-size:0.75rem;color:var(--text-muted);">Your role: <strong style="color:var(--text-secondary);">${conn.myRole}</strong></span>
          <span style="font-size:0.75rem;color:var(--text-muted);">${timeAgo(conn.connectedAt)}</span>
        </div>

        <button class="btn btn-secondary btn-sm btn-full" style="margin-top:var(--space-sm);"
          onclick="openWorkspace('${conn.id}', '${conn.ideaId}', '${escapeHtml(conn.partnerEmail)}')">
          💬 Open Workspace
        </button>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><p style="color:var(--danger);">${err.message}</p></div>`;
  }
}

async function openWorkspace(connectionId, ideaId, partnerEmail) {
  activeConnectionId = connectionId;
  activeIdeaId = ideaId;

  const panel = document.getElementById('workspace-panel');
  document.getElementById('workspace-subtitle').textContent = `Shared workspace with ${partnerEmail}`;
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  await loadComments(ideaId);
}

async function loadComments(ideaId) {
  const list = document.getElementById('comment-list');
  list.innerHTML = '<div class="loading-overlay" style="padding:var(--space-md);"><div class="spinner"></div></div>';

  try {
    const { ok, data } = await apiFetch(`/comments/${ideaId}`);
    if (!ok) throw new Error(data.error || 'Failed to load comments');

    const { comments } = data;

    if (!comments.length) {
      list.innerHTML = '<div class="empty-state" style="padding:var(--space-md);"><p>No messages yet. Start the conversation!</p></div>';
      return;
    }

    const me = getUser().email;
    list.innerHTML = comments.map((c) => `
      <div class="comment-item" style="${c.userEmail === me ? 'border-color:rgba(99,102,241,0.3);' : ''}">
        <div class="comment-author">${escapeHtml(c.userName || c.userEmail.split('@')[0])} ${c.userEmail === me ? '<span style="color:var(--text-muted);font-weight:400;">(you)</span>' : ''}</div>
        <div class="comment-text">${escapeHtml(c.text)}</div>
        <div class="comment-time">${timeAgo(c.timestamp)}</div>
      </div>
    `).join('');

    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
  } catch (err) {
    list.innerHTML = `<p style="color:var(--danger);font-size:0.875rem;padding:var(--space-sm);">${err.message}</p>`;
  }
}

async function postComment() {
  const input = document.getElementById('comment-input');
  const text  = input.value.trim();

  if (!text || !activeIdeaId) return;

  input.disabled = true;

  try {
    const { ok, data } = await apiFetch('/comments', {
      method: 'POST',
      body: JSON.stringify({ ideaId: activeIdeaId, text }),
    });

    if (!ok) {
      toast(data.error || 'Failed to post.', 'error');
      return;
    }

    input.value = '';
    await loadComments(activeIdeaId);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
