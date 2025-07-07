/* Manage Reports page logic */
(function () {
  const API_COMPLAINTS = '/api/complaints';
  const tbody = document.getElementById('reportsTableBody');
  const statusSelect = document.getElementById('filter-status');
  const timeSelect = document.getElementById('filter-time');
  const deadlineSelect = document.getElementById('filter-deadline');
  const applyBtn = document.getElementById('btn-apply-filters');

  const modal = new bootstrap.Modal(document.getElementById('editReportModal'));
  const editForm = document.getElementById('edit-report-form');
  const editIdInput = document.getElementById('edit-report-id');
  const editStatus = document.getElementById('edit-status');
  const editAssigned = document.getElementById('edit-assigned');
  const editComment = document.getElementById('edit-comment');
  const editMsg = document.getElementById('edit-msg');

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function fetchReports() {
    const params = new URLSearchParams();
    if (statusSelect.value) params.append('status', statusSelect.value);
    // Time filter
    if (timeSelect.value) {
      const now = new Date();
      let startDate;
      switch (timeSelect.value) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
      if (startDate) params.append('startDate', startDate.toISOString());
    }
    // Deadline filter
    if (deadlineSelect.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineSelect.value === 'overdue') {
        params.append('deadlineBefore', today.toISOString());
      } else if (deadlineSelect.value === 'today') {
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        params.append('deadlineAfter', today.toISOString());
        params.append('deadlineBefore', tomorrow.toISOString());
      } else if (deadlineSelect.value === 'week') {
        const week = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        params.append('deadlineAfter', today.toISOString());
        params.append('deadlineBefore', week.toISOString());
      }
    }

    const res = await fetch(`${API_COMPLAINTS}?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch reports');
    const { data } = await res.json();
    return data;
  }

  function renderReports(list) {
    tbody.innerHTML = list
      .map(
        (r) => `
      <tr>
        <td class="ps-4">${r._id.slice(-6).toUpperCase()}</td>
        <td>${r.title || '-'}</td>
        <td>${r.category || '-'}</td>
        <td><span class="badge bg-light text-dark">${r.status}</span></td>
        <td>${r.assignedTo || '-'}</td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        <td class="text-end pe-4">
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${r._id}">Edit</button>
        </td>
      </tr>`
      )
      .join('');
  }

  // No category filter now

  async function load() {
    try {
      const reports = await fetchReports();
      renderReports(reports);
    } catch (e) {
      console.error(e);
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">${e.message}</td></tr>`;
    }
  }

  // Filter apply
  applyBtn?.addEventListener('click', load);

  // Table click (event delegation)
  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'edit') openEditModal(id);
  });

  async function openEditModal(id) {
    try {
      const res = await fetch(`${API_COMPLAINTS}?id=${id}`, { headers: getAuthHeaders() });
      const { data } = await res.json();
      const report = data[0];
      if (!report) throw new Error('Report not found');

      editIdInput.value = id;
      editStatus.value = report.status;
      editAssigned.value = report.assignedTo || '';
      editComment.value = '';
      editMsg.classList.add('d-none');
      modal.show();
    } catch (err) {
      alert(err.message);
    }
  }

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const payload = {
      status: editStatus.value,
      assignedTo: editAssigned.value || null,
      comment: editComment.value ? { text: editComment.value } : null,
    };
    try {
      const res = await fetch(`${API_COMPLAINTS}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update report');
      editMsg.classList.remove('d-none', 'alert-danger');
      editMsg.classList.add('alert-success');
      editMsg.textContent = 'Report updated successfully';
      await load();
      setTimeout(() => modal.hide(), 800);
    } catch (err) {
      editMsg.classList.remove('d-none', 'alert-success');
      editMsg.classList.add('alert-danger');
      editMsg.textContent = err.message;
    }
  });

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
