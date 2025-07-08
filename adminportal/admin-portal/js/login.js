/* Login logic for CivicSense Admin Portal */
const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

// Backend API URL - pointing to admin backend
const API_URL = 'http://localhost:3005/api/auth/login';

if (loginForm) {
  loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    errorMsg.hidden = true;
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || 'Invalid credentials');
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('department', data.department || '');
        localStorage.setItem('role', 'admin');
        window.location.href = 'dashboard.html';
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err) {
      errorMsg.textContent = err.message || 'Failed to login. Please try again.';
      errorMsg.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
}
