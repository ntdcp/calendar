/* Admin login page logic. */
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('rana_admin_token');
  if (token) {
    window.location.href = 'dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '…';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign in failed.');
      localStorage.setItem('rana_admin_token', data.token);
      localStorage.setItem('rana_admin_username', data.username);
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
});
