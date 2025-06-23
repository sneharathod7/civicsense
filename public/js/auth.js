// auth.js - Simple frontend auth state management for static HTML

// Call this on page load to update navbar links based on login state
function updateNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    // Hide/show nav links based on login status
    document.querySelectorAll('.nav-logged-in').forEach(el => {
        el.style.display = isLoggedIn ? '' : 'none';
    });
    document.querySelectorAll('.nav-logged-out').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : '';
    });
}

// Call this on logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/landing.html';
}

// Attach event listeners for logout links
function attachLogoutHandler() {
    document.querySelectorAll('.logout-link').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    });
}

// Protect a page or action: if not logged in, redirect to login with redirect param
function requireLogin(redirectTo) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = `/login-signup.html?redirect=${encodeURIComponent(redirectTo)}`;
        return false;
    }
    return true;
}

// Set user avatar: show profile image if available, else initial
function setUserAvatar() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('setUserAvatar: user object =', user);
    const avatars = document.querySelectorAll('#userAvatar, .user-avatar');
    if (!avatars.length) return;

    avatars.forEach(avatar => {
        avatar.innerHTML = '';
        if (user.profileImage) {
            const img = document.createElement('img');
            img.src = user.profileImage;
            img.alt = 'Profile';
            img.className = 'avatar-img';
            avatar.appendChild(img);
        } else {
            let initial = '?';
            if (user.name && user.name.trim()) {
                initial = user.name.trim()[0].toUpperCase();
            } else if (user.email && user.email.trim()) {
                initial = user.email.trim()[0].toUpperCase();
            }
            avatar.textContent = initial;
        }
    });
}

// On every page load, update navbar, attach logout handler, and set avatar
window.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    attachLogoutHandler();
    setUserAvatar();
});

// Export for inline event handlers
window.requireLogin = requireLogin;
window.logout = logout;
window.updateNavbar = updateNavbar;
window.setUserAvatar = setUserAvatar;
