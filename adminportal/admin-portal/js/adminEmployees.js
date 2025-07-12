// Admin Employees Page - JavaScript
// Handles listing, searching, adding and deleting employees for the current department

(function(){
  /* -------------------------------------------------------------
   *  Helpers
   * -----------------------------------------------------------*/
  function authHeaders(){
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  function showToast(type,msg){
    const wrapper = document.createElement('div');
    wrapper.className=`toast align-items-center text-white bg-${type==='error'?'danger':'success'} border-0`;
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

  function showLoading(show){
    let el = document.getElementById('loading');
    if(!el && show){
      el=document.createElement('div');
      el.id='loading';
      el.className='position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75';
      el.style.zIndex='2000';
      el.innerHTML='<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
      document.body.appendChild(el);
    } else if(el){ el.style.display = show ? 'flex':'none'; if(!show){ setTimeout(()=>el.remove(),300);} }
  }

  /* -------------------------------------------------------------
   *  DOM refs
   * -----------------------------------------------------------*/
  const employeesTable = document.getElementById('employeesTable');
  const searchInput    = document.getElementById('searchEmployees');
  const addBtn         = document.getElementById('addEmployeeBtn');
  const addModalEl     = document.getElementById('addEmployeeModal');
  const addForm        = document.getElementById('addEmployeeForm');
  const addModal       = new bootstrap.Modal(addModalEl);
  
  // Employee details modal
  const detailsModal = new bootstrap.Modal(document.getElementById('employeeDetailsModal'));
  let currentEmployeeId = null;

  let employees = [];

  /* -------------------------------------------------------------
   *  Load
   * -----------------------------------------------------------*/
  async function loadEmployees(){
    showLoading(true);
    try {
      const res = await fetch(`/api/employees?limit=1000&_=${Date.now()}`, { 
        headers: authHeaders(),
        credentials: 'include' // Include cookies for session handling
      });
      
      if (res.status === 401) {
        // Not authenticated, redirect to login
        window.location.href = 'index.html';
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      employees = Array.isArray(data.data) ? data.data : data;
      renderEmployees();
    } catch(err) {
      console.error('Error loading employees:', err);
      showToast('error', 'Failed to load employees. Please try again.');
      employeesTable.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            <i class="fas fa-exclamation-circle me-2"></i>Failed to load employees. ${err.message}
          </td>
        </tr>`;
    } finally { 
      showLoading(false); 
    }
  }

  /* -------------------------------------------------------------
   *  Render
   * -----------------------------------------------------------*/
  function renderEmployees(){
    const query = (searchInput.value||'').trim().toLowerCase();
    const list = employees.filter(e => {
      if(!query) return true;
      return [e.name,e.employeeId,e.email].some(v => (v||'').toLowerCase().includes(query));
    });

    if(list.length===0){
      employeesTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No employees found</td></tr>`;
      return;
    }

    employeesTable.innerHTML = list.map(emp => `
      <tr>
        <td>${emp.name}</td>
        <td>${emp.employeeId}</td>
        <td>${emp.email||'-'}</td>
        <td>${emp.phone||'-'}</td>
        <td><span class="badge ${emp.status==='assigned'?'bg-info bg-opacity-10 text-info':'bg-secondary bg-opacity-10 text-secondary'}">${emp.status||'N/A'}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary view-emp-btn me-1" data-id="${emp._id}" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-emp-btn" data-id="${emp._id}" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  }

  /* -------------------------------------------------------------
   *  Employee Details
   * -----------------------------------------------------------*/
  async function showEmployeeDetails(employeeId) {
    try {
      showLoading(true);
      currentEmployeeId = employeeId;
      
      // Fetch employee details
      const [empRes, statsRes, activityRes, reportsRes] = await Promise.all([
        fetch(`/api/employees/${employeeId}`, { 
          headers: authHeaders(),
          credentials: 'include'
        }),
        fetch(`/api/employees/${employeeId}/stats`, {
          headers: authHeaders(),
          credentials: 'include'
        }),
        fetch(`/api/employees/${employeeId}/activity?limit=5`, {
          headers: authHeaders(),
          credentials: 'include'
        }),
        fetch(`/api/employees/${employeeId}/reports?limit=5`, {
          headers: authHeaders(),
          credentials: 'include'
        })
      ]);
      
      if (!empRes.ok) throw new Error('Failed to load employee details');
      
      const employee = await empRes.json();
      const stats = statsRes.ok ? await statsRes.json() : {};
      const activity = activityRes.ok ? await activityRes.json() : [];
      const reports = reportsRes.ok ? await reportsRes.json() : [];
      
      // Update modal with employee details
      document.getElementById('employeeName').textContent = employee.name;
      document.getElementById('employeeId').textContent = `ID: ${employee.employeeId}`;
      document.getElementById('employeeEmail').textContent = employee.email || '-';
      document.getElementById('employeePhone').textContent = employee.phone || '-';
      document.getElementById('employeeDept').textContent = employee.department || '-';
      
      const statusBadge = document.getElementById('employeeStatus');
      statusBadge.className = `badge ${employee.status === 'assigned' ? 'bg-info' : 'bg-secondary'}`;
      statusBadge.textContent = employee.status || 'N/A';
      
      // Update stats
      if (stats) {
        document.getElementById('totalReports').textContent = stats.totalReports || 0;
        document.getElementById('completedReports').textContent = stats.completedReports || 0;
        document.getElementById('inProgress').textContent = stats.inProgress || 0;
        document.getElementById('avgResolution').textContent = 
          stats.avgResolutionTime ? `${stats.avgResolutionTime} days` : '-';
      }
      
      // Update activity
      const activityList = document.getElementById('employeeActivity');
      if (activityList) {
        if (activity.length > 0) {
          activityList.innerHTML = activity.map(act => `
          <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-medium">${act.action}</div>
                <small class="text-muted">${act.details}</small>
              </div>
              <small class="text-muted">${new Date(act.timestamp).toLocaleString()}</small>
            </div>
          </div>
        `).join('');
      } else {
          activityList.innerHTML = `
            <div class="list-group-item text-center py-4 text-muted">
              No recent activity found
            </div>`;
        }
      }
      
      // Update assigned reports
      const reportsList = document.getElementById('assignedReports');
      if (reports.length > 0) {
        reportsList.innerHTML = reports.map(report => `
          <a href="admin-reports.html?reportId=${report._id}" class="list-group-item list-group-item-action">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-medium">${report.title || 'Untitled Report'}</div>
                <small class="text-muted">${report.category || 'No category'}</small>
              </div>
              <span class="badge ${report.status === 'resolved' ? 'bg-success' : 'bg-warning'}">
                ${report.status || 'pending'}
              </span>
            </div>
          </a>
        `).join('');
      } else {
        reportsList.innerHTML = `
          <div class="list-group-item text-center py-4 text-muted">
            No reports assigned
          </div>`;
      }
      
      // Show the modal
      detailsModal.show();
      
    } catch (error) {
      console.error('Error loading employee details:', error);
      showToast('error', 'Failed to load employee details');
    } finally {
      showLoading(false);
    }
  }

  async function deleteEmployee(employeeId) {
    try {
      showLoading(true);
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to delete employee');
      
      // Remove from local list and re-render
      employees = employees.filter(e => e._id !== employeeId);
      renderEmployees();
      showToast('success', 'Employee deleted successfully');
      
      // Close details modal if open for this employee
      if (currentEmployeeId === employeeId) {
        detailsModal.hide();
      }
      
    } catch (error) {
      console.error('Error deleting employee:', error);
      showToast('error', 'Failed to delete employee');
    } finally {
      showLoading(false);
    }
  }

  /* -------------------------------------------------------------
   *  Add Employee
   * -----------------------------------------------------------*/
  addBtn.addEventListener('click',()=>{
    addForm.reset();
    addModal.show();
  });

  addForm.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(addForm).entries());
    showLoading(true);
    try{
      const res = await fetch('/api/employees', {
        method:'POST',
        headers: authHeaders(),
        body: JSON.stringify(formData)
      });
      if(!res.ok){
        const err = await res.json().catch(()=>({error:'Failed'}));
        throw new Error(err.error||'Creation failed');
      }
      showToast('success','Employee added');
      addModal.hide();
      await loadEmployees();
    }catch(err){
      console.error(err);
      showToast('error',err.message||'Failed to add');
    }finally{ showLoading(false);}    
  });

  /* -------------------------------------------------------------
   *  Event Listeners
   * -----------------------------------------------------------*/
  document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    
    // Handle view details button clicks
    document.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.view-emp-btn');
      if (viewBtn) {
        e.preventDefault();
        const employeeId = viewBtn.dataset.id;
        showEmployeeDetails(employeeId);
      }
      
      // Handle delete button clicks
      const deleteBtn = e.target.closest('.delete-emp-btn');
      if (deleteBtn) {
        e.preventDefault();
        const employeeId = deleteBtn.dataset.id;
        if (confirm('Are you sure you want to delete this employee?')) {
          deleteEmployee(employeeId);
        }
      }
      
      // Handle view all reports link
      if (e.target.id === 'viewAllReports') {
        e.preventDefault();
        window.location.href = `admin-reports.html?employee=${currentEmployeeId}`;
      }
    });
  });

  searchInput.addEventListener('input', ()=> {
    clearTimeout(searchInput._t);
    searchInput._t = setTimeout(renderEmployees, 300);
  });

  // init
  loadEmployees();
})();
