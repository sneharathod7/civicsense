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
          <td colspan="7" class="text-center py-4 text-muted">No complaints found</td>
        </tr>`;
      return;
    }
    
    tbody.innerHTML = validComplaints.map((cmp, idx) => `
      <tr>
        <td class="ps-4">${(cmp._id || '').slice(-6).toUpperCase()}</td>
        <td>${cmp.title || '-'}</td>
        <td>${cmp.category || '-'}</td>
        <td>${cmp.status || '-'}</td>
        <td>${cmp.createdAt ? new Date(cmp.createdAt).toLocaleDateString() : '-'}</td>
        <td>${cmp.assignedTo || '-'}</td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary" data-id="${cmp._id || ''}">View</button>
        </td>
      </tr>`).join('');
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
            
