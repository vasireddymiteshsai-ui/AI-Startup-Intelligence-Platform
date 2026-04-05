// Login Page Logic
document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();

  const form = document.getElementById('login-form');
  const btn  = document.getElementById('login-btn');
  const alert = document.getElementById('login-alert');

  function showAlert(msg, type = 'error') {
    alert.className = `alert show alert-${type}`;
    alert.innerHTML = `<span>${type === 'error' ? '❌' : '✅'}</span><span>${msg}</span>`;
  }

  function hideAlert() { alert.className = 'alert'; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      const { ok, data } = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!ok) {
        showAlert(data.error || 'Login failed. Please try again.');
        return;
      }

      setAuth(data.token, data.user);
      showAlert('Login successful! Redirecting...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    } catch (err) {
      showAlert(err.message || 'Network error. Is the backend server running?');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
    }
  });
});
