// Signup Page Logic
document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();

  const form  = document.getElementById('signup-form');
  const btn   = document.getElementById('signup-btn');
  const alert = document.getElementById('signup-alert');

  function showAlert(msg, type = 'error') {
    alert.className = `alert show alert-${type}`;
    alert.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span><span>${msg}</span>`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alert.className = 'alert';

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const role     = document.getElementById('role').value;
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirm-password').value;

    if (!name || !email || !password) {
      showAlert('All fields are required.'); return;
    }
    if (name.length < 2) {
      showAlert('Name must be at least 2 characters.'); return;
    }
    if (password.length < 6) {
      showAlert('Password must be at least 6 characters.'); return;
    }
    if (password !== confirm) {
      showAlert('Passwords do not match.'); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';

    try {
      const { ok, data } = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, role, password }),
      });

      if (!ok) {
        showAlert(data.error || 'Signup failed.'); return;
      }

      setAuth(data.token, data.user);
      showAlert('Account created! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    } catch (err) {
      showAlert(err.message || 'Network error. Is the backend running?');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Create Free Account';
    }
  });
});
