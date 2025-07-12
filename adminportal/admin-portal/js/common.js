// common.js: injects the shared header and activates nav links
(async () => {
  const headerHolder = document.createElement('div');
  document.body.prepend(headerHolder);

  try {
    const resp = await fetch('partials/header.html');
    const html = await resp.text();
    headerHolder.innerHTML = html;

    // Highlight active link based on filename
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    document.querySelectorAll('#navLinks .nav-link').forEach(link => {
      if (link.dataset.page === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Clear authentication tokens and user data
        localStorage.removeItem('token');
        localStorage.removeItem('department');
        localStorage.removeItem('role');
        
        // Optional: Call backend logout endpoint if needed
        try {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).catch(console.error);
        } catch (err) {
          console.error('Logout API call failed:', err);
        }
        
        // Redirect to main landing page
        window.location.href = '../landing.html';
      });
    }
  } catch (e) {
    console.error('Failed to load common header:', e);
  }
})();
