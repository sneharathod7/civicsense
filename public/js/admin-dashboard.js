document.addEventListener('DOMContentLoaded', async () => {
  const role = localStorage.getItem('role');
  if (role !== 'Admin') {
    window.location.href = '/login-signup.html';
    return;
  }

  await loadComplaints();

  document.getElementById('logoutLink').addEventListener('click', () => {
    localStorage.clear();
  });
});

async function loadComplaints() {
  try {
    const res = await fetch('/api/complaints');
    const data = await res.json();
    if (!data.success) {
      alert('Failed to load complaints.');
      return;
    }
    populateAdminTable(data.data);
  } catch (err) {
    console.error(err);
    alert('Server error while loading complaints.');
  }
}

function populateAdminTable(complaints) {
  const tbody = document.getElementById('adminComplaintsBody');
  tbody.innerHTML = '';
  complaints.forEach((cmp) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${cmp.ticketId}</td>
      <td>${cmp.issueType}</td>
      <td>${cmp.department}</td>
      <td>
        <select class="form-select form-select-sm status-select" data-id="${cmp.id}">
          <option value="Pending" ${cmp.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${cmp.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${cmp.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
      </td>
      <td>${new Date(cmp.createdAt).toLocaleString()}</td>
      <td><button class="btn btn-sm btn-primary update-btn" data-id="${cmp.id}">Update</button></td>
    `;
    tbody.appendChild(tr);
  });

  // Attach listeners
  document.querySelectorAll('.update-btn').forEach((btn) => {
    btn.addEventListener('click', handleStatusUpdate);
  });
}

async function handleStatusUpdate(e) {
  const id = e.target.getAttribute('data-id');
  const select = document.querySelector(`select.status-select[data-id="${id}"]`);
  const status = select.value;
  try {
    const res = await fetch(`/api/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!data.success) {
      alert('Failed to update.');
      return;
    }
    alert('Status updated!');
  } catch (err) {
    console.error(err);
    alert('Server error.');
  }
}
