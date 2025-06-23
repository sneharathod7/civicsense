document.addEventListener('DOMContentLoaded', async () => {
  // Debug: Show user info from localStorage
  console.log('User in localStorage:', localStorage.getItem('user'));

  const userId = localStorage.getItem('userId');
  if (!userId) {
    // Not logged in – redirect to login
    window.location.href = '/citizen-login.html';
    return;
  }

  const firstName = localStorage.getItem('firstName') || '';
  if (firstName) {
    document.getElementById('greeting').innerText = `Welcome back, ${firstName}!`;
  }

  // Fetch complaints for this user
  try {
    const res = await fetch(`/api/complaints?userId=${userId}`);
    const data = await res.json();
    if (!data.success) {
      alert('Failed to load complaints.');
      return;
    }
    const complaints = data.data;
    populateStats(complaints);
    populateTable(complaints);
  } catch (err) {
    console.error(err);
    alert('Server error fetching complaints.');
  }

  document.getElementById('logoutLink').addEventListener('click', () => {
    localStorage.clear();
  });
});

function populateStats(complaints) {
  const total = complaints.length;
  const pending = complaints.filter(c => ['New', 'Pending'].includes(c.status)).length;
  const progress = complaints.filter(c => ['In Progress', 'Progress'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  document.getElementById('statTotal').innerText = total;
  document.getElementById('statPending').innerText = pending;
  document.getElementById('statProgress').innerText = progress;
  document.getElementById('statResolved').innerText = resolved;
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
