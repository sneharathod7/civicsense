/* Dashboard logic - fetch real data from backend */
(function () {
  const API_STATS = '/api/dashboard';
  const API_COMPLAINTS = '/api/complaints';

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  async function fetchStats() {
    const res = await fetch(API_STATS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch statistics');
    return res.json();
  }

  async function fetchComplaints() {
    const res = await fetch(API_COMPLAINTS, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch complaints');
    const { data } = await res.json();
    return data;
  }

  function renderStats(stats) {
    const container = document.getElementById('dashboard-stats');
    if (!container) return;
    const cards = [
      { label: 'Total Complaints', value: stats.total, icon: 'fa-ticket-alt', color: 'primary' },
      { label: 'Pending', value: stats.pending, icon: 'fa-clock', color: 'warning' },
      { label: 'In Progress', value: stats.active, icon: 'fa-spinner', color: 'info' },
      { label: 'Resolved', value: stats.resolved, icon: 'fa-check-circle', color: 'success' },
    ];
    container.innerHTML = '<div class="row g-4 mb-4">' +
      cards.map(c => `
        <div class="col-md-3">
          <div class="card border-0 bg-${c.color} bg-opacity-10">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h6 class="text-muted mb-1">${c.label}</h6>
                  <h3 class="mb-0 fw-bold">${c.value}</h3>
                </div>
                <div class="bg-${c.color} bg-opacity-10 p-3 rounded-circle">
                  <i class="fas ${c.icon} text-${c.color}"></i>
                </div>
              </div>
            </div>
          </div>
        </div>`).join('') + '</div>';
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function getStatusBadge(status) {
    if (!status) return '<span class="badge bg-secondary">Unknown</span>';
    
    const statusMap = {
      'pending': 'bg-warning',
      'in-progress': 'bg-info',
      'in progress': 'bg-info',
      'resolved': 'bg-success',
      'closed': 'bg-secondary',
      'rejected': 'bg-danger'
    };
    
    const statusClass = statusMap[status.toLowerCase()] || 'bg-secondary';
    const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    return `<span class="badge ${statusClass}">${displayStatus}</span>`;
  }

  async function showComplaintDetails(complaintId) {
    try {
      const modal = new bootstrap.Modal(document.getElementById('complaintDetailsModal'));
      
      // Show loading state
      document.getElementById('complaintTitle').textContent = 'Loading...';
      document.getElementById('reportTitle').textContent = 'Loading...';
      document.getElementById('reportDescription').textContent = 'Loading...';
      document.getElementById('reportCategory').textContent = 'Loading...';
      document.getElementById('reportStatus').innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
      document.getElementById('reportDate').textContent = 'Loading...';
      
      // Fetch complaint details with both assignedTo and statusHistory populated
      const res = await fetch(`/api/complaints/${complaintId}?populate=assignedTo,statusHistory`, { 
        headers: getAuthHeaders() 
      });
      
      if (!res.ok) throw new Error('Failed to fetch complaint details');
      
      let complaint = await res.json();
      
      // If assignedTo is not in the response, try to fetch it from the reports collection
      if (!complaint.assignedTo) {
        console.log('assignedTo not in initial response, trying to fetch reports...');
        try {
          // First, get the report ID from the complaint ID
          const reportsRes = await fetch(`/api/reports?complaint=${complaintId}`, {
            headers: getAuthHeaders()
          });
          
          if (reportsRes.ok) {
            const reportsData = await reportsRes.json();
            console.log('Reports data:', reportsData);
            
            // If we have reports, take the first one that has an assignedTo
            if (reportsData.length > 0) {
              const reportWithAssignment = reportsData.find(r => r.assignedTo);
              if (reportWithAssignment) {
                console.log('Found report with assignment:', reportWithAssignment);
                complaint.assignedTo = reportWithAssignment.assignedTo;
                complaint.dueDate = reportWithAssignment.dueDate || complaint.dueDate;
              }
            }
          } else {
            console.warn('Failed to fetch reports:', await reportsRes.text());
          }
        } catch (error) {
          console.warn('Error fetching reports:', error);
        }
      }
      
      console.log('Final complaint data:', JSON.stringify(complaint, null, 2));
      console.log('assignedTo type:', typeof complaint.assignedTo);
      console.log('assignedTo value:', complaint.assignedTo);
      
      // Setup Assign button
      const assignBtn = document.getElementById('assignBtn');
      if (complaint.assignedTo) {
        assignBtn.disabled = true;
        assignBtn.innerHTML = '<i class="fas fa-user-check me-1"></i> Assigned';
      } else {
        assignBtn.disabled = false;
        assignBtn.innerHTML = '<i class="fas fa-user-plus me-1"></i> Assign to Employee';
        assignBtn.onclick = () => {
          // Redirect to manage-reports with the report id as query parameter
          window.location.href = `manage-reports.html?reportId=${complaint._id}`;
        };
      }

      // Update modal with complaint details
      document.getElementById('complaintTitle').textContent = complaint.title || 'Untitled Complaint';
      document.getElementById('complaintId').textContent = `ID: ${complaint._id || ''}`;
      document.getElementById('reportTitle').textContent = complaint.title || 'No title';
      document.getElementById('reportDescription').textContent = complaint.description || 'No description provided';
      document.getElementById('reportCategory').textContent = complaint.category || 'Uncategorized';
      document.getElementById('reportStatus').innerHTML = getStatusBadge(complaint.status);
      document.getElementById('reportDate').textContent = formatDate(complaint.createdAt);
      
      // Update assignment details
      const assignmentDetails = document.getElementById('assignmentDetails');
      
      // Check if assignedTo exists and has data
      if (complaint.assignedTo) {
        // If assignedTo is a string (ID), we need to fetch the employee details
        if (typeof complaint.assignedTo === 'string' && complaint.assignedTo) {
          console.log('Fetching employee details for ID:', complaint.assignedTo);
          try {
            const empRes = await fetch(`/api/employees/${complaint.assignedTo}`, {
              headers: getAuthHeaders()
            });
            
            console.log('Employee fetch response status:', empRes.status);
            
            if (empRes.ok) {
              const employee = await empRes.json();
              console.log('Fetched employee details:', employee);
              assignmentDetails.innerHTML = `
                <div class="d-flex align-items-center mb-3">
                  <div class="avatar-circle me-3">
                    ${employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h6 class="mb-1">${employee.name || 'Unknown Employee'}</h6>
                    <p class="text-muted small mb-0">${employee.employeeId || 'No ID'}</p>
                  </div>
                </div>
                <div class="mb-2">
                  <small class="text-muted d-block">Email</small>
                  <div>${employee.email || '-'}</div>
                </div>
                <div class="mb-2">
                  <small class="text-muted d-block">Phone</small>
                  <div>${employee.phone || '-'}</div>
                </div>
                ${complaint.dueDate ? `
                  <div class="alert alert-warning p-2 mt-3 mb-0">
                    <i class="far fa-clock me-1"></i>
                    Due on ${formatDate(complaint.dueDate)}
                  </div>
                ` : ''}`;
            } else {
              throw new Error('Failed to fetch employee details');
            }
          } catch (error) {
            console.error('Error fetching employee:', error);
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
            assignmentDetails.innerHTML = `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Assigned to employee ID: ${complaint.assignedTo}<br>
                <small>Could not load details. ${error.message || 'Unknown error'}</small>
                <div class="mt-2 small text-muted">
                  <button class="btn btn-sm btn-outline-secondary" onclick="console.error('Employee fetch error:', ${JSON.stringify(error, Object.getOwnPropertyNames(error))})">
                    Show technical details
                  </button>
                </div>
              </div>`;
          }
        } 
        // If assignedTo is an object with employee data
        else if (typeof complaint.assignedTo === 'object' && complaint.assignedTo !== null) {
          const employee = complaint.assignedTo;
          assignmentDetails.innerHTML = `
            <div class="d-flex align-items-center mb-3">
              <div class="avatar-circle me-3">
                ${employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h6 class="mb-1">${employee.name || 'Unknown Employee'}</h6>
                <p class="text-muted small mb-0">${employee.employeeId || 'No ID'}</p>
              </div>
            </div>
            <div class="mb-2">
              <small class="text-muted d-block">Email</small>
              <div>${employee.email || '-'}</div>
            </div>
            <div class="mb-2">
              <small class="text-muted d-block">Phone</small>
              <div>${employee.phone || '-'}</div>
            </div>
            ${complaint.dueDate ? `
              <div class="alert alert-warning p-2 mt-3 mb-0">
                <i class="far fa-clock me-1"></i>
                Due on ${formatDate(complaint.dueDate)}
              </div>
            ` : ''}`;
        }
        // If assignedTo is just an ID (string), fetch employee details
        if (typeof complaint.assignedTo === 'string') {
          try {
            const empRes = await fetch(`/api/employees/${complaint.assignedTo}`, {
              headers: getAuthHeaders()
            });
          
          if (empRes.ok) {
            const employee = await empRes.json();
            assignmentDetails.innerHTML = `
              <div class="d-flex align-items-center mb-3">
                <div class="avatar-circle me-3">
                  ${employee.name ? employee.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h6 class="mb-1">${employee.name || 'Unknown Employee'}</h6>
                  <p class="text-muted small mb-0">${employee.employeeId || 'No ID'}</p>
                </div>
              </div>
              <div class="mb-2">
                <small class="text-muted d-block">Email</small>
                <div>${employee.email || '-'}</div>
              </div>
              <div class="mb-2">
                <small class="text-muted d-block">Phone</small>
                <div>${employee.phone || '-'}</div>
              </div>
              ${complaint.dueDate ? `
                <div class="alert alert-warning p-2 mt-3 mb-0">
                  <i class="far fa-clock me-1"></i>
                  Due on ${formatDate(complaint.dueDate)}
                </div>
              ` : ''}
            `;
          } else {
            throw new Error('Failed to fetch employee details');
          }
          } catch (error) {
            console.error('Error fetching employee:', error);
            assignmentDetails.innerHTML = `
              <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load employee details
              </div>
            `;
          }
        }
      } else {
        // No employee assigned
        assignmentDetails.innerHTML = `
          <div class="text-center py-4 text-muted">
            <i class="fas fa-user-clock fa-2x mb-3"></i>
            <p class="mb-0">Not assigned to any employee</p>
          </div>
        `;
      }
      
      // Load activity
      await loadComplaintActivity(complaintId);
      
      // Show the modal
      modal.show();
      
    } catch (error) {
      console.error('Error loading complaint details:', error);
      alert('Failed to load complaint details. Please try again.');
    }
  }
  
  async function loadComplaintActivity(complaintId) {
    const activityContainer = document.getElementById('complaintActivity');
    
    try {
      // Show loading state
      activityContainer.innerHTML = `
        <div class="list-group-item text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading activity...
        </div>`;

      // First, try to get the complaint with its status history
      const complaintRes = await fetch(`/api/complaints/${complaintId}`, {
        headers: getAuthHeaders()
      });
      
      if (!complaintRes.ok) {
        throw new Error(`Failed to fetch complaint: ${complaintRes.status}`);
      }
      
      const complaint = await complaintRes.json();
      let activities = [];
      
      // Create activity from status history if available
      if (complaint.statusHistory && Array.isArray(complaint.statusHistory)) {
        activities = complaint.statusHistory.map(entry => ({
          action: `Status changed to ${entry.status}`,
          timestamp: entry.timestamp || entry.changedAt || new Date().toISOString(),
          details: entry.notes || `Status updated to ${entry.status}`,
          user: entry.changedBy || 'System'
        }));
      }
      
      // Add current status if not already in history
      if (complaint.status) {
        const hasCurrentStatus = activities.some(a => 
          a.action.includes(complaint.status) || 
          a.details.includes(complaint.status)
        );
        
        if (!hasCurrentStatus) {
          activities.unshift({
            action: `Status: ${complaint.status}`,
            timestamp: complaint.updatedAt || new Date().toISOString(),
            details: `Current status is ${complaint.status}`,
            user: 'System'
          });
        }
      }
      
      // Format and display activities
      if (activities.length === 0) {
        activityContainer.innerHTML = `
          <div class="list-group-item text-center py-4 text-muted">
            <i class="far fa-comment-alt me-2"></i>
            No activity history available for this complaint
          </div>`;
      } else {
        activityContainer.innerHTML = activities
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map(activity => {
            const action = activity.action || 'Updated';
            const timestamp = activity.timestamp || new Date().toISOString();
            const details = activity.details || 'No details available';
            const user = activity.user || 'System';
            
            return `
              <div class="list-group-item">
                <div class="d-flex">
                  <div class="flex-shrink-0 me-3">
                    <div class="avatar-circle-sm bg-light text-primary">
                      <i class="fas ${getActivityIcon(action)}"></i>
                    </div>
                  </div>
                  <div class="flex-grow-1">
                    <div class="d-flex justify-content-between mb-1">
                      <span class="fw-medium">${action}</span>
                      <small class="text-muted">${formatDate(timestamp)}</small>
                    </div>
                    <div class="text-muted small">
                      ${details}
                    </div>
                    <div class="text-muted small mt-1">
                      <i class="fas fa-user-circle"></i>
                      ${typeof user === 'object' ? (user.name || 'System') : user}
                    </div>
                  </div>
                </div>
              </div>`;
          }).join('');
      }
      
    } catch (error) {
      console.error('Error loading activity:', error);
      
      // More specific error messages
      let errorMessage = 'Failed to load activity history';
      let errorDetail = '';
      
      if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error';
        errorDetail = 'Please check your internet connection and try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Session expired';
        errorDetail = 'Please refresh the page to continue.';
      } else {
        errorDetail = error.message || 'An unexpected error occurred.';
      }
      
      activityContainer.innerHTML = `
        <div class="list-group-item text-center py-4">
          <div class="text-danger mb-2">
            <i class="fas fa-exclamation-triangle fa-2x"></i>
          </div>
          <h6 class="mb-2">${errorMessage}</h6>
          <p class="small text-muted mb-3">${errorDetail}</p>
          <button class="btn btn-sm btn-outline-primary" onclick="loadComplaintActivity('${complaintId}')">
            <i class="fas fa-sync-alt me-1"></i> Try Again
          </button>
        </div>`;
    }
  }
  
  function getActivityIcon(action) {
    const iconMap = {
      'created': 'fa-plus-circle',
      'updated': 'fa-edit',
      'assigned': 'fa-user-tag',
      'status': 'fa-sync',
      'commented': 'fa-comment',
      'resolved': 'fa-check-circle',
      'reopened': 'fa-undo',
      'closed': 'fa-times-circle'
    };
    
    const actionKey = action ? action.toLowerCase().split(' ')[0] : '';
    return iconMap[actionKey] || 'fa-info-circle';
  }

  function renderComplaints(list) {
    const tbody = document.getElementById('complaintsTableBody');
    if (!tbody) return;
    
    // Filter out any complaints with empty or default titles
    const validComplaints = list.filter(cmp => 
      cmp.title && 
      cmp.title.trim() !== '' && 
      !cmp.title.toLowerCase().startsWith('complaint')
    );
    
    if (validComplaints.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="far fa-folder-open me-2"></i>
            No complaints found
          </td>
        </tr>`;
      return;
    }
    
    tbody.innerHTML = validComplaints.map((cmp, idx) => `
      <tr>
        <td class="ps-4">${(cmp._id || '').slice(-6).toUpperCase()}</td>
        <td>
          <div class="d-flex align-items-center">
            <div class="flex-shrink-0 me-2">
              <i class="fas fa-file-alt text-muted"></i>
            </div>
            <div class="text-truncate" style="max-width: 250px;" title="${cmp.title || ''}">
              ${cmp.title || 'Untitled Complaint'}
            </div>
          </div>
        </td>
        <td>${getStatusBadge(cmp.status)}</td>
        <td>${cmp.createdAt ? formatDate(cmp.createdAt) : '-'}</td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary view-complaint-btn" 
                  data-id="${cmp._id || ''}"
                  title="View Details">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      </tr>`).join('');
      
    // Add event listeners to view buttons
    document.querySelectorAll('.view-complaint-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const complaintId = e.currentTarget.dataset.id;
        if (complaintId) {
          showComplaintDetails(complaintId);
        }
      });
    });
  }

  async function init() {
    try {
      const [stats, complaints] = await Promise.all([fetchStats(), fetchComplaints()]);
      
      // Filter out any invalid complaints
      const validComplaints = complaints.filter(cmp => 
        cmp.title && 
        cmp.title.trim() !== '' && 
        !cmp.title.toLowerCase().startsWith('complaint')
      );
      
      // Update stats with the filtered count
      const filteredStats = {
        ...stats,
        total: validComplaints.length,
        // Recalculate other stats based on filtered complaints if needed
        pending: validComplaints.filter(c => c.status && c.status.toLowerCase() === 'pending').length,
        active: validComplaints.filter(c => c.status && c.status.toLowerCase().includes('progress')).length,
        resolved: validComplaints.filter(c => c.status && c.status.toLowerCase() === 'resolved').length
      };
      
      renderStats(filteredStats);
      renderComplaints(validComplaints);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to load dashboard data');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
            
