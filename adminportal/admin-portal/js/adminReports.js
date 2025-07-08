// Admin Reports Page - Main JavaScript
// Provides department-specific report listing with filters, search, pagination and CRUD.
// Requires Bootstrap 5 and Font-Awesome present in page.

/* NOTE: the backend routes expected:
   GET    /api/complaints            w/ query params (see loadReports)
   GET    /api/complaints/:id        fetch single report
   PATCH  /api/complaints/:id        update report
   DELETE /api/complaints/:id        delete report
   All endpoints are protected by JWT (token in localStorage).
*/

// Wrap everything after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  /* ------------------------------------------------------------------
   *  DOM refs
   * ----------------------------------------------------------------*/
  const reportsList      = document.getElementById('reportsList');
  const searchInput      = document.getElementById('searchReports');
  const statusFilter     = document.getElementById('filter-status');
  const timeFilter       = document.getElementById('filter-time');
  const deadlineFilter   = document.getElementById('filter-deadline');
  const applyFiltersBtn  = document.getElementById('btn-apply-filters');
  const paginationEl     = document.getElementById('pagination');

  // Modals and forms
  const reportDetailsModal = new bootstrap.Modal(document.getElementById('reportDetailsModal'));
  const editReportModal    = new bootstrap.Modal(document.getElementById('editReportModal'));
  const editForm           = document.getElementById('edit-report-form');

  /* ------------------------------------------------------------------
   *  State
   * ----------------------------------------------------------------*/
  let currentPage   = 1;
  const itemsPerPage = 10;
  let totalItems    = 0;
  let reports       = [];
  let debounceTimer;
  let currentReportId;
  let searchQuery = '';

  /* ------------------------------------------------------------------
   *  Initialisation
   * ----------------------------------------------------------------*/
  init();

  async function init() {
    showLoading(true);
    try {
      await loadReports();
      setupEventListeners();
    } catch (err) {
      console.error('Init error', err);
      showError('Failed to load reports');
    } finally {
      showLoading(false);
    }
  }

  /* ------------------------------------------------------------------
   *  Event Listeners
   * ----------------------------------------------------------------*/
  function setupEventListeners() {
    // View employee details
    document.addEventListener('click', async (e) => {
      const employeeBtn = e.target.closest('.view-employee');
      if (employeeBtn) {
        e.preventDefault();
        if (employeeBtn.dataset.employee) {
          try {
            const employeeData = JSON.parse(employeeBtn.dataset.employee);
            showEmployeeDetails(employeeData);
          } catch (error) {
            console.error('Error parsing employee data:', error);
            showToast('error', 'Error loading employee details');
          }
        } else if (employeeBtn.dataset.reportId) {
          // Fetch on demand
          const reportId = employeeBtn.dataset.reportId;
          try {
            const res = await fetch(`/api/complaints/${reportId}/assigned-employee`, { headers: authHeaders() });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.data) {
                showEmployeeDetails(data.data);
              } else {
                showToast('warning', 'No employee assigned yet');
              }
            } else if (res.status === 204) {
              showToast('info', 'No employee assigned');
            } else {
              showToast('error', 'Failed to fetch employee');
            }
          } catch (err) {
            console.error('Error fetching employee details:', err);
            showToast('error', 'Error fetching employee');
          }
        }
        return;
      }

      // View report details
      if (e.target.closest('.view-details')) {
        const id = e.target.closest('.view-details').dataset.id;
        viewReportDetails(id);
        return;
      }
    });

    // Debounced search
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.trim();
        currentPage = 1;
        loadReports();
      }, 400);
    });

    // Apply filters button (or change on select)
    applyFiltersBtn?.addEventListener('click', () => {
      currentPage = 1;
      loadReports();
    });

    [statusFilter, timeFilter, deadlineFilter].forEach(sel => {
      sel?.addEventListener('change', () => {
        currentPage = 1;
        loadReports();
      });
    });

    // Global pagination click
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.page-link');
      if (!link) return;
      e.preventDefault();
      const page = parseInt(link.dataset.page);
      if (page && page !== currentPage) {
        currentPage = page;
        loadReports();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // Assign button click handler
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.assign-report');
      if (!btn) return;
      
      const reportId = btn.dataset.id;
      currentReportId = reportId;
      
      // Show the modal
      const assignModal = new bootstrap.Modal(document.getElementById('assignEmployeeModal'));
      assignModal.show();
      
      // Load unassigned employees
      await loadUnassignedEmployees();
    });
    
    // Employee search handler
    document.getElementById('employeeSearch')?.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#employeeList tr[data-employee]');
      
      let visibleCount = 0;
      rows.forEach(row => {
        const name = row.dataset.name.toLowerCase();
        const employeeId = row.dataset.employeeId.toLowerCase();
        const isVisible = name.includes(searchTerm) || employeeId.includes(searchTerm);
        row.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCount++;
      });
      
      // Show/hide no results message
      const noResults = document.getElementById('noEmployees');
      if (visibleCount === 0 && searchTerm) {
        noResults.querySelector('p').textContent = 'No matching employees found.';
        noResults.classList.remove('d-none');
      } else if (visibleCount === 0) {
        noResults.querySelector('p').textContent = 'No unassigned employees available in your department.';
        noResults.classList.remove('d-none');
      } else {
        noResults.classList.add('d-none');
      }
    });
    
    // Handle assign button click in the modal
    document.getElementById('employeeList')?.addEventListener('click', async (e) => {
      const assignBtn = e.target.closest('.assign-employee-btn');
      if (!assignBtn) return;
      
      const employeeId = assignBtn.dataset.employeeId;
      const reportId = currentReportId;
      
      try {
        showLoading(true);
        const assignRes = await fetch(`/api/complaints/${reportId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ employeeId })
        });
        
        if (!assignRes.ok) {
          const error = await assignRes.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to assign employee');
        }
        
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('assignEmployeeModal'));
        modal.hide();
        
        showToast('success', 'Employee assigned successfully');
        await loadReports();
      } catch (err) {
        console.error('Assignment error:', err);
        showToast('error', err.message || 'Failed to assign employee');
      } finally {
        showLoading(false);
      }
    });
    
    // Load unassigned employees
    async function loadUnassignedEmployees() {
      console.log('Auth token:', localStorage.getItem('token'));
      const tokenData = decodeToken();
      console.log('Token department:', tokenData?.department);
      const employeeList = document.getElementById('employeeList');
      const noEmployees = document.getElementById('noEmployees');
      
      try {
        employeeList.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              Loading employees...
            </td>
          </tr>`;
        
        noEmployees.classList.add('d-none');
        
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const url = `/api/employees/unassigned?t=${timestamp}`;
        
        console.log('Fetching unassigned employees from:', url);
        
        const res = await fetch(url, { 
          headers: authHeaders(),
          cache: 'no-store'  // Prevent caching
        });
        
        console.log('Response status:', res.status);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to load employees: ${res.status} ${res.statusText}`);
        }
        
        const response = await res.json();
        console.log('Employees data:', response);
        
        const employees = response.data || [];
        
        if (employees.length === 0) {
          employeeList.innerHTML = '';
          noEmployees.classList.remove('d-none');
          return;
        }
        
        employeeList.innerHTML = employees.map(emp => `
          <tr data-employee data-name="${emp.name}" data-employee-id="${emp.employeeId}">
            <td>
              <div class="d-flex align-items-center">
                <div class="avatar-sm me-3">
                  <div class="avatar-title bg-primary-subtle text-primary rounded-circle">
                    ${emp.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h6 class="mb-0">${emp.name}</h6>
                  <small class="text-muted">${emp.department || 'N/A'}</small>
                </div>
              </div>
            </td>
            <td>${emp.employeeId}</td>
            <td>
              <div>${emp.email || 'N/A'}</div>
              <small class="text-muted">${emp.phone || 'No phone'}</small>
            </td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary assign-employee-btn" 
                      data-employee-id="${emp.employeeId}">
                <i class="fas fa-user-check me-1"></i> Assign
              </button>
            </td>
          </tr>
        `).join('');
        
      } catch (err) {
        console.error('Error loading employees:', err);
        employeeList.innerHTML = `
          <tr>
            <td colspan="4" class="text-center text-danger">
              <i class="fas fa-exclamation-circle me-2"></i>
              Failed to load employees. Please try again.
            </td>
          </tr>`;
      }
    }

  // Edit form submit
    editForm?.addEventListener('submit', handleEditSubmit);
  }

  /* ------------------------------------------------------------------
   *  API helpers
   * ----------------------------------------------------------------*/
  function authHeaders(){
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found in localStorage');
      // Redirect to login if no token is found
      if (!window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
      }
      return {};
    }
    return { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
  /* ------------------------------------------------------------------
   *  Load reports list
   * ----------------------------------------------------------------*/
  function decodeToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Decoded token payload:', payload);
      return payload;
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  } 

  
  async function loadReports() {
    console.log('loadReports called, showing loading...');
    
    // Ensure any existing loading overlay is removed first
    const existingLoader = document.getElementById('loading');
    if (existingLoader) {
      existingLoader.remove();
    }
    
    showLoading(true);
    
    try {
      console.log('Current page:', currentPage, 'Items per page:', itemsPerPage);
      const params = new URLSearchParams();
      params.set('page', currentPage);
      params.set('limit', itemsPerPage);

      // Filters
      if (statusFilter?.value) params.set('status', statusFilter.value);

      // Time range translation -> startDate
      if (timeFilter?.value) {
        const now = new Date();
        let startDate;
        switch (timeFilter.value) {
          case '24h': startDate = new Date(now.getTime() - 24*60*60*1000); break;
          case '7d':  startDate = new Date(now.getTime() - 7*24*60*60*1000); break;
          case '30d': startDate = new Date(now.getTime() - 30*24*60*60*1000); break;
        }
        if (startDate) params.set('startDate', startDate.toISOString());
      }

      // Deadline translation -> deadlineBefore/After
      if (deadlineFilter?.value) {
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(todayStart.getTime() + 24*60*60*1000 - 1);
        if (deadlineFilter.value === 'overdue') {
          params.set('deadlineBefore', todayStart.toISOString());
        } else if (deadlineFilter.value === 'today') {
          params.set('deadlineAfter', todayStart.toISOString());
          params.set('deadlineBefore', todayEnd.toISOString());
        } else if (deadlineFilter.value === 'week') {
          const weekEnd = new Date(todayStart.getTime() + 7*24*60*60*1000);
          params.set('deadlineAfter', todayStart.toISOString());
          params.set('deadlineBefore', weekEnd.toISOString());
        }
      }

      // Add search query if exists
      if (searchQuery) params.set('search', searchQuery);

      const headers = authHeaders();
      // If headers is empty, auth failed and we're being redirected
      if (Object.keys(headers).length === 0) {
        return;
      }
      
      // Make the API call
      const res = await fetch(`/api/complaints?${params.toString()}`, {
        headers: headers
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // If unauthorized, clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = 'login.html';
        }
        throw new Error(`Failed to load reports: ${res.status} ${res.statusText}`);
      }

      // Parse JSON and normalise to array
      const data = await res.json();
      const itemsArr = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.reports)
            ? data.reports
            : [];

      reports = itemsArr;
      totalItems = itemsArr.length;

      // Refresh UI
      renderReports();
      updatePagination();
      updateStats();
    } catch (err) {
      console.error('Error loading reports:', err);
      showToast('error', 'Failed to load reports');
    } finally {
      showLoading(false);
    }
  }


/* ------------------------------------------------------------------
 *  Render list & helpers
 * ----------------------------------------------------------------*/
function renderReports() {
  console.log('renderReports called with reports:', reports);
  
  try {
    if (!reportsList) {
      console.error('reportsList element not found in DOM');
      return;
    }
    
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
      console.log('No reports to display, showing empty state');
      reportsList.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
          <p class="text-muted">No reports found.</p>
          <button class="btn btn-primary mt-3" onclick="window.location.reload()">
            <i class="fas fa-sync-alt me-2"></i>Refresh
          </button>
        </div>`;
      return;
    }

    console.log('Rendering', reports.length, 'reports');
    reportsList.innerHTML = reports.map(r => reportCardHTML(r)).join('');

    // Attach click handlers
    const viewButtons = reportsList.querySelectorAll('.view-details');
    console.log('Found', viewButtons.length, 'view buttons');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => viewReportDetails(btn.dataset.id));
    });
    
    const editButtons = reportsList.querySelectorAll('.edit-report');
    console.log('Found', editButtons.length, 'edit buttons');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    
    const deleteButtons = reportsList.querySelectorAll('.delete-report');
    console.log('Found', deleteButtons.length, 'delete buttons');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteReport(btn.dataset.id));
    });
  } catch (error) {
    console.error('Error in renderReports:', error);
    reportsList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
        <p class="text-danger">Error loading reports. Please try again.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Reload Page</button>
      </div>`;
  }
}

/**
 * Shows detailed employee information in a modal
 * @param {Object} employee - Employee data object
 * @param {Object} reportData - Optional report data if available
 */
async function showEmployeeDetails(employee) {
  if (!employee) return;

  // Basic Info
  const name = employee.name || 'Employee';
  const employeeId = employee.employeeId || 'N/A';
  const department = employee.department || 'Not specified';
  const email = employee.email || '';
  const phone = employee.phone || '';
  const status = employee.status || 'Active';
  const role = employee.role || 'Field Agent';
  const photoUrl = employee.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D6EFD&color=fff&size=160`;

  // Set basic info
  document.querySelectorAll('#employeeName').forEach(el => el.textContent = name);
  document.getElementById('employeeId').textContent = `ID: ${employeeId}`;
  document.getElementById('employeeDepartment').textContent = department;
  document.getElementById('employeeDepartmentBadge').textContent = department;
  document.getElementById('employeeStatus').textContent = status.charAt(0).toUpperCase() + status.slice(1);
  document.getElementById('employeeRole').textContent = role;
  
  // Set photo
  const photoElement = document.getElementById('employeePhoto');
  if (photoElement) {
    photoElement.src = photoUrl;
    photoElement.alt = name;
  }

  // Contact Info
  const emailLink = document.getElementById('employeeEmail');
  if (email) {
    emailLink.textContent = email;
    emailLink.href = `mailto:${email}`;
    emailLink.closest('.d-flex').style.display = 'flex';
  } else {
    emailLink.closest('.d-flex').style.display = 'none';
  }
  
  const phoneLink = document.getElementById('employeePhone');
  if (phone) {
    phoneLink.textContent = phone;
    phoneLink.href = `tel:${phone}`;
    phoneLink.closest('.d-flex').style.display = 'flex';
  } else {
    phoneLink.closest('.d-flex').style.display = 'none';
  }

  // Report Info
  const assignedReportInfo = document.getElementById('assignedReportInfo');
  if (employee.reportId) {
    assignedReportInfo.innerHTML = `
      <div class="d-flex align-items-center mb-2">
        <i class="fas fa-clipboard-check text-primary me-2"></i>
        <span class="fw-medium">Current Report:</span>
        <span id="currentReport" class="ms-auto fw-medium text-primary">#${employee.reportId.substring(0, 8)}</span>
      </div>
      <div class="d-flex align-items-center mb-2">
        <i class="far fa-calendar-alt text-primary me-2"></i>
        <span>Assigned: </span>
        <span id="assignedDate" class="ms-auto">${formatDate(employee.assignedAt || new Date(), true)}</span>
      </div>
      <div class="d-flex align-items-center">
        <i class="fas fa-hourglass-half text-primary me-2"></i>
        <span>Status: </span>
        <span class="badge bg-warning bg-opacity-20 text-warning ms-auto">In Progress</span>
      </div>
    `;
  } else {
    assignedReportInfo.innerHTML = `
      <div class="text-center py-3">
        <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
        <p class="mb-0 text-muted">No active reports assigned</p>
      </div>
    `;
  }

  // Helper function to safely set text content with null check
  function setTextContent(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
      return true;
    }
    console.warn(`Element '${selector}' not found`);
    return false;
  }
  
  // Helper function to safely update metric cards
  function updateMetricCard(metricId, value) {
    const card = document.querySelector(`#employeeDetailsModal #${metricId}`);
    if (card) {
      card.textContent = value;
      return true;
    }
    console.warn(`Metric card '${metricId}' not found`);
    return false;
  }

  // Helper to safely set innerHTML of an element by id
  function safeSetInnerHTML(elementId, html) {
    const el = document.getElementById(elementId);
    if (el) {
      el.innerHTML = html;
      return true;
    }
    console.warn(`Element with id '${elementId}' not found`);
    return false;
  }

  // Fetch and update the assigned report, performance, and activity
  if (employee.employeeId) {
    try {
      // Show loading state
      const loadingElement = document.createElement('div');
      loadingElement.className = 'text-center py-4';
      loadingElement.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
      
      // Set loading state for assigned report info
      const assignedReportInfo = document.getElementById('assignedReportInfo');
      if (assignedReportInfo) {
        assignedReportInfo.innerHTML = '';
        assignedReportInfo.appendChild(loadingElement.cloneNode(true));
      }
      
      // Set loading state for performance metrics
      const modalEl = document.getElementById('employeeDetailsModal');
      const metrics = ['totalReports', 'completedReports', 'inProgressReports', 'rating'];
      metrics.forEach(id => {
        const element = modalEl ? modalEl.querySelector(`#${id}`) : null;
        if (element) {
          element.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
        }
      });
      
      // Set loading state for activity timeline
      const activityTimeline = document.querySelector('.activity-timeline');
      if (activityTimeline) {
        // Find the first activity item container or use the timeline itself
        const activityItems = activityTimeline.querySelector('.d-flex') ? 
          activityTimeline.querySelectorAll('.d-flex') : 
          [];
        
        // Clear existing activities
        activityTimeline.querySelectorAll('.d-flex').forEach(el => el.remove());
        
        // Add loading indicator
        const loadingItem = document.createElement('div');
        loadingItem.className = 'd-flex justify-content-center py-3';
        loadingItem.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        activityTimeline.appendChild(loadingItem);
      }
      
      // Fetch all data in parallel
      const empBackendId = employee._id || employee.id || employee.employeeId;
      const [assignedReport, performanceData, activityData] = await Promise.all([
        fetchAssignedReport(empBackendId),
        fetchEmployeePerformance(empBackendId),
        fetchEmployeeActivity(empBackendId)
      ]);
      
      // Update assigned report section
      const assignedReportEl = document.getElementById('assignedReportInfo');
      if (assignedReportEl) {
        if (assignedReport) {
          updateAssignedReport(assignedReport);
        } else {
          safeSetInnerHTML(
            'assignedReportInfo',
            `<div class="text-center py-3">
              <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
              <p class="mb-0 text-muted">No active reports assigned</p>
            </div>`
          );
        }
      }

      // Update performance metrics
      if (performanceData) {
        updateMetricCard('totalReports', performanceData.totalReports || '0');
        updateMetricCard('completedReports', performanceData.completedReports || '0');
        updateMetricCard('inProgressReports', performanceData.inProgressReports || '0');
        updateMetricCard(
          'rating',
          performanceData.averageRating ? performanceData.averageRating.toFixed(1) : '0.0'
        );
      } else {
        metrics.forEach((id) => updateMetricCard(id, '-'));
      }

      // Update activity timeline
      const timelineEl = document.querySelector('#employeeDetailsModal .activity-timeline');
      if (timelineEl) {
        // Clear existing content
        timelineEl.innerHTML =
          '<h6 class="text-uppercase small fw-bold text-muted mb-3">Recent Activity</h6>';

        if (activityData && activityData.length > 0) {
          activityData.forEach((activity) => {
            const item = document.createElement('div');
            item.className = 'd-flex mb-3';

            item.innerHTML = `
              <div class="flex-shrink-0">
                <div class="bg-${activity.type === 'completed' ? 'success' : 'primary'}-subtle rounded-circle p-2 text-${activity.type === 'completed' ? 'success' : 'primary'}">
                  <i class="fas fa-${activity.type === 'completed' ? 'check-circle' : 'tasks'}"></i>
                </div>
              </div>
              <div class="ms-3">
                <p class="mb-0 fw-medium">${activity.description || 'Activity'}</p>
                <p class="small text-muted mb-0">${formatDate(activity.timestamp || new Date(), true)}</p>
              </div>`;

            timelineEl.appendChild(item);
          });
        } else {
          timelineEl.innerHTML += `
            <div class="text-center py-3">
              <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
              <p class="mb-0 text-muted">No recent activity</p>
            </div>`;
        }
      }
    } catch (error) {
      console.error('Error in showEmployeeDetails:', error);
      showToast('error', 'An error occurred while loading employee details.');
    }
  }

  // Fetch assigned report data
  async function fetchAssignedReport(employeeBackendId) {
    try {
      console.log('Fetching assigned report for employee:', employeeBackendId);
      // Request only one current in-progress report for this employee
      const statusParam = encodeURIComponent('in progress');
      const response = await fetch(`/api/complaints?assignedTo=${employeeBackendId}&status=${statusParam}&limit=1`, {
        headers: {
          ...authHeaders()
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error response:', error);
        throw new Error('Failed to fetch assigned report');
      }
      
      const result = await response.json();
      console.log('Assigned reports response:', result);
      // The reports are in result.data array
      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error('Error fetching assigned report:', error);
      return null;
    }
  }

  // Helper to determine if a report belongs to the given employee
  function isReportForEmployee(report, empId) {
    if (!report || !report.assignedTo) return false;
    const assigned = report.assignedTo;
    return String(assigned._id || '') === String(empId) || String(assigned.employeeId || '') === String(empId);
  }

  // Fetch employee performance data (client-side calculation)
  async function fetchEmployeePerformance(employeeBackendId) {
    try {
      // Ask backend for reports assigned to this employee (should be filtered already). If backend filter isn't supported it will at least reduce payload.
      const response = await fetch(`/api/complaints?assignedTo=${employeeBackendId}&limit=1000`, {
        headers: {
          ...authHeaders()
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const result = await response.json();
      const reports = Array.isArray(result.data) ? result.data.filter(r => isReportForEmployee(r, employeeBackendId)) : [];

      const totalReports = reports.length;
      const statusCounts = reports.reduce((acc, r) => {
        const status = (r.status || '').toLowerCase();
        if (status.includes('progress')) acc.inProgress++;
        else if (status === 'resolved' || status === 'completed') acc.completed++;
        return acc;
      }, { inProgress: 0, completed: 0 });

      return {
        totalReports,
        completedReports: statusCounts.completed,
        inProgressReports: statusCounts.inProgress,
        averageRating: 0 // placeholder until backend provides rating
      };
    } catch (error) {
      console.error('Error fetching employee performance:', error);
      return {
        totalReports: 0,
        completedReports: 0,
        inProgressReports: 0,
        averageRating: 0
      };
    }
  }

  // Fetch employee's recent activity
  async function fetchEmployeeActivity(employeeBackendId) {
    try {
      const response = await fetch(`/api/complaints?assignedTo=${employeeBackendId}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity data');
      }
      
      const result = await response.json();
      
      // Transform report data into activity items
      if (result.success && Array.isArray(result.data)) {
        return result.data.map(report => ({
          type: 'report_assigned',
          description: `Assigned report #${report.reportId || report._id.toString().substring(18, 24)}`,
          timestamp: report.assignedAt || report.createdAt,
          reportId: report._id
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching employee activity:', error);
      return [];
    }
  }

  // Update assigned report info
  function updateAssignedReport(report) {
    console.log('Updating assigned report with data:', report);
    const assignedReportInfo = document.getElementById('assignedReportInfo');
    
    if (!report) {
      console.log('No report provided to updateAssignedReport');
      assignedReportInfo.innerHTML = `
        <div class="text-center py-3">
          <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
          <p class="mb-0 text-muted">No active reports assigned</p>
        </div>
      `;
      return;
    }
    
    assignedReportInfo.innerHTML = `
      <div class="d-flex align-items-center mb-2">
        <i class="fas fa-clipboard-check text-primary me-2"></i>
        <span class="fw-medium">Current Report:</span>
        <a href="#" class="ms-auto fw-medium text-primary text-decoration-none view-report" data-id="${report._id}">#${report.reportId || report._id.toString().substring(18, 24)}</a>
      </div>
      <div class="d-flex align-items-center mb-2">
        <i class="far fa-calendar-alt text-primary me-2"></i>
        <span>Assigned: </span>
        <span class="ms-auto">${formatDate(report.assignedAt || report.createdAt, true)}</span>
      </div>
      <div class="d-flex align-items-center">
        <i class="fas fa-hourglass-half text-primary me-2"></i>
        <span>Status: </span>
        <span class="badge bg-warning bg-opacity-20 text-warning ms-auto">${report.status || 'In Progress'}</span>
      </div>
    `;
    
    // Add event listener for view report button
    const viewReportBtn = assignedReportInfo.querySelector('.view-report');
    if (viewReportBtn) {
      viewReportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const reportId = e.currentTarget.getAttribute('data-id');
        // Trigger view report modal
        viewReportDetails(reportId);
      });
    }
  }

/* Duplicated block (fetchEmployeeActivity) - commented out to fix syntax errors
      const response = await fetch(`/api/complaints?assignedTo=${employeeBackendId}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity data');
      }
      
      const result = await response.json();
      
      // Transform report data into activity items
      if (result.success && Array.isArray(result.data)) {
        return result.data.map(report => ({
          type: 'report_assigned',
          description: `Assigned report #${report.reportId || report._id.toString().substring(18, 24)}`,
          timestamp: report.assignedAt || report.createdAt,
          reportId: report._id
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching employee activity:', error);
      return [];
    }
*/

  // Update performance metrics
  function updatePerformanceMetrics(stats) {
    if (!stats) return;
    
    const modalEl = document.getElementById('employeeDetailsModal');
    if (!modalEl) return;
    modalEl.querySelector('#totalReports').textContent = stats.totalReports || '0';
    modalEl.querySelector('#completedReports').textContent = stats.completedReports || '0';
    modalEl.querySelector('#inProgressReports').textContent = stats.inProgressReports || '0';
    modalEl.querySelector('#rating').textContent = stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A';
  }

  // Update activity timeline
  function updateActivityTimeline(activities) {
    const timeline = document.querySelector('#employeeDetailsModal .activity-timeline');
    if (!timeline) return;
    
    if (!activities || activities.length === 0) {
      timeline.innerHTML = `
        <div class="text-center py-3">
          <i class="fas fa-inbox fa-2x text-muted mb-2"></i>
          <p class="mb-0 text-muted">No recent activity</p>
        </div>
      `;
      return;
    }
    
    // Define activity type icons and colors
    const activityIcons = {
      'report_assigned': 'clipboard-check',
      'report_completed': 'check-circle',
      'report_updated': 'edit',
      'comment_added': 'comment',
      'status_changed': 'sync'
    };
    
    const activityColors = {
      'report_assigned': 'primary',
      'report_completed': 'success', 
      'report_updated': 'info',
      'comment_added': 'warning',
      'status_changed': 'secondary'
    };
    
    const activityHtml = activities.map(activity => {
      const icon = activityIcons[activity.type] || 'circle';
      const color = activityColors[activity.type] || 'secondary';
      const date = formatDate(activity.timestamp || new Date(), true);
      
      return `
        <div class="timeline-item">
          <div class="timeline-icon bg-soft-${color} text-${color}">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="timeline-content">
            <p class="mb-1">${activity.description || 'Activity'}</p>
            <small class="text-muted">${date}</small>
          </div>
        </div>
      `;
    }).join('');
    
    timeline.innerHTML = activityHtml;
  }

  // Helper function to get activity icon
  function getActivityIcon(type) {
    const icons = {
      'report_created': 'fa-file-alt',
      'report_updated': 'fa-edit',
      'report_completed': 'fa-check-circle',
      'note_added': 'fa-comment-alt',
      'status_changed': 'fa-exchange-alt',
      'assigned': 'fa-user-check',
      'report_assigned': 'fa-clipboard-check'
    };
    return icons[type] || 'fa-info-circle';
  }

  // Helper function to get activity icon class
  function getActivityIconClass(type) {
    const classes = {
      'report_created': 'text-primary',
      'report_updated': 'text-warning',
      'report_completed': 'text-success',
      'note_added': 'text-info',
      'status_changed': 'text-purple',
      'assigned': 'text-primary',
      'report_assigned': 'text-primary'
    };
    return classes[type] || 'text-secondary';
  }

  // This Promise.all was a duplicate and has been moved to the top of the function

  // Setup action buttons
  const callBtn = document.querySelector('[data-action="call"]');
  const emailBtn = document.querySelector('[data-action="email"]');
  
  if (callBtn && phone) {
    callBtn.onclick = () => window.open(`tel:${phone}`, '_blank');
    callBtn.disabled = false;
  } else if (callBtn) {
    callBtn.disabled = true;
  }
  
  if (emailBtn && email) {
    emailBtn.onclick = () => window.open(`mailto:${email}`, '_blank');
    emailBtn.disabled = false;
  } else if (emailBtn) {
    emailBtn.disabled = true;
  }

  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
  modal.show();
}

function reportCardHTML(r) {
    if (!r) {
      console.error('Invalid report data received:', r);
      return '<div class="col-12"><div class="alert alert-warning">Invalid report data</div></div>';
    }

    const status = r.status || 'unknown';
    const priority = r.priority || 'medium';
    const statusClass = getStatusBadgeClass(status);
    const priorityClass = getPriorityBadgeClass(priority);
    const reportId = r._id || 'unknown';
    const title = r.title || 'Untitled Report';
    const description = r.description ? r.description.slice(0, 120) : 'No description';
  
    // Employee assignment section
    let assignSection = '';
    if (r.assignedTo && typeof r.assignedTo === 'object') {
      // If assigned, show employee details
      assignSection = `
        <div class="assigned-employee mt-2 p-2 bg-light rounded">
          <div class="d-flex align-items-center">
            <div class="flex-shrink-0">
              <i class="fas fa-user-circle fa-2x text-primary"></i>
            </div>
            <div class="ms-2 flex-grow-1">
              <div class="fw-bold">${r.assignedTo.name || 'Employee'}</div>
              <div class="small text-muted">
                ID: ${r.assignedTo.employeeId || 'N/A'} • ${r.assignedTo.department || 'N/A'}
              </div>
              <div class="small">
                <i class="fas fa-phone-alt me-1"></i> ${r.assignedTo.phone || 'N/A'}
                <span class="ms-2">
                  <i class="fas fa-envelope me-1"></i> ${r.assignedTo.email || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>`;
    } else if (r.status === 'reported' || r.status === 'pending') {
      // Only show assign button for reports that can be assigned
      assignSection = `
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-primary assign-report w-100" data-id="${r._id}">
            <i class="fas fa-user-plus me-1"></i> Assign to Employee
          </button>
        </div>`;
    }

    return `
    <div class="col-12 col-md-6 col-lg-4 mb-4">
      <div class="card report-card h-100 shadow-sm">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h5 class="card-title mb-0 text-truncate" title="${title}">${title}</h5>
            <span class="badge ${statusClass} status-badge">${formatStatus(status)}</span>
          </div>
          <p class="text-muted small mb-2 flex-grow-1">${description}</p>
          
          <!-- Employee Assignment Section -->
          ${assignSection}
          
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="badge bg-${priorityClass}">${priority}</span>
            <div class="btn-group">
              ${(r.assignedTo || r.status === 'in-progress') ? `
                <button class="btn btn-sm btn-outline-info view-employee" 
                        ${r.assignedTo ? `data-employee='${JSON.stringify(r.assignedTo)}'` : `data-report-id='${reportId}'`} 
                        title="View Employee Details">
                  <i class="fas fa-user-tie"></i>
                </button>
              ` : ''}
              <button class="btn btn-sm btn-outline-secondary view-details" 
                      data-id="${reportId}" 
                      title="View Report Details">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-link text-danger delete-report" data-id="${r._id}" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------
   *  Details modal
   * ----------------------------------------------------------------*/
  async function viewReportDetails(id) {
    try {
      showLoading(true);
      const res = await fetch(`/api/complaints/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch report details');
      const r = await res.json();
      currentReportId = id;
      
      // Get the modal content container
      const container = document.getElementById('reportDetailsContent');
      container.innerHTML = detailsHTML(r);
      
      // Show the modal
      reportDetailsModal.show();
    } catch (err) {
      console.error('Error loading report details:', err);
      showError('Failed to load report details. Please try again.');
    } finally { 
      showLoading(false); 
    }
  }

  function detailsHTML(r) {
    // Format dates
    const createdAt = formatDate(r.createdAt, true);
    const updatedAt = formatDate(r.updatedAt || r.createdAt, true);
    
    // Generate photos HTML if available
    const photosHTML = r.images && r.images.length > 0 ? `
      <div class="row g-2 mt-2">
        ${r.images.slice(0, 4).map((img, index) => `
          <div class="col-6 col-sm-3">
            <a href="${img.url || img}" target="_blank" class="d-block">
              <img src="${img.url || img}" class="img-thumbnail w-100" style="height: 120px; object-fit: cover;" 
                   alt="Report image ${index + 1}">
            </a>
          </div>
        `).join('')}
      </div>` : 
      '<div class="alert alert-light">No images attached</div>';
    
    // Generate location info if available
    const locationInfo = r.location?.coordinates ? `
      <div class="mt-2">
        <p class="text-muted small mt-2">
          <i class="fas fa-map-marker-alt me-1"></i>
          ${r.location.address || 'Location not specified'}
        </p>
      </div>` : 
      '<p class="text-muted"><i class="fas fa-map-marker-alt me-1"></i> No location data available</p>';

    return `
    <div class="report-details">
      <!-- Citizen Info Section -->
      <div class="card mb-4">
        <div class="card-header bg-light">
          <h5 class="mb-0"><i class="fas fa-user-circle me-2"></i>Citizen Information</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p class="mb-2"><strong>Name:</strong> ${r.reportedBy?.name || 'Not provided'}</p>
              <p class="mb-2"><strong>Email:</strong> ${r.reportedBy?.email || 'Not provided'}</p>
              <p class="mb-2"><strong>Phone:</strong> ${r.reportedBy?.phone || 'Not provided'}</p>
              <p class="mb-2"><strong>Account Status:</strong> 
                <span class="badge ${r.reportedBy?.isActive ? 'bg-success' : 'bg-secondary'}">
                  ${r.reportedBy?.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div class="col-md-6">
              <p class="mb-2"><strong>Address:</strong> ${r.reportedBy?.address || 'Not available'}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Info Section -->
      <div class="card mb-4">
        <div class="card-header bg-light">
          <h5 class="mb-0"><i class="fas fa-file-alt me-2"></i>Report Information</h5>
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <p class="mb-2"><strong>Report ID:</strong> ${r._id || 'N/A'}</p>
              <p class="mb-2"><strong>Category:</strong> ${r.category || 'Not specified'}</p>
              <p class="mb-2"><strong>Reported On:</strong> ${createdAt}</p>
            </div>
            <div class="col-md-6">
              <p class="mb-2"><strong>Status:</strong> 
                <span class="badge ${getStatusBadgeClass(r.status)} text-uppercase">
                  ${r.status || 'Unknown'}
                </span>
              </p>
              <p class="mb-2"><strong>Priority:</strong> 
                <span class="badge ${getPriorityBadgeClass(r.priority)}">
                  ${r.priority || 'Not set'}
                </span>
              </p>
              ${r.assignedTo ? `<p class="mb-2"><strong>Assigned To:</strong> ${r.assignedTo}</p>` : ''}
            </div>
          </div>
          
          <div class="mb-3">
            <h6>Description</h6>
            <div class="p-3 bg-light rounded">
              ${r.description || 'No description provided.'}
            </div>
          </div>
          
          <div class="mb-3">
            <h6>Location</h6>
            ${locationInfo}
          </div>
          
          <div class="mb-3">
            <h6>Attached Images</h6>
            ${photosHTML}
          </div>
        </div>
      </div>

      <!-- Current Status Section -->
      <div class="card">
        <div class="card-header bg-light">
          <h5 class="mb-0"><i class="fas fa-tasks me-2"></i>Status & Updates</h5>
        </div>
        <div class="card-body">
          <div class="timeline">
            ${generateStatusTimeline(r)}
          </div>
          
          ${r.comments && r.comments.length > 0 ? `
            <div class="mt-4">
              <h6>Recent Updates</h6>
              <div class="list-group">
                ${r.comments.slice(0, 3).map(comment => `
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h6 class="mb-1">${comment.postedBy || 'System'}</h6>
                      <small class="text-muted">${formatDate(comment.timestamp, true)}</small>
                    </div>
                    <p class="mb-1">${comment.text}</p>
                    ${comment.status ? `<span class="badge bg-secondary">${comment.status}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${r.resolutionDetails ? `
            <div class="alert alert-success mt-3">
              <h6><i class="fas fa-check-circle me-2"></i>Resolution Details</h6>
              <p class="mb-0">${r.resolutionDetails}</p>
            </div>
          ` : ''}
        </div>
      </div>
    </div>`;
  }
  
  function generateStatusTimeline(report) {
    // Define possible statuses in order
    const statuses = [
      { status: 'reported', label: 'Reported', date: report.createdAt, icon: 'fa-flag' },
      { status: 'in-progress', label: 'In Progress', date: report.inProgressAt, icon: 'fa-spinner' },
      { status: 'resolved', label: 'Resolved', date: report.resolvedAt, icon: 'fa-check-circle' },
      { status: 'closed', label: 'Closed', date: report.closedAt, icon: 'fa-lock' }
    ];
    
    // Normalize current status
    let currentStatus = (report.status || '').toLowerCase();
    if (currentStatus === 'open') currentStatus = 'reported';
    
    // Find the current status index
    const currentStatusIndex = statuses.findIndex(s => s.status === currentStatus);
    
    return statuses.map((item, index) => {
      const isCompleted = currentStatusIndex >= index;
      const isCurrent = item.status === currentStatus;
      const isLast = index === statuses.length - 1;
      
      // Get appropriate icon and color based on status
      let iconClass = 'fa-circle';
      let iconColor = 'text-muted';
      
      if (isCompleted) {
        iconClass = 'fa-check-circle';
        iconColor = 'text-success';
      }
      if (isCurrent) {
        iconClass = item.icon || 'fa-circle';
        iconColor = 'text-primary';
      }
      
      return `
        <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
          <div class="timeline-marker ${iconColor}">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="timeline-content">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-1">${item.label}</h6>
              ${item.date ? `<small class="text-muted">${formatDate(item.date, true)}</small>` : ''}
            </div>
            ${item.status === currentStatus && report.assignedTo ? 
              `<p class="small mb-0">Assigned to: <strong>${report.assignedTo}</strong></p>` : ''}
            ${!isLast ? '<div class="timeline-connector"></div>' : ''}
          </div>
        </div>`;
    }).join('');
  }

  /* ------------------------------------------------------------------
   *  Edit modal
   * ----------------------------------------------------------------*/
  async function openEditModal(id) {
    try {
      showLoading(true);
      const res = await fetch(`/api/complaints/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const r = await res.json();
      currentReportId = id;
      // populate form
      document.getElementById('edit-report-id').value = id;
      document.getElementById('edit-status').value = r.status;
      document.getElementById('edit-priority').value = r.priority || 'medium';
      document.getElementById('edit-due-date').value = r.dueDate ? r.dueDate.substr(0,10) : '';
      document.getElementById('edit-comment').value = '';
      editReportModal.show();
    } catch(e){
      showError('Failed loading for edit');
    } finally { showLoading(false); }
  }

  async function handleEditSubmit(e){
    e.preventDefault();
    const formData = new FormData(editForm);
    const id = formData.get('edit-report-id');
    const body = {
      status: formData.get('status'),
      priority: formData.get('priority'),
      assignedTo: formData.get('assignedTo') || null,
      dueDate: formData.get('dueDate') || null,
    };
    const comment = formData.get('comment');
    if (comment) body.comment = { text: comment, internal: true };

    try {
      showLoading(true);
      const res = await fetch(`/api/complaints/${id}`, {
        method:'PATCH',
        headers:{ 'Content-Type':'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error();
      showToast('success','Report updated');
      editReportModal.hide();
      await loadReports();
    } catch(err){
      console.error(err);
      showError('Update failed');
    } finally{ showLoading(false);}  
  }

  /* ------------------------------------------------------------------
   *  Delete
   * ----------------------------------------------------------------*/
  function confirmDeleteReport(id){
    if (confirm('Delete this report?')) deleteReport(id);
  }

  async function deleteReport(id){
    try{
      showLoading(true);
      const res = await fetch(`/api/complaints/${id}`,{method:'DELETE', headers:authHeaders()});
      if(!res.ok) throw new Error();
      showToast('success','Report deleted');
      reportDetailsModal.hide();
      await loadReports();
    }catch(err){
      showError('Deletion failed');
    }finally{ showLoading(false); }
  }

  /* ------------------------------------------------------------------
   *  Pagination UI
   * ----------------------------------------------------------------*/
  function updatePagination(){
    if(!paginationEl) return;
    const totalPages = Math.ceil(totalItems/itemsPerPage) || 1;
    if(totalPages<=1){ paginationEl.innerHTML=''; return; }

    let html = `<li class="page-item ${currentPage===1?'disabled':''}">
      <a class="page-link" href="#" data-page="${currentPage-1}" aria-label="Prev">&laquo;</a></li>`;

    for(let p=1;p<=totalPages;p++){
      if (p===1 || p===totalPages || Math.abs(p-currentPage)<=1){
        html += `<li class="page-item ${p===currentPage?'active':''}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
      } else if(Math.abs(p-currentPage)===2){
        html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }
    }

    html += `<li class="page-item ${currentPage===totalPages?'disabled':''}">
      <a class="page-link" href="#" data-page="${currentPage+1}" aria-label="Next">&raquo;</a></li>`;

    paginationEl.innerHTML = html;
  }

  /* ------------------------------------------------------------------
   *  Stats cards
   * ----------------------------------------------------------------*/
  function updateStats(){
    const totalEl    = document.getElementById('totalReports');
    const progEl     = document.getElementById('inProgress');
    const resEl      = document.getElementById('resolved');
    const overdueEl  = document.getElementById('overdue');
    if(!totalEl) return;

    const stats = {
      total: reports.length,
      inProg: reports.filter(r=>r.status==='in progress').length,
      resolved: reports.filter(r=>r.status==='resolved').length,
      overdue: reports.filter(r=> r.dueDate && new Date(r.dueDate) < new Date() && r.status!=='resolved').length
    };
    totalEl.textContent = stats.total;
    progEl.textContent  = stats.inProg;
    resEl.textContent   = stats.resolved;
    overdueEl.textContent = stats.overdue;
  }

  /* ------------------------------------------------------------------
   *  Utilities
   * ----------------------------------------------------------------*/
  function formatStatus(s){ return s? s.replace(/\b\w/g,c=>c.toUpperCase()).replace('-',' '):'Unknown'; }
  function formatDate(d,withTime=false){
    if(!d) return 'N/A';
    const opts = {year:'numeric', month:'short', day:'numeric'};
    if(withTime){ opts.hour='2-digit'; opts.minute='2-digit'; opts.hour12=true; }
    return new Date(d).toLocaleString('en-US',opts);
  }
  function getStatusBadgeClass(s){
    return ({'pending':'bg-warning bg-opacity-10 text-warning','in progress':'bg-info bg-opacity-10 text-info','resolved':'bg-success bg-opacity-10 text-success','rejected':'bg-danger bg-opacity-10 text-danger','closed':'bg-secondary bg-opacity-10 text-secondary'}[s]||'bg-light text-dark');
  }
  function getPriorityBadgeClass(p){ return ({low:'success',medium:'info',high:'warning',critical:'danger'}[p]||'secondary'); }

  // Loading overlay
  function showLoading(show) {
    console.log('showLoading called with:', show);
    let el = document.getElementById('loading');
    
    if (!el && show) {
      console.log('Creating loading overlay');
      el = document.createElement('div');
      el.id = 'loading';
      el.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75';
      el.style.zIndex = '2000';
      el.innerHTML = `
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="ms-3">Loading reports...</div>
      `;
      document.body.appendChild(el);
    } else if (el) {
      console.log('Toggling loading overlay visibility');
      el.style.display = show ? 'flex' : 'none';
      
      // Force reflow
      void el.offsetHeight;
      
      // If hiding, remove the element after transition
      if (!show) {
        setTimeout(() => {
          if (el && !el.contains(document.activeElement)) {
            console.log('Removing loading overlay');
            el.remove();
          }
        }, 300);
      }
    }
  }

  function showError(msg){ showToast('error',msg); }

  // Generic toast
  function showToast(type,msg){
    const wrapper = document.createElement('div');
    wrapper.className='toast align-items-center text-white bg-'+(type==='error'?'danger':'success')+' border-0';
    wrapper.setAttribute('role','alert');
    wrapper.innerHTML=`<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    const container = document.createElement('div');
    container.className='position-fixed bottom-0 end-0 p-3';
    container.style.zIndex='1100';
    container.appendChild(wrapper);
    document.body.appendChild(container);
    const toast = new bootstrap.Toast(wrapper,{delay:4000});
    toast.show();
    wrapper.addEventListener('hidden.bs.toast',()=>document.body.removeChild(container));
  }
});