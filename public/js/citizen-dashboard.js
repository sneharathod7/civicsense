document.addEventListener('DOMContentLoaded', async () => {
  // Debug: Show user info from localStorage
  console.log('User in localStorage:', localStorage.getItem('user'));

  const userId = localStorage.getItem('userId');
  if (!userId) {
    // Not logged in – redirect to login
    window.location.href = '/citizen-login.html';
    return;
  }

  const firstName = localStorage.getItem('firstName') || 'Citizen';
  document.getElementById('greeting').innerText = `🎉 Welcome back, ${firstName}! 👋`;

  // Fetch complaints for this user
  try {
    const res = await fetch(`/api/reports?userId=${userId}`);
    const data = await res.json();
    if (!data.success) {
      alert('Failed to load complaints.');
      return;
    }
    const complaints = data.data;
    populateStats(complaints);
    populateRecent(complaints);
    populateCommunity(complaints);

    // Update welcome banner lines
    document.getElementById('achievementHighlight').innerText =
      `🌟 You've made ${complaints.length} reports this month – You're a Civic Champion! 🏆`;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    document.getElementById('impactSummary').innerText =
      `📊 Your impact: ${resolved} issues resolved, helping ${resolved * 10}+ citizens`;
  } catch (err) {
    console.error(err);
    alert('Server error fetching complaints.');
  }


});

function populateStats(complaints) {
  const total = complaints.length;
  const newCount = complaints.filter(c => ['New', 'Pending'].includes(c.status)).length;
  const progress = complaints.filter(c => ['In Progress', 'Progress'].includes(c.status)).length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  const ratingAvg = total ? (complaints.reduce((s, c) => s + (c.rating || 0), 0) / total).toFixed(1) : '0';
  const points = resolved * 10;

  document.getElementById('statReported').innerText = total;
  document.getElementById('statNew').innerText = newCount;
  document.getElementById('statProgress').innerText = progress;
  document.getElementById('statResolved').innerText = resolved;
  document.getElementById('statRate').innerText = `${resolutionRate}%`;
  document.getElementById('statRating').innerText = ratingAvg;
  document.getElementById('statPoints').innerText = points;
}

function populateRecent(complaints){
  const list=document.getElementById('recentList');
  if(!list) return;
  list.innerHTML='';
  const sorted=[...complaints].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).slice(0,5);
  if(!sorted.length){list.innerHTML='<li class="list-group-item text-muted">No recent activity</li>';return;}
  sorted.forEach(c=>{
    const li=document.createElement('li');
    li.className='list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML=`<span><strong>#${c.ticketId||c.id}</strong> - ${c.issueType}</span> <span class="badge ${c.status==='Resolved'?'bg-success':c.status==='In Progress'?'bg-warning text-dark':'bg-secondary'}">${c.status}</span>`;
    list.appendChild(li);
  });
}

function populateCommunity(complaints){
  const el=document.getElementById('communityImpact');
  if(!el) return;
  const resolved=complaints.filter(c=>c.status==='Resolved').length;
  const total=complaints.length;
  const resolutionRate= total? Math.round((resolved/total)*100):0;
  el.querySelector('p').innerText=`🌟 You've resolved ${resolved} of ${total} reported issues (Resolution Rate: ${resolutionRate}%)`;
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


