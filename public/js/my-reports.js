// Sample report data - In a real app, this would come from an API
const sampleReports = [
  {
    id: 'RPT-2023-001',
    title: 'Pothole on Main Street',
    description: 'Large pothole causing traffic issues near the intersection with 5th Avenue. Several cars have already been damaged.',
    category: 'Roads',
    status: 'active',
    priority: 'high',
    location: '123 Main St, Anytown',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    dateReported: '2023-05-15T10:30:00',
    dateUpdated: '2023-05-20T14:15:00',
    progress: 60,
    currentStage: 'In Progress',
    stages: [
      { name: 'Reported', completed: true, date: '2023-05-15T10:30:00' },
      { name: 'Verified', completed: true, date: '2023-05-16T09:15:00' },
      { name: 'Assigned', completed: true, date: '2023-05-18T11:45:00' },
      { name: 'In Progress', completed: true, date: '2023-05-20T14:15:00' },
      { name: 'Resolved', completed: false, date: null }
    ],
    assignedTo: 'Public Works Dept',
    lastUpdate: 'Work order issued and repair scheduled for next week',
    photos: ['/img/sample-pothole.jpg'],
    pointsEarned: 0
  },
  {
    id: 'RPT-2023-002',
    title: 'Street Light Out',
    description: 'Street light not working on the corner of Maple and Elm streets. Creates a safety hazard at night.',
    category: 'Electricity',
    status: 'in-progress',
    priority: 'medium',
    location: 'Corner of Maple & Elm St',
    coordinates: { lat: 40.7129, lng: -74.0061 },
    dateReported: '2023-05-18T18:45:00',
    dateUpdated: '2023-05-22T10:30:00',
    progress: 40,
    currentStage: 'Assigned',
    stages: [
      { name: 'Reported', completed: true, date: '2023-05-18T18:45:00' },
      { name: 'Verified', completed: true, date: '2023-05-19T10:20:00' },
      { name: 'Assigned', completed: true, date: '2023-05-22T10:30:00' },
      { name: 'In Progress', completed: false, date: null },
      { name: 'Resolved', completed: false, date: null }
    ],
    assignedTo: 'Utilities Department',
    lastUpdate: 'Issue verified and assigned to maintenance team',
    photos: ['/img/sample-streetlight.jpg'],
    pointsEarned: 0
  },
  {
    id: 'RPT-2023-003',
    title: 'Water Leak in Park',
    description: 'Water pipe leaking in Central Park near the playground. Water is being wasted and creating a muddy area.',
    category: 'Water',
    status: 'resolved',
    priority: 'high',
    location: 'Central Park, near playground',
    coordinates: { lat: 40.7130, lng: -74.0062 },
    dateReported: '2023-05-10T08:15:00',
    dateResolved: '2023-05-12T16:45:00',
    dateUpdated: '2023-05-12T16:45:00',
    progress: 100,
    currentStage: 'Resolved',
    stages: [
      { name: 'Reported', completed: true, date: '2023-05-10T08:15:00' },
      { name: 'Verified', completed: true, date: '2023-05-10T10:30:00' },
      { name: 'Assigned', completed: true, date: '2023-05-11T09:15:00' },
      { name: 'In Progress', completed: true, date: '2023-05-12T14:00:00' },
      { name: 'Resolved', completed: true, date: '2023-05-12T16:45:00' }
    ],
    assignedTo: 'Water Department',
    lastUpdate: 'Leak has been fixed and area cleaned up',
    resolutionDetails: 'Pipe section was replaced and area was restored.',
    rating: 5,
    usersHelped: 150,
    achievements: ['Eco Hero', 'Quick Fixer'],
    photos: ['/img/sample-leak-before.jpg', '/img/sample-leak-after.jpg'],
    pointsEarned: 50
  },
  {
    id: 'RPT-2023-004',
    title: 'Garbage Not Collected',
    description: 'Garbage was not collected on our street this week. Bins are overflowing.',
    category: 'Sanitation',
    status: 'overdue',
    priority: 'medium',
    location: '456 Oak Avenue',
    coordinates: { lat: 40.7131, lng: -74.0063 },
    dateReported: '2023-05-20T09:00:00',
    dateUpdated: '2023-05-22T11:20:00',
    progress: 20,
    currentStage: 'Verified',
    stages: [
      { name: 'Reported', completed: true, date: '2023-05-20T09:00:00' },
      { name: 'Verified', completed: true, date: '2023-05-22T11:20:00' },
      { name: 'Assigned', completed: false, date: null },
      { name: 'In Progress', completed: false, date: null },
      { name: 'Resolved', completed: false, date: null }
    ],
    assignedTo: 'Sanitation Department',
    lastUpdate: 'Issue verified, waiting for assignment',
    overdueBy: '2 days',
    photos: ['/img/sample-garbage.jpg'],
    pointsEarned: 0
  },
  {
    id: 'RPT-2023-005',
    title: 'Broken Sidewalk',
    description: 'Uneven and broken sidewalk creating accessibility issues for wheelchair users and pedestrians.',
    category: 'Infrastructure',
    status: 'in-progress',
    priority: 'medium',
    location: '300 Pine Road',
    coordinates: { lat: 40.7132, lng: -74.0064 },
    dateReported: '2023-05-05T14:20:00',
    dateUpdated: '2023-05-23T16:10:00',
    progress: 80,
    currentStage: 'In Progress',
    stages: [
      { name: 'Reported', completed: true, date: '2023-05-05T14:20:00' },
      { name: 'Verified', completed: true, date: '2023-05-08T10:15:00' },
      { name: 'Assigned', completed: true, date: '2023-05-10T11:30:00' },
      { name: 'In Progress', completed: true, date: '2023-05-22T09:00:00' },
      { name: 'Resolved', completed: false, date: null }
    ],
    assignedTo: 'Public Works Dept',
    lastUpdate: 'Repair work has begun, estimated completion in 2 days',
    photos: ['/img/sample-sidewalk.jpg'],
    pointsEarned: 0
  }
];

// DOM Elements (will be initialized in setupEventListeners)
let reportsList, statsCards, performanceMetrics,
    searchInput, dateRangeFilter, categoryFilter, statusFilter,
    itemsPerPageSelect, pagination, showingFrom, showingTo, totalItems;


// State
let currentPage = 1;
let itemsPerPage = 10;
let filteredReports = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/citizen-login.html';
    return;
  }

  // Initialize user data and avatar
  await initializeUserData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load reports
  await loadReports();
});

async function initializeUserData() {
  try {
    const response = await fetch('/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const { data } = await response.json();
    
    // Update user info in header
    document.getElementById('ddUserName').textContent = `${data.firstName} ${data.lastName}`;
    document.getElementById('ddUserEmail').textContent = data.email;

    // Update avatar
    updateAvatarDisplay(data.photo, data.firstName, data.lastName);

    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(data));
    localStorage.setItem('userId', data._id);

  } catch (error) {
    console.error('Error fetching user data:', error);
    showMessage('Failed to load user data', true);
  }
}

function updateAvatarDisplay(photoUrl, firstName, lastName) {
  const userAvatar = document.getElementById('userAvatar');
  
  if (photoUrl) {
    // If there's a photo URL, use it
    userAvatar.src = `/uploads/${photoUrl}`;
  } else if (firstName && lastName) {
    // If no photo but we have a name, use initials
    const initialsUrl = generateInitialsAvatar(firstName, lastName);
    userAvatar.src = initialsUrl;
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

function setupEventListeners() {
  // Re-query DOM elements now that the document is fully loaded
  reportsList         = document.getElementById('reportsList');
  statsCards          = document.getElementById('statsCards');
  performanceMetrics  = document.getElementById('performanceMetrics');
  searchInput         = document.getElementById('searchReports');
  dateRangeFilter     = document.getElementById('dateRangeFilter');
  categoryFilter      = document.getElementById('categoryFilter');
  statusFilter        = document.getElementById('statusFilter');
  itemsPerPageSelect  = document.getElementById('itemsPerPage');
  pagination          = document.getElementById('pagination');
  showingFrom         = document.getElementById('showingFrom');
  showingTo           = document.getElementById('showingTo');
  totalItems          = document.getElementById('totalItems');
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
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', currentTheme);
    themeSwitch.checked = currentTheme === 'dark';
    updateThemeIcon(themeSwitch.checked);

    themeSwitch.addEventListener('change', () => {
      const isDark = themeSwitch.checked;
      document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeIcon(isDark);
    });
  }

  // Search input
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    filterReports();
  });

  // Filter dropdowns
  dateRangeFilter.addEventListener('change', () => {
    currentPage = 1;
    filterReports();
  });

  categoryFilter.addEventListener('change', () => {
    currentPage = 1;
    filterReports();
  });

  // Status filter dropdown
  statusFilter.addEventListener('change', () => {
    currentPage = 1;
    filterReports();
  });

  // Items per page
  itemsPerPageSelect.addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    updatePagination();
    renderReports();
  });
}

function updateThemeIcon(isDark) {
  const icon = document.querySelector('#themeSwitch + label i');
  if (isDark) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
}

function showMessage(message, isError = false) {
  // You can implement this based on your UI needs
  console.log(isError ? 'Error: ' : 'Message: ', message);
}

async function loadReports() {
  try {
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');

    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (userEmail) params.append('userEmail', userEmail);
    const response = await fetch(`/api/reports?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    const resJson = await response.json();
    const apiReports = Array.isArray(resJson.data) ? resJson.data : [];

    // Transform API payload into structure expected by UI helpers
    const adapted = apiReports.map(adaptReportForUI);

    // Replace existing report array contents with the fetched data
    sampleReports.splice(0, sampleReports.length, ...adapted);

    // Refresh UI with new data
    filterReports();
    updateStatsCards();
    updatePerformanceMetrics();
  } catch (error) {
    console.error('Error loading reports:', error);
    showMessage('Failed to load reports', true);
  }
}

/**
 * Convert raw backend report document into the shape required by the
 * existing UI helpers (progress bar, status badges, etc.).
 */
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

  // Mark as overdue if unresolved for more than 15 days
  const MS_IN_DAY = 86400000;
  const daysSinceReport = (Date.now() - reportedDateObj.getTime()) / MS_IN_DAY;
  let overdueBy;
  if (uiStatus !== 'resolved' && daysSinceReport > 15) {
    uiStatus = 'overdue';
    overdueBy = `${Math.floor(daysSinceReport - 15)} days`;
  }

  // Calculate progress percentage based on current stage
  const progressMap = {
    'reported': 10,
    'verified': 30,
    'assigned': 50,
    'in-progress': 70,
    'resolved': 100,
    'overdue': 30 // Override if status is overdue
  };
  
  let progress = progressMap[uiStatus] || 10;
  
  // For custom stages, ensure progress is within bounds
  progress = Math.min(100, Math.max(0, progress));

  return {
    id: r._id,
    title: r.title || 'Untitled',
    description: r.description || '',
    category: (() => {
      const cat = (r.category || 'Others').toString().toLowerCase();
      const map = {
        'roads': 'Roads',
        'road': 'Roads',
        'water': 'Water',
        'electric': 'Electricity',
        'electricity': 'Electricity',
        'power': 'Electricity',
        'environment': 'Environment',
        'sanitation': 'Sanitation',
        'infrastructure': 'Infrastructure',
        'others': 'Others'
      };
      return map[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
    })(),
    status: uiStatus,
    priority: 'medium',
    location: r.location?.address || 'Unknown location',
    coordinates: {
      lat: r.location?.coordinates?.[1] ?? 0,
      lng: r.location?.coordinates?.[0] ?? 0
    },
    dateReported: reportedDateObj.toISOString(),
    dateUpdated: updatedDateObj.toISOString(),
    dateResolved: resolvedDateObj ? resolvedDateObj.toISOString() : null,
    progress,
    currentStage: uiStatus === 'resolved' ? 'Resolved' : (uiStatus === 'in-progress' ? 'In Progress' : (uiStatus === 'overdue' ? 'Overdue' : 'Reported')),
    stages: [
      { name: 'Reported', completed: true, date: reportedDateObj.toISOString() },
      { 
        name: 'Verified', 
        completed: ['verified', 'assigned', 'in-progress', 'resolved'].includes(uiStatus),
        date: updatedDateObj.toISOString() 
      },
      { 
        name: 'Assigned', 
        completed: ['assigned', 'in-progress', 'resolved'].includes(uiStatus),
        date: updatedDateObj.toISOString() 
      },
      { 
        name: 'In Progress', 
        completed: ['in-progress', 'resolved'].includes(uiStatus),
        date: updatedDateObj.toISOString() 
      },
      { 
        name: 'Resolved', 
        completed: uiStatus === 'resolved',
        date: resolvedDateObj ? resolvedDateObj.toISOString() : null 
      }
    ],
    assignedTo: r.assignedTo || '',
    lastUpdate: r.lastUpdate || '',
    photos: r.images || [],
    userMobile: r.userMobile || '',
    overdueBy
  };
}







// Filter reports based on search and filters
function filterReports() {
  const searchTerm = searchInput.value.toLowerCase();
  const category = categoryFilter.value;
  const selectedStatus = statusFilter.value; // Get the selected status from dropdown
  const dateRange = dateRangeFilter.value;
  // Pre-compute earliest date based on range for efficiency
  let earliestDate = null;
  const now = new Date();
  switch (dateRange) {
    case 'Last 7 days':
      earliestDate = new Date(now.getTime() - 7 * 86400000);
      break;
    case 'Last 30 days':
      earliestDate = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'Last 90 days':
      earliestDate = new Date(now.getTime() - 90 * 86400000);
      break;
    case 'This year':
      earliestDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      // 'All time' => no restriction
      earliestDate = null;
  }
  
  filteredReports = sampleReports.filter(report => {
    // Search term filter
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm) ||
      report.description.toLowerCase().includes(searchTerm) ||
      report.id.toLowerCase().includes(searchTerm);
    
    // Category filter
    const normalizedCategoryFilter = category.toLowerCase();
    const matchesCategory = normalizedCategoryFilter === 'all categories'
      || report.category.toLowerCase() === normalizedCategoryFilter
      || report.category.toLowerCase().includes(normalizedCategoryFilter);
    
    // Status filter - use the same mapping as in adaptReportForUI for consistency
    const statusMap = {
      'pending': 'reported',
      'active': 'in-progress',
      'verified': 'verified',
      'assigned': 'assigned',
      'in-progress': 'in-progress',
      'resolved': 'resolved',
      'overdue': 'overdue'
    };
    
    // Get the UI status using the same mapping as in adaptReportForUI
    const uiStatus = statusMap[report.status] || 'reported';
    
    // For 'active' filter, include any non-resolved report
    // For other filters, do exact match against the UI status
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' ? uiStatus !== 'resolved' : uiStatus === selectedStatus);
    
    // Date range filter
    const matchesDateRange = earliestDate ? (new Date(report.dateReported) >= earliestDate && new Date(report.dateReported) <= now) : true;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDateRange;
  });
  
  totalItems.textContent = filteredReports.length;
  updatePagination();
  renderReports();
}

// Render the reports list
function renderReports() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);
  
  showingFrom.textContent = filteredReports.length > 0 ? startIndex + 1 : 0;
  showingTo.textContent = Math.min(endIndex, filteredReports.length);
  
  if (paginatedReports.length === 0) {
    reportsList.innerHTML = `
      <div class="card">
        <div class="card-body text-center py-5">
          <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
          <h5>No reports found</h5>
          <p class="text-muted">Try adjusting your search or filter criteria</p>
          <button class="btn btn-primary mt-2" onclick="window.location.href='/report.html'">
            <i class="fas fa-plus-circle me-2"></i>Create New Report
          </button>
        </div>
      </div>`;
    return;
  }
  
  reportsList.innerHTML = paginatedReports.map(report => createReportCard(report)).join('');
  
  // Add event listeners to view buttons
  document.querySelectorAll('.view-report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const reportId = e.currentTarget.dataset.id;
      viewReportDetails(reportId);
    });
  });
}

// Create HTML for a report card
function createReportCard(report) {
  const statusClass = {
    'active': 'status-active',
    'in-progress': 'status-in-progress',
    'resolved': 'status-resolved',
    'overdue': 'status-overdue'
  }[report.status] || 'status-active';
  
  const statusText = {
    'active': 'Active',
    'in-progress': 'In Progress',
    'resolved': 'Resolved',
    'overdue': 'Overdue'
  }[report.status] || 'Active';
  
  const categoryIcon = getCategoryIcon(report.category);
  const daysAgo = Math.floor((new Date() - new Date(report.dateUpdated)) / (1000 * 60 * 60 * 24));
  
  // Add phone number to the card
  const phoneSection = `<div class="mb-1"><strong>Phone:</strong> ${report.userMobile || '-'}</div>`;
  const resolvedSection = report.dateResolved ? `<div class="mb-1"><strong>Resolved on:</strong> ${formatDate(report.dateResolved)}</div>` : '';
  
  return `
    <div class="card mb-3 report-card">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex align-items-center gap-2">
            <span class="status-badge ${statusClass}">${statusText}</span>
            <div class="category-icon">
              <i class="${categoryIcon}"></i>
            </div>
            <div>
              <h6 class="mb-0">${report.category}</h6>
              <small class="text-muted">${report.id}</small>
            </div>
          </div>
          <div class="text-end">
            <div class="text-muted small">${formatDate(report.dateReported)}</div>
            <div class="small">
              <i class="fas fa-map-marker-alt text-danger me-1"></i>
              <span class="text-muted">${report.location}</span>
            </div>
          </div>
        </div>
        
        <h5 class="card-title">${report.title}</h5>
        <p class="card-text text-muted">"${report.description}"</p>
        ${resolvedSection}
        
        <!-- Progress Tracker -->
        <div class="mb-3">
          <div class="d-flex justify-content-between mb-1">
            ${report.stages.map((stage, index) => `
              <div class="progress-step ${stage.completed ? 'completed' : ''} ${stage.name === report.currentStage ? 'active' : ''}">
                <div class="step-dot"></div>
                <div class="d-none d-sm-block">${stage.name}</div>
              </div>
            `).join('')}
          </div>
          <div class="progress">
            <div class="progress-bar" role="progressbar" style="width: ${report.progress}%" 
                 aria-valuenow="${report.progress}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
        
        <!-- Latest Update -->
        <div class="alert alert-light mb-3 py-2 small">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>Latest Update:</strong> ${report.lastUpdate}
              ${report.overdueBy ? `<span class="badge bg-warning text-dark ms-2">Overdue by ${report.overdueBy}</span>` : ''}
            </div>
            <div class="text-muted">${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-outline-primary view-report-btn" data-id="${report.id}">
            <i class="fas fa-eye me-1"></i> View Details
          </button>
          <button class="btn btn-sm btn-outline-secondary">
            <i class="fas fa-map-marked-alt me-1"></i> Track on Map
          </button>
          ${report.status === 'resolved' ? `
            <button class="btn btn-sm btn-outline-warning rate-resolution-btn" data-id="${report.id}">
              <i class="fas fa-star me-1"></i> Rate Resolution
            </button>
          ` : ''}
          <div class="dropdown ms-auto">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="#" onclick="window.print()"><i class="fas fa-print me-2"></i>Print Report</a></li>
              <li><a class="dropdown-item" href="#" onclick="exportReportData('${report.id}')"><i class="fas fa-file-export me-2"></i>Export</a></li>
            </ul>
          </div>
        </div>
      </div>
</div>`;
}

// Update stats cards
function updateStatsCards() {
  const MS_IN_DAY = 86400000;
  const now = Date.now();
  
  // Process each report to determine if it's overdue
  const reportsWithOverdue = sampleReports.map(report => {
    if (report.status === 'resolved') return { ...report, isOverdue: false };
    
    const reportedDate = new Date(report.dateReported || report.createdAt || now).getTime();
    const daysSinceReport = (now - reportedDate) / MS_IN_DAY;
    const isOverdue = daysSinceReport > 15;
    
    return {
      ...report,
      isOverdue,
      // Update status to overdue if needed
      status: isOverdue ? 'overdue' : report.status
    };
  });
  
  const totalReports = reportsWithOverdue.length;
  const resolvedCount = reportsWithOverdue.filter(r => r.status === 'resolved').length;
  const overdueCount = reportsWithOverdue.filter(r => r.isOverdue).length;
  const activeCount = totalReports - resolvedCount - overdueCount;
  
  const inProgressCount = reportsWithOverdue.filter(r => 
    (r.status === 'in-progress' || r.status === 'active' || r.status === 'assigned' || r.status === 'verified') && 
    !r.isOverdue
  ).length;
  
  // For backward compatibility
  const statusCounts = {
    pending: reportsWithOverdue.filter(r => (r.status === 'pending' || r.status === 'reported') && !r.isOverdue).length,
    inProgress: inProgressCount,
    resolved: resolvedCount,
    overdue: overdueCount
  };
  
  const statusArray = [statusCounts.pending, inProgressCount, resolvedCount];
  const resolutionRate = totalReports ? Math.round((statusCounts.resolved / totalReports) * 100) : 0;
  
  statsCards.innerHTML = `
    <div class="col-md-3">
      <div class="card bg-primary bg-opacity-10 border-0 h-100 stats-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-muted mb-1">Total Reports</h6>
              <h3 class="mb-0">${totalReports}</h3>
            </div>
            <div class="bg-primary bg-opacity-25 p-3 rounded-circle">
              <i class="fas fa-clipboard-list text-primary"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card bg-success bg-opacity-10 border-0 h-100 stats-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-muted mb-1">Resolution Rate</h6>
              <h3 class="mb-0">${resolutionRate}%</h3>
            </div>
            <div class="bg-success bg-opacity-25 p-3 rounded-circle">
              <i class="fas fa-check-circle text-success"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card bg-warning bg-opacity-10 border-0 h-100 stats-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-muted mb-1">Active Reports</h6>
              <h3 class="mb-0">${activeCount}</h3>
            </div>
            <div class="bg-warning bg-opacity-25 p-3 rounded-circle">
              <i class="fas fa-tasks text-warning"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card bg-danger bg-opacity-10 border-0 h-100 stats-card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-muted mb-1">Overdue</h6>
              <h3 class="mb-0">${overdueCount}</h3>
            </div>
            <div class="bg-danger bg-opacity-25 p-3 rounded-circle">
              <i class="fas fa-exclamation-triangle text-danger"></i>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// Update performance metrics
function updatePerformanceMetrics() {
  // Calculate points: 20 for profile creation + 10 per report
  const totalPoints = 20 + (sampleReports.length * 10);
  
  performanceMetrics.innerHTML = `
    <div class="card-header bg-white">
      <div class="d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Performance Metrics</h5>
        <div class="dropdown">
          <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-ellipsis-v"></i>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="#">View All Reports</a></li>
            <li><a class="dropdown-item" href="#">Export Data</a></li>
          </ul>
        </div>
      </div>
    </div>
    <div class="card-body">
      <div class="row">
        <div class="col-md-6">
          <div class="d-flex align-items-center mb-3">
            <div class="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
              <i class="fas fa-clock text-primary"></i>
            </div>
            <div>
              <h6 class="mb-0">Average Resolution Time</h6>
              <p class="text-muted mb-0">7 days</p>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="d-flex align-items-center">
            <div class="bg-success bg-opacity-10 p-3 rounded-circle me-3">
              <i class="fas fa-trophy text-success"></i>
            </div>
            <div>
              <h6 class="mb-0">Points Earned</h6>
              <p class="text-muted mb-0">${totalPoints} points (20 for profile + 10 per report)</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// Update pagination
function updatePagination() {
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  
  let paginationHTML = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>`;
  
  // Show first page, current page, and pages around current page
  const maxVisiblePages = 3;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    paginationHTML += `
      <li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>
      ${startPage > 2 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}`;
  }
  
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>`;
  }
  
  if (endPage < totalPages) {
    paginationHTML += `
      ${endPage < totalPages - 1 ? '<li class="page-item disabled"><span class="page-link">...</span></li>' : ''}
      <li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
  }
  
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>`;
  
  pagination.innerHTML = paginationHTML;
  
  // Add event listeners to pagination links
  document.querySelectorAll('.page-link').forEach(link => {
    if (!link.getAttribute('aria-label')) { // Not previous/next buttons
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.currentTarget.dataset.page);
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          currentPage = page;
          updatePagination();
          renderReports();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  });
}

// View report details in modal
function viewReportDetails(reportId) {
  const report = sampleReports.find(r => r.id === reportId);
  if (!report) return;
  
  const modal = new bootstrap.Modal(document.getElementById('reportDetailsModal'));
  const modalContent = document.getElementById('reportDetailsContent');
  
  // Create modal content based on report data
  let content = `
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4>${report.title}</h4>
        <span class="badge ${report.status === 'resolved' ? 'bg-success' : 'bg-primary'}">
          ${report.status === 'resolved' ? 'Resolved' : 'In Progress'}
        </span>
      </div>
      
      <div class="row mb-4">
        <div class="col-md-6">
          <p class="mb-2"><strong>Report ID:</strong> ${report.id}</p>
          <p class="mb-2"><strong>Category:</strong> ${report.category}</p>
          <p class="mb-2"><strong>Location:</strong> ${report.location}</p>
        </div>
        <div class="col-md-6">
          <p class="mb-2"><strong>Reported On:</strong> ${formatDate(report.dateReported, true)}</p>
          <p class="mb-2"><strong>Last Updated:</strong> ${formatDate(report.dateUpdated, true)}</p>
          ${report.dateResolved ? `<p class="mb-2"><strong>Resolved On:</strong> ${formatDate(report.dateResolved, true)}</p>` : ''}
        </div>
      </div>
      
      <h5>Description</h5>
      <p class="mb-4">${report.description}</p>
      
      <h5>Status Updates</h5>
      <div class="timeline">
        ${report.stages.map(stage => `
          <div class="timeline-item ${stage.completed ? 'completed' : ''}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h6 class="mb-1">${stage.name}</h6>
              <p class="text-muted small mb-2">
                ${stage.date ? formatDate(stage.date, true) : 'Pending'}
              </p>
            </div>
          </div>
        `).join('')}
      </div>
      
      ${report.photos && report.photos.length > 0 ? `
        <h5 class="mt-4">Photos</h5>
        <div class="row g-2">
          ${report.photos.map(photo => `
            <div class="col-4 col-md-3">
              <img src="${photo}" class="img-thumbnail" style="height: 100px; width: 100%; object-fit: cover;">
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${report.status === 'resolved' ? `
        <div class="alert alert-success mt-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h5><i class="fas fa-check-circle me-2"></i>Issue Resolved</h5>
              <p class="mb-0">${report.resolutionDetails || 'The issue has been successfully resolved.'}</p>
            </div>
            <div class="text-end">
              <div class="text-warning mb-1">
                ${Array(5).fill().map((_, i) => 
                  `<i class="fas fa-star${i < (report.rating || 5) ? '' : '-o'}"></i>`
                ).join('')}
              </div>
              <span class="badge bg-success">+${report.pointsEarned} Points Earned</span>
            </div>
          </div>
        </div>
      ` : ''}
    </div>`;
  
  modalContent.innerHTML = content;
  modal.show();
}

// Helper function to format dates
function formatDate(dateString, includeTime = false) {
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Helper function to get category icon
function getCategoryIcon(category) {
  const icons = {
    'Roads': 'fas fa-road',
    'Water': 'fas fa-tint',
    'Electricity': 'fas fa-bolt',
    'Sanitation': 'fas fa-trash-alt',
    'Infrastructure': 'fas fa-hard-hat',
    'Others': 'fas fa-ellipsis-h'
  };
  return icons[category] || 'fas fa-question-circle';
}

// Export functions that need to be accessible from HTML
window.viewReportDetails = viewReportDetails;

// Function to handle rating a resolution
function handleRateResolution(reportId) {
  const report = sampleReports.find(r => r.id === reportId);
  if (!report) return;
  
  // In a real app, this would open a rating modal
  const rating = prompt(`Rate the resolution for ${report.title} (1-5):`, report.rating || '5');
  if (rating && rating >= 1 && rating <= 5) {
    report.rating = parseInt(rating);
    alert(`Thank you for rating this resolution ${rating} stars!`);
    // In a real app, you would save this to the server
    renderReports();
  }
}

// Function to export report data
function exportReportData(reportId) {
  const report = sampleReports.find(r => r.id === reportId);
  if (!report) return;
  
  // Create a printable version of the report
  const printWindow = window.open('', '_blank');
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report: ${report.id}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        @media print {
          .no-print { display: none !important; }
          body { padding: 20px; font-size: 12px; }
          .card { border: 1px solid #ddd; }
        }
        .header { margin-bottom: 20px; }
        .logo { max-height: 50px; margin-right: 15px; }
        .print-title { font-size: 18px; font-weight: bold; }
        .print-date { font-size: 12px; color: #666; }
        .section-title { 
          font-size: 16px; 
          font-weight: bold; 
          border-bottom: 1px solid #eee; 
          padding-bottom: 5px; 
          margin-top: 15px; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header d-flex justify-content-between align-items-center mb-4">
          <div class="d-flex align-items-center">
            <img src="/img/logo.png" alt="Logo" class="logo">
            <div>
              <div class="print-title">CivicSense Report</div>
              <div class="print-date">Generated on ${new Date().toLocaleString()}</div>
            </div>
          </div>
          <div class="no-print">
            <button class="btn btn-primary btn-sm" onclick="window.print()">
              <i class="fas fa-print me-1"></i> Print
            </button>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-md-6">
                <h4>${report.title}</h4>
                <p class="text-muted">${report.id} • ${report.category}</p>
              </div>
              <div class="col-md-6 text-end">
                <span class="badge ${report.status === 'resolved' ? 'bg-success' : 'bg-primary'} p-2">
                  ${report.status === 'resolved' ? 'Resolved' : 'In Progress'}
                </span>
              </div>
            </div>
            
            <div class="section-title">Report Details</div>
            <div class="row mb-3">
              <div class="col-md-6">
                <p><strong>Location:</strong> ${report.location}</p>
                <p><strong>Reported On:</strong> ${formatDate(report.dateReported, true)}</p>
                ${report.dateResolved ? `<p><strong>Resolved On:</strong> ${formatDate(report.dateResolved, true)}</p>` : ''}
              </div>
              <div class="col-md-6">
                <p><strong>Status:</strong> ${report.currentStage}</p>
                <p><strong>Assigned To:</strong> ${report.assignedTo}</p>
                <p><strong>Progress:</strong> ${report.progress}%</p>
              </div>
            </div>
            
            <div class="section-title">Description</div>
            <p class="mb-4">${report.description}</p>
            
            ${report.resolutionDetails ? `
              <div class="section-title">Resolution Details</div>
              <p class="mb-4">${report.resolutionDetails}</p>
            ` : ''}
            
            <div class="section-title">Timeline</div>
            <div class="timeline">
              ${report.stages.map(stage => `
                <div class="timeline-item ${stage.completed ? 'completed' : ''}">
                  <div class="timeline-marker"></div>
                  <div class="timeline-content">
                    <h6 class="mb-1">${stage.name}</h6>
                    <p class="text-muted small mb-2">
                      ${stage.date ? formatDate(stage.date, true) : 'Pending'}
                    </p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            ${report.rating ? `
              <div class="mt-4">
                <div class="section-title">Your Rating</div>
                <div class="text-warning">
                  ${Array(5).fill().map((_, i) => 
                    `<i class="fas fa-star${i < report.rating ? '' : '-o'}"></i>`
                  ).join('')}
                  <span class="text-muted ms-2">${report.rating}.0/5.0</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="text-center text-muted small no-print">
          This report was generated from CivicSense on ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Write the content to the new window
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Auto-print if needed
  // printWindow.print();
}