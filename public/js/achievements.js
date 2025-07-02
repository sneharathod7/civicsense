// Expanded Badge Definitions
const BADGES = {
    reports: [
        { 
            name: 'First Report', 
            description: 'Submit your first report', 
            requirement: 1, 
            icon: 'fa-file-alt',
            points: 10
        },
        { 
            name: 'Active Reporter', 
            description: 'Submit 5 reports', 
            requirement: 5, 
            icon: 'fa-files-medical',
            points: 50
        },
        { 
            name: 'Dedicated Reporter', 
            description: 'Submit 25 reports', 
            requirement: 25, 
            icon: 'fa-clipboard-list',
            points: 250
        },
        { 
            name: 'Expert Reporter', 
            description: 'Submit 100 reports', 
            requirement: 100, 
            icon: 'fa-clipboard-check',
            points: 1000
        }
    ],
    resolutions: [
        { 
            name: 'Problem Solver', 
            description: 'Get your first report resolved', 
            requirement: 1, 
            icon: 'fa-check-circle',
            points: 25
        },
        { 
            name: 'Solution Seeker', 
            description: 'Get 10 reports resolved', 
            requirement: 10, 
            icon: 'fa-check-double',
            points: 250
        },
        { 
            name: 'Change Maker', 
            description: 'Get 50 reports resolved', 
            requirement: 50, 
            icon: 'fa-award',
            points: 1250
        }
    ],
    engagement: [
        { 
            name: 'Engaged Citizen', 
            description: 'Earn your first 100 points', 
            requirement: 100, 
            icon: 'fa-star',
            points: 50
        },
        { 
            name: 'Active Citizen', 
            description: 'Earn 500 points', 
            requirement: 500, 
            icon: 'fa-stars',
            points: 250
        },
        { 
            name: 'Super Citizen', 
            description: 'Earn 1000 points', 
            requirement: 1000, 
            icon: 'fa-crown',
            points: 500
        }
    ],
    profile: [
        { 
            name: 'Profile Pioneer', 
            description: 'Complete your profile', 
            requirement: 1, 
            icon: 'fa-user-check',
            points: 20
        },
        { 
            name: 'Profile Pro', 
            description: 'Add a profile picture', 
            requirement: 1, 
            icon: 'fa-portrait',
            points: 30
        }
    ]
};

// Points system
const POINTS = {
    newReport: 10,
    reportResolved: 50,
    reportUpvoted: 5,
    commentPosted: 2
};

// DOM Elements
const totalReportsEl = document.getElementById('totalReports');
const resolvedReportsEl = document.getElementById('resolvedReports');
const totalPointsEl = document.getElementById('totalPoints');
const totalBadgesEl = document.getElementById('totalBadges');
const badgesContainerEl = document.getElementById('badgesContainer');
const roadmapContainerEl = document.getElementById('roadmapContainer');
const pointsHistoryTableEl = document.getElementById('pointsHistoryTable');
const badgeProgressEl = document.getElementById('badgeProgress');
const nextMilestoneEl = document.getElementById('nextMilestone');
const ddUserNameEl = document.getElementById('ddUserName');
const ddUserEmailEl = document.getElementById('ddUserEmail');
const userAvatarEl = document.getElementById('userAvatar');

// Theme toggle functionality
function setupThemeToggle() {
    const themeSwitch = document.getElementById('themeSwitch');
    if (!themeSwitch) return;

    // Set initial state
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    themeSwitch.checked = currentTheme === 'dark';

    // Handle theme toggle
    themeSwitch.addEventListener('change', () => {
        const newTheme = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// Check authentication and load user data
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.isAuthenticated()) {
        window.location.href = '/citizen-login.html';
        return;
    }

    try {
        // Load user data
        await loadUserData();
        await loadAchievements();
        setupThemeToggle();
        setupLogoutHandler();
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('error', 'Failed to initialize page');
    }
});

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout(); // Use the logout function from auth.js
        });
    }
}

// Load user data
async function loadUserData() {
    try {
        const token = window.getToken();
        if (!token) {
            throw new Error('No auth token found');
        }

        const response = await fetch('/api/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        
        if (userData.success) {
            // Update user data in localStorage and update UI
            localStorage.setItem('user', JSON.stringify(userData.data));
            updateUserInterface(userData.data);
            
            // Use the global setUserAvatar function from auth.js
            window.setUserAvatar();
        } else {
            throw new Error(userData.message || 'Failed to load user data');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('error', 'Failed to load user data');
        throw error;
    }
}

// Update user interface with user data
function updateUserInterface(user) {
    // Update dropdown user info
    ddUserNameEl.textContent = `${user.firstName} ${user.lastName}`;
    ddUserEmailEl.textContent = user.email;
    
    // Avatar is now handled by auth.js setUserAvatar function
}

// Load all achievement data
async function loadAchievements() {
    try {
        const token = window.getToken();
        if (!token) {
            throw new Error('No auth token found');
        }

        console.log('Fetching achievements with token:', token.substring(0, 10) + '...');

        const response = await fetch('/api/v1/achievements', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to fetch achievements');
        }

        const achievementsData = await response.json();
        console.log('Raw achievements data:', achievementsData);
        
        if (achievementsData.success) {
            const data = achievementsData.data;
            
            updateStats(data);
            renderBadges(data.badges || []);
            renderRoadmap(data);
            renderPointsHistory(data.pointsHistory || []);
            updateProgressIndicators(data);
        } else {
            throw new Error('Failed to load achievements data');
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
        showToast('error', 'Failed to load achievements');
    }
}

// Update statistics with animations
function updateStats(data) {
    const stats = [
        { el: totalReportsEl, value: data.totalReports },
        { el: resolvedReportsEl, value: data.resolvedReports },
        { el: totalPointsEl, value: data.points },
        { el: totalBadgesEl, value: (data.badges || []).length }
    ];

    stats.forEach(stat => {
        if (stat.el) {
            animateNumber(stat.el, 0, stat.value || 0);
        }
    });
}

// Animate number counting up
function animateNumber(element, start, end) {
    const duration = 1000;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Render badges with animations
function renderBadges(badges = []) {
    if (!badgesContainerEl) return;
    
    badgesContainerEl.innerHTML = '';
    
    if (!badges || badges.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center text-muted p-4';
        emptyState.innerHTML = `
            <i class="fas fa-award fa-3x mb-3"></i>
            <h5>No Badges Yet</h5>
            <p>Keep participating to earn your first badge!</p>
        `;
        badgesContainerEl.appendChild(emptyState);
        return;
    }
    
    badges.forEach((badge, index) => {
        const badgeEl = createBadgeElement(badge);
        badgeEl.style.animation = `fadeInUp ${0.3 + index * 0.1}s ease-out forwards`;
        badgesContainerEl.appendChild(badgeEl);
    });
}

// Create badge element
function createBadgeElement(badge) {
    const div = document.createElement('div');
    div.className = 'badge-item earned fade-in-up';
    
    div.innerHTML = `
        <div class="badge-icon">
            <i class="fas ${getBadgeIcon(badge.name)} fa-2x"></i>
        </div>
        <div class="badge-info">
            <h5>${badge.name}</h5>
            <p>${badge.description || ''}</p>
            <small>Earned ${formatDate(badge.earnedAt)}</small>
        </div>
    `;
    
    return div;
}

// Get badge icon based on name
function getBadgeIcon(badgeName) {
    const iconMap = {
        'First Report': 'fa-file-alt',
        'Active Reporter': 'fa-files-medical',
        'Dedicated Reporter': 'fa-clipboard-list',
        'Expert Reporter': 'fa-clipboard-check',
        'Problem Solver': 'fa-check-circle',
        'Solution Seeker': 'fa-check-double',
        'Change Maker': 'fa-award'
    };
    
    return iconMap[badgeName] || 'fa-medal';
}

// Render roadmap with current progress
function renderRoadmap(data) {
    if (!roadmapContainerEl) return;
    
    roadmapContainerEl.innerHTML = '';
    
    // Calculate progress for each badge type
    const progress = {
        reports: data.totalReports || 0,
        resolutions: data.resolvedReports || 0,
        engagement: data.points || 0
    };
    
    // Create sections for each badge type
    Object.entries(BADGES).forEach(([type, badges]) => {
        // Skip profile badges
        if (type === 'profile') return;
        const section = document.createElement('div');
        section.className = 'mb-4';
        section.innerHTML = `<h5 class="mb-3">${type.charAt(0).toUpperCase() + type.slice(1)} Badges</h5>`;
        
        const badgesList = document.createElement('div');
        badgesList.className = 'list-group';
        
        badges.forEach(badge => {
            let currentProgress, earned;
            
            switch(type) {
                case 'reports':
                    currentProgress = progress.reports;
                    earned = currentProgress >= badge.requirement;
                    break;
                case 'resolutions':
                    currentProgress = progress.resolutions;
                    earned = currentProgress >= badge.requirement;
                    break;
                case 'engagement':
                    currentProgress = progress.engagement;
                    earned = currentProgress >= badge.requirement;
                    break;
                default:
                    currentProgress = 0;
                    earned = false;
            }
            
            badgesList.appendChild(createRoadmapItem(badge, earned, currentProgress));
        });
        
        section.appendChild(badgesList);
        roadmapContainerEl.appendChild(section);
    });
}

// Create roadmap item
function createRoadmapItem(badge, earned, currentProgress) {
    const div = document.createElement('div');
    div.className = `roadmap-item ${earned ? 'earned' : ''}`;
    
    // Calculate progress percentage
    const progressPercentage = Math.min(
        (currentProgress / badge.requirement) * 100, 
        100
    );
    
    // Determine progress text
    const progressText = earned 
        ? 'Completed' 
        : `${currentProgress}/${badge.requirement}`;
    
    div.innerHTML = `
        <div class="badge-icon">
            <i class="fas ${getBadgeIcon(badge.name)}"></i>
        </div>
        <div class="badge-info">
            <h5>${badge.name}</h5>
            <p>${badge.description}</p>
            <div class="progress">
                <div class="progress-bar ${earned ? 'bg-success' : ''}" 
                     role="progressbar" 
                     style="width: ${progressPercentage}%" 
                     aria-valuenow="${progressPercentage}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${progressText}
                </div>
            </div>
        </div>
        <div class="badge-percentage">
            ${Math.round(progressPercentage)}%
        </div>
    `;
    
    return div;
}

// Update progress indicators
function updateProgressIndicators(data) {
    if (badgeProgressEl) {
        const nextBadgePoints = Math.ceil(data.points / 100) * 100;
        const progress = (data.points / nextBadgePoints) * 100;
        badgeProgressEl.style.width = `${Math.min(progress, 100)}%`;
        badgeProgressEl.setAttribute('aria-valuenow', progress);
        
        if (nextMilestoneEl) {
            nextMilestoneEl.textContent = `Next milestone: ${nextBadgePoints} points`;
        }
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Render points history with animations
function renderPointsHistory(history) {
    if (!pointsHistoryTableEl) return;
    
    pointsHistoryTableEl.innerHTML = '';
    
    if (!history || history.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="3" class="text-center text-muted p-4">
                <i class="fas fa-history fa-2x mb-2"></i>
                <p class="mb-0">No points history yet. Start earning points!</p>
            </td>
        `;
        pointsHistoryTableEl.appendChild(emptyRow);
        return;
    }
    
    // Sort history by date (newest first) and render each entry
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .forEach((entry, index) => {
              const row = document.createElement('tr');
              row.className = 'fade-in-up';
              row.style.animation = `fadeInUp ${0.3 + index * 0.05}s ease-out forwards`;
              
              row.innerHTML = `
                  <td>${formatDate(entry.timestamp)}</td>
                  <td class="${entry.type === 'earned' ? 'text-success' : 'text-danger'}">
                      ${entry.type === 'earned' ? '+' : '-'}${entry.points}
                  </td>
                  <td>${entry.reason}</td>
              `;
              
              pointsHistoryTableEl.appendChild(row);
          });
}

// Show toast notification
function showToast(type, message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = createToast(type, message);
    toastContainer.appendChild(toast);
    
    // Initialize Bootstrap toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Create toast container if it doesn't exist
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

// Create individual toast element
function createToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    return toast;
} 