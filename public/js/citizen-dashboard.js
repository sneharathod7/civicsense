document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/citizen-login.html';
    return;
  }

  // Initialize user data and avatar
  await initializeUserData();
  
  // Fetch and display reports
  await fetchReports();

  // Setup event listeners
  setupEventListeners();
  
  // Animate metric values
  animateMetricValues();
  
  // Fetch achievements data
  await fetchAchievements();
});

// Add this function at the top of the file for debugging
function debugLocalStorage() {
  console.group('🔍 Local Storage Debug');
  try {
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    const debugKeys = ['userId', 'userEmail', 'token', 'user'];
    debugKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value ? 'Present' : 'Missing');
      if (value) {
        try {
          console.log(`${key} parsed:`, JSON.parse(value));
        } catch {
          console.log(`${key} value:`, value);
        }
      }
    });
  } catch (error) {
    console.error('Error debugging localStorage:', error);
  }
  console.groupEnd();
}

// Global utility function for consistent location formatting across dashboard components
function formatLocation(location) {
  if (!location) return 'Location not available';

  // If location is a string, strip any leading "Point" text for cleanliness
  if (typeof location === 'string') {
    return location.replace(/^Point,?\s*/i, '').trim();
  }

  if (typeof location === 'object') {
    // 1️⃣ Prefer explicit address-like fields if present
    const addressKeys = ['address', 'formattedAddress', 'fullAddress', 'display_name', 'displayName'];
    for (const key of addressKeys) {
      if (location[key]) return location[key];
    }

    // 2️⃣ GeoJSON – coordinates array is [lng, lat]
    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      const [lng, lat] = location.coordinates;
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    // 3️⃣ Separate latitude / longitude props
    if (location.latitude !== undefined && location.longitude !== undefined) {
      return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }

    // 4️⃣ Fallback – join other meaningful values except technical fields
    return Object.entries(location)
      .filter(([k, v]) => k !== 'type' && k !== 'coordinates' && v)
      .map(([_, v]) => Array.isArray(v) ? v.join(', ') : v)
      .join(', ');
  }

  return String(location);
}

async function initializeUserData() {
  try {
    debugLocalStorage(); // Add this line to debug localStorage

    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const { data } = await response.json();
    
    // Update user info in header with null checks
    const ddUserName = document.getElementById('ddUserName');
    const ddUserEmail = document.getElementById('ddUserEmail');
    const greeting = document.getElementById('greeting');

    if (ddUserName) {
      ddUserName.textContent = `${data.firstName} ${data.lastName}`;
    } else {
      console.warn('Element #ddUserName not found');
    }

    if (ddUserEmail) {
      ddUserEmail.textContent = data.email;
    } else {
      console.warn('Element #ddUserEmail not found');
    }
    
    // Update greeting with animation and null check
    if (greeting) {
      greeting.style.opacity = '0';
      greeting.innerText = `🎉 Welcome back, ${data.firstName}! 👋`;
      greeting.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (greeting) greeting.style.opacity = '1';
      }, 100);
    } else {
      console.warn('Element #greeting not found');
    }

    // Update avatar
    updateAvatarDisplay(data.photo, data.firstName, data.lastName);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('userId', data._id);

  } catch (error) {
    console.error('Initialization error:', error);
    showToast('error', 'Failed to initialize user data');
    window.location.href = '/citizen-login.html';
  }
}

function updateAvatarDisplay(photoUrl, firstName, lastName) {
  const userAvatar = document.getElementById('userAvatar');
  
  if (!userAvatar) {
    console.warn('Element #userAvatar not found');
    return;
  }
  
  if (photoUrl) {
    // If there's a photo URL, use it
    userAvatar.src = `/uploads/${photoUrl}`;
  } else if (firstName && lastName) {
    // If no photo but we have a name, use initials
    const initialsUrl = generateInitialsAvatar(firstName, lastName);
    userAvatar.src = initialsUrl;
  } else {
    // Fallback to a default avatar if no photo or name
    userAvatar.src = '/images/default-avatar.png';
  }
}

function generateInitialsAvatar(firstName, lastName) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  // Draw background
  context.fillStyle = '#0d6efd';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.font = 'bold 80px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`;
  context.fillText(initials, canvas.width/2, canvas.height/2);

  return canvas.toDataURL('image/png');
}

async function fetchReports() {
  try {
    console.group('🔍 Fetching Reports');
    console.log('Starting report fetch process');

    // Get authentication token
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No authentication token found');
      showToast('error', 'Please log in again');
      window.location.href = '/citizen-login.html';
      return [];
    }

    console.log('Fetching reports with token:', token.substring(0, 10) + '...');

    // Make authenticated request to fetch reports
    const response = await fetch('/api/reports', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'same-origin'
    });
    
    console.log('Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('API Response:', result);

    if (!result.success) {
      console.error('API returned unsuccessful response:', result);
      showToast('error', result.message || 'Failed to fetch reports');
      return [];
    }

    let reports = Array.isArray(result.data) ? result.data : [];
    console.log(`Successfully fetched ${reports.length} reports`);
    
    // Validate each report has required fields and adapt for UI
    const validReports = reports
      .filter(report => {
        // Check for required fields, accepting dateReported as fallback for createdAt
        const hasRequiredFields = report && 
                               report._id && 
                               report.title && 
                               report.status && 
                               (report.createdAt || report.dateReported);
        
        if (!hasRequiredFields) {
          console.warn('Skipping invalid report - missing required fields:', report);
          return false;
        }
        return true;
      })
      .map(report => {
        try {
          // Ensure we have a valid date field
          if (!report.createdAt && report.dateReported) {
            report.createdAt = report.dateReported;
          }
          return adaptReportForUI(report);
        } catch (error) {
          console.error('Error adapting report:', error, 'Report:', report);
          return null;
        }
      })
      .filter(report => report !== null);

    console.log('Valid Reports:', {
      validReportsCount: validReports.length,
      invalidReportsCount: reports.length - validReports.length,
      details: validReports.map(r => ({
        id: r._id,
        title: r.title,
        status: r.status,
        dateReported: r.dateReported || r.createdAt
      }))
    });

    // Update UI with the reports data
    if (validReports.length > 0) {
      populateStats(validReports);
      populateRecent(validReports);
      updateWelcomeBanner(validReports);
      createQuickActions(validReports);
    } else {
      console.log('No valid reports to display');
      // Ensure recent activity section shows appropriate message
      const recentActivityContainer = document.getElementById('recentActivityContainer');
      if (recentActivityContainer) {
        recentActivityContainer.innerHTML = `
          <div class="col-12 text-center text-muted p-4">
            <i class="fas fa-info-circle fa-3x mb-3 text-primary"></i>
            <p class="lead">No recent activity yet</p>
            <p class="text-muted">Start reporting to see your impact and track your progress!</p>
            <a href="/report.html" class="btn btn-primary mt-2">
              <i class="fas fa-plus me-2"></i>Create First Report
            </a>
          </div>
        `;
      }
    }
    
    return validReports;
    
  } catch (error) {
    console.error('Error in fetchReports:', error);
    
    // Show user-friendly error toast
    showToast('error', 'Unable to load your recent activities. Please try again later.');
    
    // Update UI with error state
    const recentActivityContainer = document.getElementById('recentActivityContainer');
    if (recentActivityContainer) {
      recentActivityContainer.innerHTML = `
        <div class="col-12 text-center text-danger p-4">
          <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
          <p class="lead">Oops! Something went wrong</p>
          <p class="text-muted">We couldn't load your recent activities. Please refresh or try again later.</p>
          <button onclick="window.location.reload()" class="btn btn-primary mt-2">
            <i class="fas fa-sync me-2"></i>Refresh
          </button>
        </div>
      `;
    }
    
    return [];
  } finally {
    console.groupEnd();
  }
}

async function fetchAchievements() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No auth token found');
    }

    // Debug: Log the start of achievement fetch
    console.group('Fetching Achievements');
    console.log('Authentication Token:', token ? 'Present' : 'Missing');

    const response = await fetch('/api/v1/achievements', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });

    console.log('Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch Error:', errorText);
      throw new Error('Failed to fetch achievements');
    }

    const achievementsData = await response.json();
    
    // Detailed logging of achievements data
    console.log('Raw Achievements Data:', JSON.stringify(achievementsData, null, 2));
    
    if (achievementsData.success) {
      const data = achievementsData.data;
      
      // Extensive logging of individual data points
      console.log('Total Reports:', data.totalReports);
      console.log('Resolved Reports:', data.resolvedReports);
      console.log('Total Points:', data.points);
      console.log('Badges Count:', data.badges ? data.badges.length : 'No badges');
      
      // Detailed badge logging
      if (data.badges) {
        data.badges.forEach((badge, index) => {
          console.log(`Badge ${index + 1}:`, {
            name: badge.name,
            category: badge.category,
            description: badge.description,
            earnedAt: badge.earnedAt,
            progress: badge.progress
          });
        });
      }

      // Ensure badges are passed
      updateBadges(data.badges || []);
      updateImpactMetrics(data);
      
      console.groupEnd(); // Close the console group
    } else {
      console.error('Achievements fetch unsuccessful:', achievementsData);
      throw new Error('Failed to load achievements data');
    }
  } catch (error) {
    console.error('Error loading achievements:', error);
    showToast('error', 'Failed to load achievements');
    
    // Fallback: ensure badges container is cleared
    const badgesContainer = document.getElementById('badgesContainer');
    if (badgesContainer) {
      badgesContainer.innerHTML = `
        <div class="col-12 text-center text-muted">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Unable to load achievements. Please try again later.
        </div>
      `;
    }
  }
}

function adaptReportForUI(r) {
  // Map backend status to UI status with more granular stages
  const statusMap = { 
    'pending': 'reported',
    'active': 'in-progress', // Map 'active' to 'in-progress'
    'verified': 'verified',
    'assigned': 'assigned',
    'in-progress': 'in-progress',
    'resolved': 'resolved',
    'rejected': 'reported' // Reset to reported if rejected
  };
  let uiStatus = statusMap[r.status] || 'reported';

  const reportedDateObj = r.createdAt ? new Date(r.createdAt) : new Date();
  const updatedDateObj = r.updatedAt ? new Date(r.updatedAt) : reportedDateObj;
  const resolvedDateObj = r.resolvedAt ? new Date(r.resolvedAt) : (r.status === 'resolved' ? updatedDateObj : null);

  return {
    id: r._id,
    title: r.title || 'Untitled',
    description: r.description || '',
    category: r.category || 'Others',
    location: r.location || null,
    status: uiStatus,
    dateReported: reportedDateObj.toISOString(),
    dateUpdated: updatedDateObj.toISOString(),
    dateResolved: resolvedDateObj ? resolvedDateObj.toISOString() : null,
    assignedTo: r.assignedTo || '',
    lastUpdate: r.lastUpdate || '',
    photos: r.images || [],
    userMobile: r.userMobile || ''
  };
}

function updateWelcomeBanner(reports = []) {
  const welcomeContainer = document.getElementById('welcomeContainer');
  
  // Get user data from localStorage
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = userData.firstName || 'Citizen';

  // Personalized greeting based on time of day
  const currentHour = new Date().getHours();
  let timeBasedGreeting = 'Good day';
  if (currentHour < 12) timeBasedGreeting = 'Good morning';
  else if (currentHour < 18) timeBasedGreeting = 'Good afternoon';
  else timeBasedGreeting = 'Good evening';

  // Calculate user's activity metrics for THIS MONTH
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  
  const monthReports = reports.filter(r => {
    const reportDate = new Date(r.dateReported);
    return reportDate.getMonth() === thisMonth && 
           reportDate.getFullYear() === thisYear;
  });

  // Detailed status breakdown for this month
  const monthlyStats = {
    total: monthReports.length,
    resolved: monthReports.filter(r => r.status === 'resolved').length,
    pending: monthReports.filter(r => r.status !== 'resolved').length
  };

  // Calculate percentages with fallback
  const calculatePercentage = (value, total) => 
    total > 0 ? Math.round((value / total) * 100) : 0;

  const resolvedPercentage = calculatePercentage(monthlyStats.resolved, monthlyStats.total);
  const pendingPercentage = calculatePercentage(monthlyStats.pending, monthlyStats.total);

  // Determine impact level based on monthly activity
  const getImpactLevel = (total) => {
    if (total === 0) return { 
      level: 'Civic Starter', 
      message: 'Start making a difference!',
      icon: '🌱'
    };
    if (total <= 1) return { 
      level: 'Community Contributor', 
      message: 'Every report counts!',
      icon: '🌟'
    };
    if (total <= 3) return { 
      level: 'Civic Champion', 
      message: 'You\'re making real impact!',
      icon: '🏆'
    };
    return { 
      level: 'Community Hero', 
      message: 'Incredible civic engagement!',
      icon: '🌈'
    };
  };

  const impactLevel = getImpactLevel(monthlyStats.total);

  // Update welcome section
  welcomeContainer.innerHTML = `
    <div class="row align-items-center">
      <div class="col-md-8">
        <h2 class="mb-3 animate__animated animate__fadeIn">
          ${timeBasedGreeting}, <span id="welcomeUserName">${firstName}</span>! 👋
        </h2>
        <div class="welcome-stats d-flex gap-4 mb-3">
          <div class="stat-item">
            <i class="fas fa-file-alt text-primary me-2"></i>
            <span>${monthlyStats.total} Reports this month</span>
          </div>
          <div class="stat-item">
            <i class="fas fa-check-circle text-success me-2"></i>
            <span>${monthlyStats.resolved} Issues Resolved</span>
          </div>
        </div>
        <p class="text-muted animate__animated animate__fadeInUp animate__delay-1s">
          ${impactLevel.icon} ${impactLevel.level}: ${impactLevel.message}
        </p>
      </div>
      <div class="col-md-4 text-end">
        <div class="welcome-card p-3 rounded bg-light shadow-sm">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Your Impact</h5>
            <span class="badge bg-primary">${new Date().toLocaleString('default', { month: 'long' })} ${thisYear}</span>
          </div>
          
          <div class="progress-group mb-2">
            <div class="d-flex justify-content-between">
              <span class="text-success">Resolved</span>
              <span class="text-success">${monthlyStats.resolved}</span>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar bg-success" role="progressbar" 
                   style="width: ${resolvedPercentage}%" 
                   aria-valuenow="${resolvedPercentage}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"></div>
            </div>
          </div>
          
          <div class="progress-group">
            <div class="d-flex justify-content-between">
              <span class="text-danger">Pending</span>
              <span class="text-danger">${monthlyStats.pending}</span>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar bg-danger" role="progressbar" 
                   style="width: ${pendingPercentage}%" 
                   aria-valuenow="${pendingPercentage}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"></div>
            </div>
          </div>
          
          ${monthlyStats.total === 0 ? `
            <div class="text-center mt-3">
              <small class="text-muted">
                <i class="fas fa-info-circle me-2"></i>
                No reports this month. Start making a difference!
              </small>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Quick Action Container
  const quickActionContainer = document.getElementById('quickActionContainer');
  quickActionContainer.innerHTML = `
    <div class="row">
      <div class="col-12">
        <h5 class="mb-3">Quick Actions</h5>
      </div>
      <div class="col-md-4 mb-3">
        <a href="/report.html" class="btn btn-outline-primary w-100">
          <i class="fas fa-plus-circle me-2"></i>Create New Report
        </a>
      </div>
      <div class="col-md-4 mb-3">
        <a href="/my-reports.html" class="btn btn-outline-secondary w-100">
          <i class="fas fa-list me-2"></i>View My Reports
        </a>
      </div>
      <div class="col-md-4 mb-3">
        <a href="/achievements.html" class="btn btn-outline-success w-100">
          <i class="fas fa-trophy me-2"></i>Check Achievements
        </a>
      </div>
    </div>
  `;

  // Animate the welcome section
  welcomeContainer.classList.add('animate__animated', 'animate__fadeIn');
}

function getBadgeTitle(reportCount) {
  const motivationalMessages = [
    "Every report is a step towards positive change!",
    "Your voice matters in building a better community.",
    "Keep reporting and making a difference!",
    "You're a catalyst for community improvement!",
    "Small actions lead to big transformations."
  ];

  if (reportCount >= 100) {
    return "🏆 You're an Expert Reporter! " + motivationalMessages[4];
  }
  if (reportCount >= 25) {
    return "🌟 You're a Dedicated Reporter! " + motivationalMessages[3];
  }
  if (reportCount >= 5) {
    return "💡 You're an Active Reporter! " + motivationalMessages[2];
  }
  if (reportCount >= 1) {
    return "🌈 You're a Civic Champion! " + motivationalMessages[1];
  }
  return "🚀 " + motivationalMessages[0];
}

function updateImpactMetrics(data = {}) {
  // Enhanced impact metrics with more context
  const impactData = {
    totalReports: data.totalReports || 0,
    resolvedReports: data.resolvedReports || 0,
    resolutionTime: calculateAvgResolutionTime(data),
    achievements: { badges: data.badges || [] }, // Correctly pass badges
    points: data.points || 0, // Pass total points
    impactLevel: calculateImpactLevel({
      points: data.points || 0, // Pass total points to calculateImpactLevel
      reports: data.reports || [],
      achievements: { badges: data.badges || [] } // Ensure badges are passed for level calculation
    })
  };

  // Create impact summary
  renderImpactSummary(impactData);

  // Animate individual metrics
  animateImpactMetrics(impactData);
}

function calculateImpactLevel(userData) {
  console.log('🔍 Calculating Impact Level - Input Data:', JSON.stringify(userData, null, 2));
  
  // Defensive check for userData and points
  if (!userData || typeof userData.points !== 'number') {
    console.error('❌ Invalid user data for impact level calculation');
    return {
      name: 'Civic Starter',
      minPoints: 0,
      maxPoints: 99,
      color: 'text-muted',
      icon: '🌱',
      description: 'Start your civic journey',
      points: 0,
      nextLevel: {
        name: 'Civic Champion',
        minPoints: 100
      }
    };
  }

  // Comprehensive Citizen Level Mapping
  const levels = [
    { 
      name: 'Emerging Citizen', 
      minPoints: 0, 
      maxPoints: 49, 
      color: 'text-muted', 
      icon: '🌱',
      description: 'Your civic journey begins. Every report counts!'
    },
    { 
      name: 'Community Contributor', 
      minPoints: 50, 
      maxPoints: 99, 
      color: 'text-primary', 
      icon: '🌿',
      description: 'Making a difference, one report at a time.'
    },
    { 
      name: 'Civic Champion', 
      minPoints: 100, 
      maxPoints: 199, 
      color: 'text-success', 
      icon: '🌳',
      description: 'Your commitment is transforming the community.'
    },
    { 
      name: 'Urban Innovator', 
      minPoints: 200, 
      maxPoints: 499, 
      color: 'text-warning', 
      icon: '🏆',
      description: 'Leading positive change through active participation.'
    },
    { 
      name: 'Community Transformer', 
      minPoints: 500, 
      maxPoints: Infinity, 
      color: 'text-danger', 
      icon: '🚀',
      description: 'A true catalyst for community improvement!'
    }
  ];

  // Use points directly from the input data if available, otherwise calculate
  const totalPoints = userData.points !== undefined ? userData.points : (
    calculateImpactPoints(userData.reports || []) +
    calculateAchievementPoints(userData.achievements || {})
  );

  console.log('Calculated totalPoints in calculateImpactLevel:', totalPoints);

  // Find the current level
  const currentLevel = levels.find(level => 
    totalPoints >= level.minPoints && totalPoints <= level.maxPoints
  ) || levels[0];

  console.log('Current Level found:', currentLevel.name);

  // Determine next level
  const currentLevelIndex = levels.indexOf(currentLevel);
  const nextLevel = levels[Math.min(currentLevelIndex + 1, levels.length - 1)];

  const finalImpactLevel = {
    ...currentLevel,
    points: totalPoints,
    nextLevel: {
      name: nextLevel.name,
      minPoints: nextLevel.minPoints
    }
  };

  console.log('Final impactLevel object to be returned:', JSON.stringify(finalImpactLevel, null, 2));
  return finalImpactLevel;
}

function calculateAchievementPoints(achievements) {
  // Comprehensive point system for achievements
  const achievementPointMap = {
    // Report-based achievements
    'first-report': 10,
    'first-resolved-report': 20,
    'five-reports': 30,
    'ten-reports': 50,
    'twenty-reports': 100,
    
    // Quality-based achievements
    'detailed-report': 15,
    'high-impact-report': 25,
    
    // Community engagement
    'community-hero': 200,
    'consistent-reporter': 75,
    
    // Special recognitions
    'problem-solver': 50,
    'city-improver': 100
  };

  // Calculate points from badges
  const badgePoints = (achievements?.badges || [])
    .reduce((total, badge) => {
      const points = achievementPointMap[badge.key] || 0;
      return total + points;
    }, 0);

  return badgePoints;
}

function calculateImpactPoints(reports) {
  // More sophisticated impact point calculation
  const impactWeights = {
    'resolved': 20,     // Highest points for resolved reports
    'in-progress': 10,  // Moderate points for in-progress reports
    'verified': 5,      // Some points for verified reports
    'reported': 1       // Minimal points for newly reported issues
  };

  // Calculate points based on report status and complexity
  const points = reports.reduce((total, report) => {
    const basePoints = impactWeights[report.status] || 1;
    
    // Bonus points for different categories
    const categoryBonus = {
      'infrastructure': 1.5,
      'environment': 1.3,
      'public-safety': 1.4,
      'health': 1.6,
      'transportation': 1.2,
      'others': 1.0
    };

    const categoryMultiplier = categoryBonus[report.category?.toLowerCase()] || 1.0;
    
    return total + (basePoints * categoryMultiplier);
  }, 0);

  return Math.round(points);
}

function renderImpactSummary(impactData) {
  console.log('📊 Rendering Impact Summary - Input Data:', JSON.stringify(impactData, null, 2));
  
  try {
    const impactSummaryElement = document.getElementById('impactSummary');
    if (!impactSummaryElement) {
      console.error('❌ Impact Summary element not found');
      return;
    }

    const { impactLevel, achievements } = impactData;

    // Debug values used for rendering
    console.log('Impact Level Name:', impactLevel?.name);
    console.log('Impact Level Description:', impactLevel?.description);
    console.log('Impact Level Points:', impactLevel?.points);
    console.log('Impact Level Next Level Name:', impactLevel?.nextLevel?.name);
    console.log('Impact Level Next Level Min Points:', impactLevel?.nextLevel?.minPoints);
    console.log('Achievements Badges Length:', achievements?.badges?.length || 0);

    // Prepare badges HTML
    const badgesHtml = (achievements?.badges || [])
      .map(badge => `
        <div class="badge-item" title="${badge.description || 'Achievement'}">
          <img src="${badge.icon || '/images/default-badge.png'}" alt="${badge.name}">
          <span class="badge-name">${badge.name}</span>
        </div>
      `).join('') || '<p class="text-muted">No badges earned yet</p>';

    const generatedHtml = `
      <div class="impact-card">
        <div class="impact-header">
          <div class="impact-icon ${impactLevel.color}">
            ${impactLevel.icon}
          </div>
          <div class="impact-header-content">
            <h3 class="impact-title">${impactLevel.name}</h3>
            <p class="impact-subtitle">${impactLevel.description}</p>
          </div>
        </div>
        
        <div class="impact-progress">
          <div class="progress">
            <div 
              class="progress-bar ${impactLevel.color}" 
              role="progressbar" 
              style="width: ${Math.min(100, (impactLevel.points / impactLevel.nextLevel.minPoints) * 100)}%"
              aria-valuenow="${impactLevel.points}" 
              aria-valuemin="${impactLevel.minPoints}" 
              aria-valuemax="${impactLevel.nextLevel.minPoints}"
            ></div>
          </div>
          <div class="impact-progress-text">
            ${impactLevel.points} / ${impactLevel.nextLevel.minPoints} points 
            to reach ${impactLevel.nextLevel.name}
          </div>
        </div>
        
        <div class="impact-details">
          <div class="impact-stat">
            <span class="stat-label">Total Points</span>
            <span class="stat-value">${impactLevel.points}</span>
          </div>
          <div class="impact-stat">
            <span class="stat-label">Civic Level</span>
            <span class="stat-value">${impactLevel.name}</span>
          </div>
          <div class="impact-stat">
            <span class="stat-label">Badges Earned</span>
            <span class="stat-value">${achievements?.badges?.length || 0}</span>
          </div>
        </div>
        
        <div class="impact-badges">
          <h4 class="badges-title">Your Achievements</h4>
          <div class="badges-container">
            ${badgesHtml}
          </div>
        </div>
      </div>
    `;

    console.log('Generated HTML for impactSummary:', generatedHtml);

    impactSummaryElement.innerHTML = generatedHtml;

    // Debug: Confirm content insertion
    console.log('impactSummary innerHTML after update:', impactSummaryElement.innerHTML);

    // Add a fallback for missing data
    const totalPoints = impactData.points || 0;
    const badgesCount = impactData.achievements?.badges?.length || 0;
    
    console.log(`📈 Rendering Details: 
        - Total Points: ${totalPoints}
        - Civic Level: ${impactData.impactLevel?.name || 'Unknown'}
        - Badges Earned: ${badgesCount}`);
  } catch (error) {
    console.error('❌ Error rendering impact summary:', error);
  }
}

function animateImpactMetrics(impactData) {
  const animationOptions = {
    duration: 1500,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  };

  // Animate impact metrics with more engaging animations
  const metrics = [
    { 
      element: document.getElementById('totalReports'), 
      value: impactData.totalReports 
    },
    { 
      element: document.getElementById('resolvedReports'), 
      value: impactData.resolvedReports 
    },
    { 
      element: document.getElementById('resolutionTime'), 
      value: impactData.resolutionTime,
      suffix: ' days'
    }
  ];

  metrics.forEach(metric => {
    if (!metric.element) return;

    let start = 0;
    const end = metric.value;
    const duration = animationOptions.duration;
    const suffix = metric.suffix || '';

    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const currentValue = start + (end - start) * (1 - (1 - progress) * (1 - progress));
      
      metric.element.textContent = `${Math.round(currentValue)}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}

function calculateAvgResolutionTime(data) {
  if (!data.resolvedReports || !data.totalResolutionDays) return 0;
  return (data.totalResolutionDays / data.resolvedReports).toFixed(1);
}

function animateMetricValues() {
  const metrics = document.querySelectorAll('.metric-value');
  metrics.forEach(metric => {
    const value = metric.innerText;
    const isPercentage = value.includes('%');
    const numericValue = parseInt(value.replace('%', ''));
    
    metric.innerText = '0' + (isPercentage ? '%' : '');
    
    let current = 0;
    const increment = Math.max(1, Math.floor(numericValue / 30));
    const animationDuration = 1000; // 1 second
    const interval = animationDuration / (numericValue / increment);
    
    const counter = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        current = numericValue;
        clearInterval(counter);
      }
      metric.innerText = current + (isPercentage ? '%' : '');
    }, interval);
  });
}

function populateStats(reports) {
  // Prepare data for stats
  const totalReports = reports.length;
  const resolvedReports = reports.filter(r => r.status === 'resolved').length;
  const inProgressReports = reports.filter(r => r.status === 'in-progress').length;

  // Calculate percentages and impact points
  const resolvedPercentage = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;
  const impactPoints = calculateImpactPoints(reports);

  // Update stat values
  document.getElementById('statReported').textContent = totalReports;
  document.getElementById('statResolved').textContent = resolvedReports;
  document.getElementById('statRate').textContent = `${resolvedPercentage}%`;
  document.getElementById('statPoints').textContent = impactPoints;

  // Animate resolution rate
  animateResolutionRate(resolvedPercentage);
}

function animateResolutionRate(percentage) {
  const rateElement = document.getElementById('statRate');
  let currentPercentage = 0;
  
  const animationDuration = 1500; // 1.5 seconds
  const startTime = performance.now();
  
  function updatePercentage(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);
    
    // Easing function (ease out quad)
    const easedProgress = progress * (2 - progress);
    
    currentPercentage = Math.round(easedProgress * percentage);
    rateElement.textContent = `${currentPercentage}%`;
    
    if (progress < 1) {
      requestAnimationFrame(updatePercentage);
    }
  }
  
  requestAnimationFrame(updatePercentage);
}

function populateRecent(reports) {
  console.group('🕒 Populating Recent Activity');
  console.log('Received Reports:', JSON.stringify(reports, null, 2));

  // Validate input
  if (!Array.isArray(reports)) {
    console.error('Invalid reports data received');
    return;
  }

  // Enhanced logging for reports
  console.log('Reports Details:', reports.map(report => ({
    id: report.id || report._id,
    title: report.title,
    status: report.status,
    createdAt: report.createdAt || report.dateReported,
    isValid: !!(report && (report.id || report._id) && (report.createdAt || report.dateReported))
  })));

  // Get the recent activity container
  const recentActivityContainer = document.getElementById('recentActivityContainer');
  
  if (!recentActivityContainer) {
    console.error('ERROR: Recent activity container not found. Please check the HTML.');
    console.groupEnd();
    return;
  }

  // Clear previous content
  recentActivityContainer.innerHTML = '';
  console.log('Recent Activity Container:', recentActivityContainer);

  // If no reports, show a message
  if (!reports || reports.length === 0) {
    console.log('No reports to display');
    recentActivityContainer.innerHTML = `
      <div class="col-12 text-center text-muted p-4">
        <i class="fas fa-info-circle fa-3x mb-3 text-primary"></i>
        <p class="lead">No recent activity yet</p>
        <p class="text-muted">Start reporting to see your impact and track your progress!</p>
        <a href="/report.html" class="btn btn-primary mt-2">
          <i class="fas fa-plus me-2"></i>Create First Report
        </a>
      </div>
    `;
    console.groupEnd();
    return;
  }

  // Sort reports by most recent first
  const sortedReports = reports
    .filter(report => {
      // Ensure report has required fields, using dateReported as fallback for createdAt
      const hasRequiredFields = report && (report.id || report._id) && (report.createdAt || report.dateReported);
      if (!hasRequiredFields) {
        console.warn('Skipping invalid report - missing required fields:', report);
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Use dateReported as fallback for createdAt when sorting
      const dateA = a.createdAt || a.dateReported;
      const dateB = b.createdAt || b.dateReported;
      return new Date(dateB) - new Date(dateA);
    });

  console.log('Sorted Reports:', sortedReports);

  // Limit to 3 most recent reports
  const recentReports = sortedReports.slice(0, 3);
  console.log('Recent Reports to Display:', recentReports);

  // Status to icon and color mapping
  const statusIcons = {
    'pending': { icon: 'fa-clock', color: 'text-warning' },
    'active': { icon: 'fa-spinner', color: 'text-info' },
    'verified': { icon: 'fa-check-circle', color: 'text-success' },
    'assigned': { icon: 'fa-user-tag', color: 'text-primary' },
    'in-progress': { icon: 'fa-sync', color: 'text-info' },
    'resolved': { icon: 'fa-check-double', color: 'text-success' },
    'reported': { icon: 'fa-flag', color: 'text-warning' }
  };

  // Category to icon mapping
  const categoryIcons = {
    'roads': 'fa-road',
    'sanitation': 'fa-trash-alt',
    'water': 'fa-tint',
    'electricity': 'fa-bolt',
    'parks': 'fa-tree',
    'public-safety': 'fa-shield-alt',
    'other': 'fa-question-circle'
  };

  // Create a document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  // Create HTML for each recent report
  recentReports.forEach((report, index) => {
    try {
      // Use dateReported as fallback if createdAt is not available
      const reportDate = report.createdAt || report.dateReported;
      const createdDate = new Date(reportDate);
      if (isNaN(createdDate.getTime())) {
        console.warn('Invalid date for report:', report.id || report._id, 'using current date');
        createdDate = new Date(); // Fallback to current date
      }
      
      const timeAgo = getTimeAgo(createdDate);
      const { icon, color } = statusIcons[report.status] || { icon: 'fa-question-circle', color: 'text-muted' };
      const statusText = report.status 
        ? report.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        : 'Reported';
      
      const categoryIcon = categoryIcons[report.category?.toLowerCase()] || 'fa-map-marker-alt';
      const categoryText = report.category ? report.category.charAt(0).toUpperCase() + report.category.slice(1) : 'General';
      const locationText = formatLocation(report.location);

      // Create card element
      const cardCol = document.createElement('div');
      cardCol.className = `col-12 ${index < recentReports.length - 1 ? 'mb-3' : ''}`;
      
      cardCol.innerHTML = `
        <div class="card border-0 card-body p-3 hover-lift border-start border-4 border-${color.replace('text-', '')}">
          <div class="d-flex align-items-center">
            <div class="me-3">
              <span class="activity-icon ${color} fs-4">
                <i class="fas ${icon}"></i>
              </span>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-start">
                <h6 class="mb-1 text-dark fw-bold">${report.title || 'Civic Issue Report'}</h6>
                <span class="badge bg-light text-dark small">
                  <i class="fas ${categoryIcon} me-1"></i>${categoryText}
                </span>
              </div>
              <div class="d-flex align-items-center text-muted small mt-1">
                <span class="badge ${color.replace('text-', 'bg-')} me-2">
                  ${statusText}
                </span>
                <i class="far fa-calendar me-1"></i>${timeAgo}
              </div>
              <div class="text-muted small"><i class="fas fa-map-marker-alt me-1"></i>${locationText}</div>
              ${report.description ? `
                <p class="small text-muted mt-2 mb-0 text-truncate" style="max-width: 400px;">
                  ${report.description}
                </p>
              ` : ''}
            </div>
            <div class="ms-3">
              <button class="btn btn-sm btn-outline-primary view-details-btn" 
                      data-report-id="${report.id || report._id}">
                <i class="fas fa-eye me-1"></i>View
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Add event listener for the view details button
      const viewBtn = cardCol.querySelector('.view-details-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openReportDetailsModal(report);
        });
      }
      
      // Make the whole card clickable
      const card = cardCol.querySelector('.card');
      if (card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (!e.target.closest('.view-details-btn')) {
            openReportDetailsModal(report);
          }
        });
      }
      
      fragment.appendChild(cardCol);
      
    } catch (error) {
      console.error('Error creating report card:', error, 'Report:', report);
    }
  });
  
  // Add all cards to the container at once
  recentActivityContainer.appendChild(fragment);

  // Add a view all reports link if there are more than 3 reports
  if (reports.length > 3) {
    const viewAllDiv = document.createElement('div');
    viewAllDiv.className = 'col-12 text-center mt-3';
    viewAllDiv.innerHTML = `
      <a href="/my-reports.html" class="btn btn-outline-primary btn-sm">
        <i class="fas fa-list me-1"></i>View All Reports (${reports.length})
      </a>
    `;
    recentActivityContainer.appendChild(viewAllDiv);
  }
  console.log('Recent activity populated successfully');
  console.groupEnd();
}

function openReportDetailsModal(report) {
  // Utility function for formatting location
  function _formatLocationDeprecated(location) {
    if (!location) return 'Location not available';
    
    // Handle different location formats
    if (typeof location === 'object') {
      if (location.latitude && location.longitude) {
        // Precise coordinates
        return `Point, ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }
      // If it's a complex object, try to extract meaningful information
      return Object.values(location)
        .filter(val => val)
        .join(', ');
    }
    
    // If it's a string, return as is
    return location.toString();
  }

  // Utility function for formatting description
  function formatDescription(description) {
    if (!description) return 'No description provided';
    
    // Handle object descriptions
    if (typeof description === 'object') {
      // Try to extract meaningful text
      const descriptionText = description.text || 
        Object.values(description)
        .filter(val => typeof val === 'string')
        .join(' ');
      
      return descriptionText || 'Detailed description unavailable';
    }
    
    // Truncate long descriptions
    return description.length > 200 
      ? description.substring(0, 200) + '...' 
      : description;
  }

  // Prepare report details with improved formatting
  const details = {
    title: report.title || 'Civic Issue Report',
    status: (report.status || 'Unknown').charAt(0).toUpperCase() + (report.status || 'Unknown').slice(1).toLowerCase(),
    description: formatDescription(report.description),
    location: formatLocation(report.location),
    category: report.category || 'Uncategorized',
    createdAt: report.createdAt 
      ? new Date(report.createdAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) 
      : 'Date not available',
    resolvedAt: report.resolvedAt 
      ? new Date(report.resolvedAt).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }) 
      : null
  };

  // Create modal HTML with improved formatting
  const modalHtml = `
    <div class="modal fade" id="reportDetailsModal" tabindex="-1" aria-labelledby="reportDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="reportDetailsModalLabel">
              <i class="fas fa-file-alt me-2"></i>Report Details
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-8">
                <h4 class="mb-3">${details.title}</h4>
                <div class="mb-3">
                  <strong>Status:</strong> 
                  <span class="badge ${getStatusBadgeClass(details.status)}">${details.status}</span>
                </div>
                <div class="mb-3">
                  <strong>Description:</strong>
                  <p class="text-muted">${details.description}</p>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <strong>Reported On:</strong>
                    <p>${details.createdAt}</p>
                  </div>
                  ${details.resolvedAt ? `
                  <div class="col-md-6">
                    <strong>Resolved On:</strong>
                    <p>${details.resolvedAt}</p>
                  </div>
                  ` : ''}
                </div>
              </div>
              <div class="col-md-4">
                <div class="card">
                  <div class="card-header">
                    <strong>Additional Info</strong>
                  </div>
                  <ul class="list-group list-group-flush">
                    <li class="list-group-item d-flex align-items-center">
                      <i class="fas fa-map-marker-alt me-2"></i>
                      <span class="text-truncate">${details.location}</span>
                    </li>
                    <li class="list-group-item d-flex align-items-center">
                      <i class="fas fa-tags me-2"></i>
                      <span class="text-truncate">${details.category}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <a href="/report-detail.html?reportId=${report.id || report._id}" class="btn btn-primary">
              <i class="fas fa-external-link-alt me-2"></i>View Full Report
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove any existing modal
  const existingModal = document.getElementById('reportDetailsModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Initialize and show the modal using Bootstrap
  const modalElement = document.getElementById('reportDetailsModal');
  const modal = new bootstrap.Modal(modalElement);
  modal.show();

  // Clean up modal after it's hidden
  modalElement.addEventListener('hidden.bs.modal', () => {
    modalElement.remove();
  });
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
  const statusClasses = {
    'pending': 'bg-warning text-dark',
    'active': 'bg-info',
    'verified': 'bg-success',
    'assigned': 'bg-primary',
    'in-progress': 'bg-info',
    'resolved': 'bg-success'
  };
  return statusClasses[status] || 'bg-secondary';
}

function updateBadges(badges = []) {
  try {
    console.group('Updating Badges');
    console.log('Input Badges:', JSON.stringify(badges, null, 2));

    const badgesContainer = document.getElementById('badgesContainer');
    const noBadgesMessage = document.getElementById('noBadgesMessage');

    // Debug: Check DOM elements
    console.log('Badges Container:', badgesContainer ? 'Found' : 'Not Found');
    console.log('No Badges Message:', noBadgesMessage ? 'Found' : 'Not Found');

    // Validate container elements
    if (!badgesContainer) {
      console.error('❌ Badges container not found');
      return;
    }

    if (!noBadgesMessage) {
      console.error('❌ No badges message element not found');
      return;
    }

    // Clear previous badges
    badgesContainer.innerHTML = '';

    // Debug: Check initial container state
    console.log('Initial Container innerHTML:', badgesContainer.innerHTML);

    // Handle empty badges scenario
    if (!badges || badges.length === 0) {
      console.warn('⚠️ No badges to display');
      noBadgesMessage.style.display = 'block';
      return;
    }

    // Hide no badges message
    noBadgesMessage.style.display = 'none';

    // Badge icon and color mapping with fallbacks
    const badgeIcons = {
      'profile': 'fa-user-check',
      'reports': 'fa-file-alt',
      'resolutions': 'fa-check-circle',
      'default': 'fa-trophy'
    };

    const badgeColors = {
      'profile': 'text-primary',
      'reports': 'text-success',
      'resolutions': 'text-info',
      'default': 'text-warning'
    };

    // Create a document fragment for better performance
    const fragment = document.createDocumentFragment();

    // Render badges
    badges.forEach((badge, index) => {
      try {
        // Validate badge object
        if (!badge || typeof badge !== 'object') {
          console.warn(`⚠️ Invalid badge at index ${index}:`, badge);
          return;
        }

        // Determine icon and color
        const iconClass = badgeIcons[badge.category] || badgeIcons['default'];
        const colorClass = badgeColors[badge.category] || badgeColors['default'];

        // Create badge element
        const badgeElement = document.createElement('div');
        badgeElement.classList.add('col-md-3', 'col-6');
        
        badgeElement.innerHTML = `
          <div class="badge-card text-center">
            <div class="badge-icon">
              <i class="fas ${iconClass} ${colorClass} fa-2x"></i>
            </div>
            <h6 class="mt-3">${badge.name || 'Unknown Badge'}</h6>
            <p class="text-muted small mb-0">${badge.description || 'No description'}</p>
            <small class="text-muted d-block mt-1">
              ${badge.progress ? 
                `Progress: ${badge.progress.current || 0}/${badge.progress.total || 1}` : 
                `Earned on: ${badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : 'Unknown date'}`}
            </small>
          </div>
        `;

        // Append badge to fragment
        fragment.appendChild(badgeElement);

        console.log(`✅ Rendered badge: ${badge.name}`);
      } catch (badgeError) {
        console.error(`❌ Error rendering badge at index ${index}:`, badgeError);
      }
    });

    // Append all badges at once
    badgesContainer.appendChild(fragment);

    // Final debug: Check final container state
    console.log('Final Container innerHTML:', badgesContainer.innerHTML);
    console.log('Final Container Children Count:', badgesContainer.children.length);

    console.log(`✅ Successfully rendered ${badges.length} badges`);
    console.groupEnd();
  } catch (error) {
    console.error('❌ Critical error in updateBadges:', error);
    console.groupEnd();
  }
}

function getTimeAgo(date) {
  // Ensure date is a Date object
  const inputDate = date instanceof Date ? date : new Date(date);
  
  // Handle invalid dates
  if (isNaN(inputDate.getTime())) {
    return 'Just now';
  }

  const now = new Date();
  const secondsPast = (now.getTime() - inputDate.getTime()) / 1000;

  if (secondsPast < 60) {
    return 'Just now';
  }
  if (secondsPast < 3600) {
    const minutes = Math.floor(secondsPast / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  if (secondsPast < 86400) {
    const hours = Math.floor(secondsPast / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (secondsPast < 2592000) {
    const days = Math.floor(secondsPast / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // For dates older than 30 days, return formatted date
  return inputDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function showToast(type, message) {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
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
  
  toastContainer.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  container.style.zIndex = '1050';
  document.body.appendChild(container);
  return container;
}

function setupEventListeners() {
  // Logout handler
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = '/citizen-login.html';
    });
  }

  // Theme switch handler
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    // Set initial state
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    themeSwitch.checked = currentTheme === 'dark';
    
    themeSwitch.addEventListener('change', () => {
      const theme = themeSwitch.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-bs-theme', theme);
      localStorage.setItem('theme', theme);
    });
  }
}

function filterAndRender() {
  let filtered = window.allComplaints || [];
  // Text search
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(c => (c.ticketId || c.id).toString().toLowerCase().includes(q) ||
      (c.issueType || '').toLowerCase().includes(q) ||
      (c.department || '').toLowerCase().includes(q));
  }
  // Status filter
  const statusVal = document.getElementById('statusFilter').value;
  if (statusVal) {
    filtered = filtered.filter(c => c.status === statusVal);
  }
  // Category filter (assuming issueType maps)
  const catVal = document.getElementById('categoryFilter').value;
  if (catVal) {
    filtered = filtered.filter(c => c.issueType === catVal);
  }
  populateTable(filtered);
}

function populateTable(complaints) {
  const tbody = document.getElementById('complaintsTableBody');
  tbody.innerHTML = '';
  complaints.forEach((cmp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cmp.ticketId || cmp.id}</td>
      <td>${cmp.issueType}</td>
      <td>${cmp.department}</td>
      <td>${cmp.status}</td>
      <td>${new Date(cmp.createdAt).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

function createQuickActions(reports) {
  const quickActionContainer = document.getElementById('quickActionContainer');
  
  // Get user data and recent activity
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const pendingReports = reports.filter(r => r.status === 'reported').length;
  const unresolvedReports = reports.filter(r => r.status !== 'resolved').length;

  // Simplified and enhanced actions
  const actions = [
    {
      id: 'newReport',
      icon: 'fas fa-plus-circle',
      title: 'Create New Report',
      description: 'Raise a civic issue in your community',
      href: '/report.html',
      color: 'primary',
      iconBg: 'bg-primary-soft',
      badge: null
    },
    {
      id: 'myReports',
      icon: 'fas fa-list-alt',
      title: 'My Reports',
      description: 'View and manage your reports',
      href: '/my-reports.html',
      color: 'warning',
      iconBg: 'bg-warning-soft',
      badge: null
    },
    {
      id: 'achievements',
      icon: 'fas fa-trophy',
      title: 'Achievements',
      description: 'View your civic impact',
      href: '/achievements.html',
      color: 'success',
      iconBg: 'bg-success-soft',
      badge: null
    }
  ];

  // Render quick actions
  quickActionContainer.innerHTML = `
    <div class="container-fluid px-0">
      <div class="row g-3">
        <div class="col-12 mb-2">
          <h5 class="section-title">Quick Actions</h5>
        </div>
        
        ${actions.map(action => `
          <div class="col-md-4">
            <div class="quick-action-card card h-100 border-0 shadow-sm" data-action="${action.id}">
              <div class="card-body d-flex align-items-center p-3">
                <div class="action-icon ${action.iconBg} rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 50px; height: 50px;">
                  <i class="${action.icon} text-${action.color} fs-4"></i>
                </div>
                <div class="flex-grow-1">
                  <h6 class="mb-1 fw-bold">${action.title}</h6>
                  <p class="text-muted mb-0 small">${action.description}</p>
                </div>
                ${action.badge !== null ? `
                  <span class="badge bg-${action.color} ms-2">${action.badge}</span>
                ` : ''}
                <a href="${action.href}" class="stretched-link"></a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add interactive hover effects
  document.querySelectorAll('.quick-action-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.classList.add('shadow-lg');
      card.style.transform = 'translateY(-5px)';
    });

    card.addEventListener('mouseleave', () => {
      card.classList.remove('shadow-lg');
      card.style.transform = 'translateY(0)';
    });
  });
}


